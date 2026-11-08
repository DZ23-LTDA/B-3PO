// Vasilhame em comodato — o modelo que faltava para uma revenda de gás/água.
//
// O QUE FALTAVA, MEDIDO NA r13
//
// O B-3PO cobria CRM, Compras, Estoque, Vendas, Financeiro, Serviços, RH e Marketing. A vertical de
// gás/água **cabia em tudo isso menos no essencial**: o botijão que sai para o cliente **continua sendo
// um ativo da revenda**. O estoque conta "quantos tem", e depois da venda ele conta um a menos — mas o
// vasilhame **não desapareceu**: ele está na casa do cliente e **precisa voltar**.
//
// Sem isso, três coisas são impossíveis:
//
//   1. saber **quantos vasilhames a revenda tem** (em estoque + em comodato + perdidos);
//   2. cobrar a **recarga** sabendo que é troca, não venda de um botijão novo;
//   3. fechar a conta quando o cliente **devolve** ou quando o vasilhame **some**.
//
// O QUE ESTE ARQUIVO NÃO FAZ
//
// Não mexe no estoque. `inventory` conta produto; `gas` conta **o recipiente**. Um botijão cheio é
// produto em estoque **e** um vasilhame com status `estoque` — as duas contagens existem lado a lado
// porque respondem perguntas diferentes: "quantos kg tenho para vender" e "quantos cascos são meus".
//
// Não decide caução. `deposit_cents` é um campo; **quando** cobrar e **quanto** é política da revenda.
//
// Regras que protegem o dado:
//
//   - um vasilhame tem **um** dono da posse (`customer_id`) ou nenhum — nunca dois;
//   - `comodato` exige `customer_id`; `estoque` exige `customer_id` nulo;
//   - devolver um vasilhame que já voltou é idempotente, não erro;
//   - devolver um vasilhame que está em estoque é erro (`nao_esta_em_comodato`).

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { DEFAULT_TENANT } from './catalog-store'
import { backupRotativo } from './store-backup'
import { WriteQueue } from './write-queue'

/** Tipos de vasilhame que uma revenda de gás/água movimenta. */
export const VASILHAME_KINDS = ['botijao_p13', 'botijao_13', 'botijao_45', 'galao_20', 'outro'] as const

export type VasilhameKind = (typeof VASILHAME_KINDS)[number]

/**
 * Onde o vasilhame está.
 *
 * - `estoque`: na revenda, disponível.
 * - `comodato`: com o cliente, carregando o produto.
 * - `perdido`: baixa — o cliente não devolveu (virou perda ou cobrança de caução).
 */
export const VASILHAME_STATUSES = ['estoque', 'comodato', 'perdido'] as const

export type VasilhameStatus = (typeof VASILHAME_STATUSES)[number]

export interface Vasilhame {
  /** Cliente que está com o vasilhame. `null` quando está na revenda. */
  customer_id: string | null

  created_at: number
  /** Caução cobrada na entrega. `0` quando a revenda não cobra. */
  deposit_cents: number

  /** Quando saiu para o cliente (epoch ms). `0` se nunca saiu. */
  delivered_at: number
  id: string
  kind: VasilhameKind

  /** Por que foi perdido, quando `status === 'perdido'`. */
  lost_reason: string
  /** Quando voltou ao estoque. `null` se nunca voltou. */
  returned_at: number | null
  /** Número de série/fabricação, quando a revenda controla por unidade. Vazio = controle por tipo. */
  serial: string
  status: VasilhameStatus
  tenant_id: string
  updated_at: number
}

export interface GasFile {
  schema_version: number
  vasilhames: Vasilhame[]
}

export interface GasSaldo {
  /** Quantos estão na revenda. */
  em_estoque: number
  /** Quantos estão com clientes. */
  em_comodato: number
  /** Quantos foram baixados como perdidos. */
  perdidos: number
  /** Por tipo — a revenda precisa saber que tem 40 de 13 kg e 6 de 45 kg. */
  por_tipo: Record<string, number>
}


/** Número válido ou o padrão — `NaN`/negativo/ausente não viram dado. */
function num(valor: unknown, padrao: number): number {
  return typeof valor === 'number' && Number.isFinite(valor) && valor >= 0 ? valor : padrao
}

/** Texto válido ou o padrão. */
function txt(valor: unknown, padrao = ''): string {
  return typeof valor === 'string' ? valor : padrao
}

