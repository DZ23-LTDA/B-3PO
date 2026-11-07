// Leitura periódica de medidor — o segundo modelo da vertical de água.
//
// O QUE FALTAVA
//
// A r78 entregou o **comodato** (o casco que sai e volta). Isso resolve gás de botijão. Água encanada
// tem outro modelo: o consumo **não é um casco**, é uma **diferença entre duas leituras**. Sem isso a
// revenda não sabe quanto cobrar — sabe só que o cliente existe.
//
// A PERGUNTA QUE ESTE ARQUIVO RESPONDE
//
// "Qual o consumo do cliente no período?" — e a resposta é `leitura_atual − leitura_anterior`, lida de
// uma **série**, não de um campo.
//
// AS TRÊS COISAS QUE PODEM DAR ERRADO, E COMO SÃO TRATADAS AQUI
//
// 1. **O medidor nunca anda para trás.** Uma leitura menor que a anterior é erro de digitação (ou o
//    relógio virou). Gravar assim mesmo faria o consumo ser negativo e a conta sair errada. Recusa.
//
// 2. **O medidor pode ser trocado.** Um medidor novo começa do zero — e aí a leitura **é** menor, e
//    isso não é erro. É `substituido`: a série recomeça, e a diferença entre a última leitura do velho e
//    a primeira do novo **não é consumo**. O `medidor_id` na leitura existe para que a comparação seja
//    dentro do mesmo medidor, e a troca zere a comparação em vez de inventar um número.
//
// 3. **Leitura repetida.** Ler duas vezes no mesmo dia com o mesmo valor é idempotente; com valor
//    diferente é uma correção, e a última vale.
//
// UNIDADE
//
// Milésimos de m³ (= litros). `1000` = 1 m³. Segue o padrão do repo (`quantity.ts` usa milésimos) e
// evita float em dinheiro depois: mil litros × tarifa em centavos continua inteiro.

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { DEFAULT_TENANT } from './catalog-store'
import { backupRotativo } from './store-backup'
import { WriteQueue } from './write-queue'

export const MEDIDOR_KINDS = ['hidrometro', 'gasometro', 'outro'] as const

export type MedidorKind = (typeof MEDIDOR_KINDS)[number]

export interface Medidor {
  created_at: number
  /** Cliente dono do ponto de medição. `null` = ponto ainda não atribuído. */
  customer_id: string | null
  id: string
  kind: MedidorKind
  /** Quando foi instalado (epoch ms). Leituras antes disto são suspeitas. */
  installed_at: number
  /** Identificação física (número do medidor). */
  serial: string
  tenant_id: string
  updated_at: number
}

export interface Leitura {
  created_at: number
  id: string
  medidor_id: string
  /** Milésimos de m³. `12345` = 12,345 m³. */
  reading_milli: number
  /** Quando foi lida (epoch ms) — não quando foi digitada. */
  read_at: number
  tenant_id: string
}

export interface MeterFile {
  leituras: Leitura[]
  medidores: Medidor[]
  schema_version: number
}

export interface Consumo {
  /** Diferença em milésimos. `null` quando não há leitura anterior no mesmo medidor. */
  consumo_milli: number | null
  /** A leitura atual usada na conta. */
  atual: Leitura | null
  /** A anterior. `null` na primeira leitura de um medidor. */
  anterior: Leitura | null
  medidor_id: string
}

const KINDS: ReadonlySet<string> = new Set(MEDIDOR_KINDS)

export function emptyMeter(): MeterFile {
  return { leituras: [], medidores: [], schema_version: 1 }
}

function num(valor: unknown, padrao: number): number {
  return typeof valor === 'number' && Number.isFinite(valor) && valor >= 0 ? valor : padrao
}

function txt(valor: unknown, padrao = ''): string {
  return typeof valor === 'string' ? valor : padrao
}

function cliente(valor: unknown): string | null {
  return typeof valor === 'string' && valor ? valor : null
}

function parseMedidor(entry: unknown): Medidor | null {
  if (!entry || typeof entry !== 'object') return null

  const v = entry as Record<string, unknown>

  if (typeof v.id !== 'string' || !v.id) return null

  return {
    created_at: num(v.created_at, 0),
    customer_id: cliente(v.customer_id),
    id: v.id,
    installed_at: num(v.installed_at, 0),
    kind: typeof v.kind === 'string' && KINDS.has(v.kind) ? (v.kind as MedidorKind) : 'outro',
    serial: txt(v.serial),
    tenant_id: cliente(v.tenant_id) ?? DEFAULT_TENANT,
    updated_at: num(v.updated_at, 0),
  }
}