/** Id de cliente: string não vazia, senão `null` (a diferença entre "ninguém" e "vazio"). */
function cliente(valor: unknown): string | null {
  return typeof valor === 'string' && valor ? valor : null
}

// A regra que protege o saldo: o status nasce de quem está com a peça, não o contrário.
const KINDS: ReadonlySet<string> = new Set(VASILHAME_KINDS)
const STATUSES: ReadonlySet<string> = new Set(VASILHAME_STATUSES)

export function emptyGas(): GasFile {
  return { schema_version: 1, vasilhames: [] }
}

/**
 * Uma entrada vinda do disco, normalizada.
 *
 * `null` quando não há id: uma linha sem identidade não é um vasilhame, é lixo de escrita parcial — e
 * mantê-la faria o mesmo casco aparecer duas vezes.
 */
function salvo(entry: unknown): Vasilhame | null {
  if (!entry || typeof entry !== 'object') {
    return null
  }

  const v = entry as Record<string, unknown>

  if (typeof v.id !== 'string' || !v.id) {
    return null
  }

  return {
    created_at: num(v.created_at, 0),
    customer_id: cliente(v.customer_id),
    deposit_cents: Math.round(num(v.deposit_cents, 0)),
    delivered_at: num(v.delivered_at, 0),
    id: v.id,
    kind: typeof v.kind === 'string' && KINDS.has(v.kind) ? (v.kind as VasilhameKind) : 'outro',
    lost_reason: txt(v.lost_reason),
    returned_at: typeof v.returned_at === 'number' ? v.returned_at : null,
    serial: txt(v.serial),
    status: typeof v.status === 'string' && STATUSES.has(v.status) ? (v.status as VasilhameStatus) : 'estoque',
    tenant_id: cliente(v.tenant_id) ?? DEFAULT_TENANT,
    updated_at: num(v.updated_at, 0),
  }
}

/** Leitura tolerante: um arquivo corrompido vira store vazio, nunca derruba o app. */
export function parseGasUnsafe(texto: string): GasFile {
  try {
    const bruto: unknown = JSON.parse(texto)

    if (!bruto || typeof bruto !== 'object') {
      return emptyGas()
    }

    const vasilhames = (bruto as { vasilhames?: unknown }).vasilhames

    if (!Array.isArray(vasilhames)) {
      return emptyGas()
    }

    return { schema_version: 1, vasilhames: vasilhames.map(salvo).filter((v): v is Vasilhame => v !== null) }
  } catch {
    return emptyGas()
  }
}

/**
 * Saldo por status e por tipo.
 *
 * `por_tipo` conta **só o que está em estoque ou em comodato** — um vasilhame perdido não é estoque nem
 * expectativa de retorno, então contá-lo no tipo inflaria o número que a revenda usa para comprar mais.
 */
export function gasSaldo(vasilhames: readonly Vasilhame[], tenantId: string = DEFAULT_TENANT): GasSaldo {
  const meus = vasilhames.filter(v => v.tenant_id === tenantId)

  const por_tipo: Record<string, number> = {}

  for (const v of meus) {
    if (v.status === 'perdido') {
      continue
    }

    por_tipo[v.kind] = (por_tipo[v.kind] ?? 0) + 1
  }

  return {
    em_comodato: meus.filter(v => v.status === 'comodato').length,
    em_estoque: meus.filter(v => v.status === 'estoque').length,
    perdidos: meus.filter(v => v.status === 'perdido').length,
    por_tipo,
  }
}

/** O que um cliente está segurando — a pergunta que fecha a conta de comodato. */
export function vasilhamesDoCliente(
  vasilhames: readonly Vasilhame[],
  customerId: string,
  tenantId: string = DEFAULT_TENANT
): Vasilhame[] {
  return vasilhames.filter(v => v.tenant_id === tenantId && v.customer_id === customerId && v.status === 'comodato')
}

interface Normalizado {
  vasilhame: Vasilhame
}

function normalizarEntrada(input: unknown, agora: number): Normalizado | { error: string } {
  if (!input || typeof input !== 'object') {
    return { error: 'dados_invalidos' }
  }

  const v = input as Record<string, unknown>

  const kind = typeof v.kind === 'string' && KINDS.has(v.kind) ? (v.kind as VasilhameKind) : null

  if (!kind) {
    return { error: 'tipo_invalido' }
  }

  if (v.customer_id !== undefined && v.customer_id !== null && typeof v.customer_id !== 'string') {
    return { error: 'cliente_invalido' }
  }

  const customerId = cliente(v.customer_id)

  /*
   * A regra que protege o saldo: `comodato` exige um cliente. Sem isto, um `status: 'comodato'` sem
   * `customer_id` criaria um vasilhame "com o cliente" e sem dono — ele sairia do estoque, não
   * apareceria em `vasilhamesDoCliente` de ninguém, e a revenda não teria como cobrá-lo de volta.
   * O status é derivado de quem está com a peça, não o contrário.
   */
  if (v.status === 'comodato' && customerId === null) {
    return { error: 'comodato_exige_cliente' }
  }

  const comodato = customerId !== null

  return {
    vasilhame: {
      created_at: num(v.created_at, agora),
      customer_id: customerId,
      deposit_cents: Math.round(num(v.deposit_cents, 0)),
      delivered_at: num(v.delivered_at, comodato ? agora : 0),
      id: txt(v.id) || `vas-${agora}-${Math.random().toString(36).slice(2, 8)}`,
      kind,
      lost_reason: txt(v.lost_reason),
      returned_at: typeof v.returned_at === 'number' ? v.returned_at : null,
      serial: txt(v.serial),
      status: comodato ? 'comodato' : 'estoque',
      tenant_id: cliente(v.tenant_id) ?? DEFAULT_TENANT,
      updated_at: agora,
    },
  }
}

export class GasStore {
  constructor(private readonly filePath: string) {}

  /** Fila de escrita: read → valida → write não é atômico sozinho. Ver write-queue.ts. */
  private readonly fila = new WriteQueue()

  async list(tenantId: string = DEFAULT_TENANT): Promise<Vasilhame[]> {
    return (await this.read()).vasilhames
      .filter(v => v.tenant_id === tenantId)
      .sort((a, b) => b.updated_at - a.updated_at)
  }

  async saldo(tenantId: string = DEFAULT_TENANT): Promise<GasSaldo> {
    return gasSaldo((await this.read()).vasilhames, tenantId)
  }

  async doCliente(customerId: string, tenantId: string = DEFAULT_TENANT): Promise<Vasilhame[]> {
    return vasilhamesDoCliente((await this.read()).vasilhames, customerId, tenantId)
  }

  /** Entrada de vasilhame no estoque (compra de cascos, devolução de outro cliente). */
  async cadastrar(input: unknown): Promise<{ vasilhame: Vasilhame; saldo: GasSaldo } | { error: string }> {
    return this.fila.serializar(() => this.cadastrarSerializado(input))
  }

  private async cadastrarSerializado(
    input: unknown
  ): Promise<{ vasilhame: Vasilhame; saldo: GasSaldo } | { error: string }> {
    const normalizado = normalizarEntrada(input, Date.now())

    if ('error' in normalizado) {
      return normalizado
    }

    const file = await this.read()
    const vasilhame = normalizado.vasilhame

    file.vasilhames.push(vasilhame)

    await this.write(file)

    return { saldo: gasSaldo(file.vasilhames, vasilhame.tenant_id), vasilhame }
  }

  /**
   * Entrega o vasilhame a um cliente (comodato).
   *
   * Idempotente por cliente+id: entregar o mesmo vasilhame duas vezes não duplica posse — a segunda
   * chamada devolve o estado atual.
   */
  async entregar(
    vasilhameId: string,
    customerId: string
  ): Promise<{ vasilhame: Vasilhame; saldo: GasSaldo } | { error: string }> {
    return this.fila.serializar(() => this.entregarSerializado(vasilhameId, customerId))
  }