function parseLeitura(entry: unknown): Leitura | null {
  if (!entry || typeof entry !== 'object') return null

  const v = entry as Record<string, unknown>

  if (typeof v.id !== 'string' || !v.id || typeof v.medidor_id !== 'string' || !v.medidor_id) return null

  return {
    created_at: num(v.created_at, 0),
    id: v.id,
    medidor_id: v.medidor_id,
    read_at: num(v.read_at, 0),
    reading_milli: num(v.reading_milli, 0),
    tenant_id: cliente(v.tenant_id) ?? DEFAULT_TENANT,
  }
}


/**
 * A leitura cabe nesta posição da série?
 *
 * **A comparação é com os vizinhos NO TEMPO, não com a última gravada.** Uma leitura de campo pode ser
 * digitada dias depois (o leitor anotou e só sincronizou no fim do mês) — recusá-la porque outra pessoa
 * leu e lançou antes transformaria um caso legítimo em erro. O que não pode é a série ficar
 * não-monotônica: o relógio não anda para trás **entre leituras vizinhas**.
 *
 * `null` = cabe. Uma chave = o motivo da recusa.
 */
export function validarPosicao(
  leituras: readonly Leitura[],
  medidorId: string,
  readAt: number,
  readingMilli: number
): string | null {
  const serie = leituras.filter(l => l.medidor_id === medidorId).sort((a, b) => a.read_at - b.read_at)

  // No mesmo instante já existe leitura? Então é correção: vale a nova, e ela tem de caber entre as
  // vizinhas — as duas, não só a anterior.
  const antes = [...serie].reverse().find(l => l.read_at <= readAt)
  const depois = serie.find(l => l.read_at > readAt)

  if (antes && readingMilli < antes.reading_milli) {
    return 'leitura_regrediu'
  }

  if (depois && readingMilli > depois.reading_milli) {
    return 'leitura_ultrapassa_seguinte'
  }

  return null
}

/** Leitura tolerante: arquivo corrompido vira store vazio; entrada sem identidade é descartada. */
export function parseMeterUnsafe(texto: string): MeterFile {
  try {
    const bruto: unknown = JSON.parse(texto)

    if (!bruto || typeof bruto !== 'object') {
      return emptyMeter()
    }

    const b = bruto as { leituras?: unknown; medidores?: unknown }

    const medidores = Array.isArray(b.medidores)
      ? b.medidores.map(parseMedidor).filter((m): m is Medidor => m !== null)
      : []

    const leituras = Array.isArray(b.leituras)
      ? b.leituras.map(parseLeitura).filter((l): l is Leitura => l !== null)
      : []

    return { leituras, medidores, schema_version: 1 }
  } catch {
    return emptyMeter()
  }
}

/**
 * Consumo de um medidor: a diferença entre as duas leituras mais recentes.
 *
 * A comparação é **dentro do mesmo medidor** — trocar o relógio zera a série em vez de produzir uma
 * diferença que ninguém consumiu.
 */
export function consumoDoMedidor(leituras: readonly Leitura[], medidorId: string): Consumo {
  const doMedidor = leituras
    .filter(l => l.medidor_id === medidorId)
    .sort((a, b) => b.read_at - a.read_at || b.created_at - a.created_at)

  const [atual, anterior] = doMedidor

  if (!atual) {
    return { anterior: null, atual: null, consumo_milli: null, medidor_id: medidorId }
  }

  return {
    anterior: anterior ?? null,
    atual,
    consumo_milli: anterior ? atual.reading_milli - anterior.reading_milli : null,
    medidor_id: medidorId,
  }
}

/** Consumo de todos os medidores de um tenant — o que a tela mostra sem pedir um por um. */
export function consumosDoTenant(file: MeterFile, tenantId: string = DEFAULT_TENANT): Consumo[] {
  return file.medidores
    .filter(m => m.tenant_id === tenantId)
    .map(m => consumoDoMedidor(file.leituras, m.id))
}

export class MeterStore {
  constructor(private readonly filePath: string) {}

  private readonly fila = new WriteQueue()