  private async entregarSerializado(
    vasilhameId: string,
    customerId: string
  ): Promise<{ vasilhame: Vasilhame; saldo: GasSaldo } | { error: string }> {
    if (!vasilhameId || !customerId) {
      return { error: 'vasilhame_e_cliente_obrigatorios' }
    }

    const file = await this.read()
    const indice = file.vasilhames.findIndex(v => v.id === vasilhameId)

    if (indice < 0) {
      return { error: 'vasilhame_nao_encontrado' }
    }

    const atual = file.vasilhames[indice]!

    if (atual.status === 'perdido') {
      return { error: 'vasilhame_perdido' }
    }

    if (atual.status === 'comodato') {
      return atual.customer_id === customerId
        ? { saldo: gasSaldo(file.vasilhames, atual.tenant_id), vasilhame: atual }
        : { error: 'ja_esta_em_comodato' }
    }

    const agora = Date.now()

    const entregue: Vasilhame = {
      ...atual,
      customer_id: customerId,
      delivered_at: agora,
      returned_at: null,
      status: 'comodato',
      updated_at: agora,
    }

    file.vasilhames[indice] = entregue

    await this.write(file)

    return { saldo: gasSaldo(file.vasilhames, entregue.tenant_id), vasilhame: entregue }
  }

  /**
   * Devolve o vasilhame ao estoque.
   *
   * Idempotente: devolver um que já voltou devolve o estado atual, não erro — a revenda pode tocar
   * "devolvido" duas vezes por engano, e o segundo toque não é uma falha.
   */
  async devolver(vasilhameId: string): Promise<{ vasilhame: Vasilhame; saldo: GasSaldo } | { error: string }> {
    return this.fila.serializar(() => this.devolverSerializado(vasilhameId))
  }

  private async devolverSerializado(
    vasilhameId: string
  ): Promise<{ vasilhame: Vasilhame; saldo: GasSaldo } | { error: string }> {
    const file = await this.read()
    const indice = file.vasilhames.findIndex(v => v.id === vasilhameId)

    if (indice < 0) {
      return { error: 'vasilhame_nao_encontrado' }
    }

    const atual = file.vasilhames[indice]!

    if (atual.status === 'estoque') {
      // Já está na revenda: nada a fazer.
      return { saldo: gasSaldo(file.vasilhames, atual.tenant_id), vasilhame: atual }
    }

    if (atual.status === 'perdido') {
      return { error: 'vasilhame_perdido' }
    }

    const agora = Date.now()

    const devolvido: Vasilhame = {
      ...atual,
      customer_id: null,
      returned_at: agora,
      status: 'estoque',
      updated_at: agora,
    }

    file.vasilhames[indice] = devolvido

    await this.write(file)

    return { saldo: gasSaldo(file.vasilhames, devolvido.tenant_id), vasilhame: devolvido }
  }

  /**
   * Baixa o vasilhame como perdido — o cliente não devolveu.
   *
   * É o oposto de `devolver`: o casco sai do patrimônio. `lost_reason` fica gravado para que a perda
   * seja auditável (não é um número que some).
   */
  async perder(
    vasilhameId: string,
    motivo: string
  ): Promise<{ vasilhame: Vasilhame; saldo: GasSaldo } | { error: string }> {
    return this.fila.serializar(() => this.perderSerializado(vasilhameId, motivo))
  }

  private async perderSerializado(
    vasilhameId: string,
    motivo: string
  ): Promise<{ vasilhame: Vasilhame; saldo: GasSaldo } | { error: string }> {
    const file = await this.read()
    const indice = file.vasilhames.findIndex(v => v.id === vasilhameId)

    if (indice < 0) {
      return { error: 'vasilhame_nao_encontrado' }
    }

    const atual = file.vasilhames[indice]!

    if (atual.status === 'perdido') {
      return { saldo: gasSaldo(file.vasilhames, atual.tenant_id), vasilhame: atual }
    }

    const agora = Date.now()

    const perdido: Vasilhame = {
      ...atual,
      lost_reason: typeof motivo === 'string' ? motivo.trim() : '',
      status: 'perdido',
      updated_at: agora,
    }

    file.vasilhames[indice] = perdido

    await this.write(file)

    return { saldo: gasSaldo(file.vasilhames, perdido.tenant_id), vasilhame: perdido }
  }

  private async read(): Promise<GasFile> {
    try {
      return parseGasUnsafe(await readFile(this.filePath, 'utf8'))
    } catch {
      return emptyGas()
    }
  }

  private async write(file: GasFile): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true })

    const temp = `${this.filePath}.tmp`

    await writeFile(temp, JSON.stringify(file, null, 2), 'utf8')
    await backupRotativo(this.filePath)
    await rename(temp, this.filePath)
  }
}

export function gasStorePath(userDataDir: string): string {
  return join(userDataDir, 'b3po', 'gas.json')
}