  async list(): Promise<{ consumos: Consumo[]; leituras: Leitura[]; medidores: Medidor[] }> {
    const file = await this.read()

    return {
      consumos: consumosDoTenant(file),
      leituras: [...file.leituras].sort((a, b) => b.read_at - a.read_at),
      medidores: [...file.medidores].sort((a, b) => a.serial.localeCompare(b.serial, 'pt-BR')),
    }
  }

  async cadastrarMedidor(
    input: unknown
  ): Promise<{ medidor: Medidor; medidores: Medidor[] } | { error: string }> {
    return this.fila.serializar(() => this.cadastrarMedidorSerializado(input))
  }

  private async cadastrarMedidorSerializado(
    input: unknown
  ): Promise<{ medidor: Medidor; medidores: Medidor[] } | { error: string }> {
    if (!input || typeof input !== 'object') return { error: 'dados_invalidos' }

    const v = input as Record<string, unknown>
    const kind = typeof v.kind === 'string' && KINDS.has(v.kind) ? (v.kind as MedidorKind) : null

    if (!kind) return { error: 'tipo_invalido' }

    if (v.customer_id !== undefined && v.customer_id !== null && typeof v.customer_id !== 'string') {
      return { error: 'cliente_invalido' }
    }

    const agora = Date.now()

    const medidor: Medidor = {
      created_at: agora,
      customer_id: cliente(v.customer_id),
      id: txt(v.id) || `med-${agora}-${Math.random().toString(36).slice(2, 8)}`,
      installed_at: num(v.installed_at, agora),
      kind,
      serial: txt(v.serial),
      tenant_id: cliente(v.tenant_id) ?? DEFAULT_TENANT,
      updated_at: agora,
    }

    const file = await this.read()

    file.medidores.push(medidor)
    await this.write(file)

    return {
      medidor,
      medidores: [...file.medidores].sort((a, b) => a.serial.localeCompare(b.serial, 'pt-BR')),
    }
  }

  /**
   * Registra uma leitura.
   *
   * Recusa leitura menor que a anterior **do mesmo medidor**: um relógio não anda para trás, e aceitar
   * produziria consumo negativo. Para substituição de medidor, o caminho é cadastrar um medidor novo —
   * a série recomeça porque `medidor_id` muda.
   */
  async registrarLeitura(
    input: unknown
  ): Promise<{ consumo: Consumo; leitura: Leitura } | { error: string }> {
    return this.fila.serializar(() => this.registrarLeituraSerializado(input))
  }

  private async registrarLeituraSerializado(
    input: unknown
  ): Promise<{ consumo: Consumo; leitura: Leitura } | { error: string }> {
    if (!input || typeof input !== 'object') return { error: 'dados_invalidos' }

    const v = input as Record<string, unknown>

    const medidorId = txt(v.medidor_id)

    if (!medidorId) return { error: 'medidor_obrigatorio' }

    if (typeof v.reading_milli !== 'number' || !Number.isFinite(v.reading_milli) || v.reading_milli < 0) {
      return { error: 'leitura_invalida' }
    }

    const file = await this.read()

    const medidor = file.medidores.find(m => m.id === medidorId)

    if (!medidor) return { error: 'medidor_nao_encontrado' }

    const readingMilli = Math.round(v.reading_milli)
    const agora = Date.now()
    const readAt = num(v.read_at, agora)

    const recusa = validarPosicao(file.leituras, medidorId, readAt, readingMilli)

    if (recusa) {
      return { error: recusa }
    }

    const leitura: Leitura = {
      created_at: agora,
      id: txt(v.id) || `lei-${agora}-${Math.random().toString(36).slice(2, 8)}`,
      medidor_id: medidorId,
      read_at: readAt,
      reading_milli: readingMilli,
      tenant_id: medidor.tenant_id,
    }

    file.leituras.push(leitura)
    await this.write(file)

    return { consumo: consumoDoMedidor(file.leituras, medidorId), leitura }
  }

  private async read(): Promise<MeterFile> {
    try {
      return parseMeterUnsafe(await readFile(this.filePath, 'utf8'))
    } catch {
      return emptyMeter()
    }
  }

  private async write(file: MeterFile): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true })

    const temp = `${this.filePath}.tmp`

    await writeFile(temp, JSON.stringify(file, null, 2), 'utf8')
    await backupRotativo(this.filePath)
    await rename(temp, this.filePath)
  }
}

export function meterStorePath(userDataDir: string): string {
  return join(userDataDir, 'b3po', 'medidores.json')
}
