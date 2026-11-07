import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { backupRotativo } from './store-backup'

/**
 * T-12 — política tarifária **configurável**, e por isso este arquivo não tem preço nenhum.
 *
 * A decisão do dono é explícita: *"Implemente T-12 com política de tarifas configurável, **sem
 * inventar preços ou regras comerciais**."* Isso determina duas coisas no código:
 *
 * 1. **Nenhum valor padrão.** Não existe `DEFAULT_PRECO`, não existe faixa de exemplo, e uma
 *    instalação nova **não** sabe cobrar — ela sabe que **não há política**. `calcularConta` recebe a
 *    política; quem chama decide o que fazer quando ela falta (`null`, nunca um número inventado).
 * 2. **A forma da regra é livre, o conteúdo não.** Faixas, mínimo, taxa fixa e esgoto são campos
 *    configuráveis; os números entram pelo dono, por vigência.
 *
 * A unidade do consumo é **milésimos de m³** (`reading_milli` do `meter-store`) e a unidade do
 * dinheiro é **centavos** — inteiros os dois. Ponto flutuante em dinheiro é bug esperando para
 * acontecer; a conversão para exibição acontece na borda.
 */

export interface Faixa {
  /** Teto da faixa em milésimos de m³. `null` = última faixa, sem teto. */
  ate_milli: number | null
  /** Preço por m³ **em centavos**. */
  preco_centavos_por_m3: number
}

export interface PoliticaTarifaria {
  created_at: number
  /** Esgoto como percentual do valor de água (0-100). `null` = não cobra esgoto. */
  esgoto_percentual: number | null
  faixas: Faixa[]
  id: string
  /** Consumo mínimo faturado, em milésimos. `null` = cobra o consumo real. */
  minimo_milli: number | null
  /** Moeda informada pelo dono. Não inferimos. */
  moeda: string
  tenant_id: string
  /** Taxa fixa por fatura, em centavos. `null` = sem taxa fixa. */
  taxa_fixa_centavos: number | null
  vigencia_fim: number | null
  vigencia_inicio: number
}

export interface TariffFile {
  politicas: PoliticaTarifaria[]
  schema_version: number
}

export interface FaixaAplicada {
  ate_milli: number | null
  /** Quanto do consumo caiu nesta faixa, em milésimos. */
  milli_na_faixa: number
  preco_centavos_por_m3: number
  subtotal_centavos: number
}

export interface Conta {
  agua_centavos: number
  consumo_faturado_milli: number
  consumo_medido_milli: number
  esgoto_centavos: number
  faixas_aplicadas: FaixaAplicada[]
  minimo_aplicado: boolean
  moeda: string
  politica_id: string
  taxa_fixa_centavos: number
  total_centavos: number
}

export function emptyTariffs(): TariffFile {
  return { politicas: [], schema_version: 1 }
}

function inteiroNaoNegativo(valor: unknown, campo: string): number {
  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor < 0 || !Number.isInteger(valor)) {
    throw new Error(`politica_invalida:${campo}`)
  }

  return valor
}

function inteiroOuNulo(valor: unknown, campo: string): number | null {
  if (valor === null || valor === undefined) return null

  return inteiroNaoNegativo(valor, campo)
}

/**
 * Valida a política **antes** de guardar: uma faixa fora de ordem ou com buraco produz uma conta
 * silenciosamente errada, que é o pior defeito possível num ERP.
 */
export function validarPolitica(p: PoliticaTarifaria): void {
  if (!p.faixas.length) throw new Error('politica_sem_faixa')

  let anterior = 0

  p.faixas.forEach((faixa, indice) => {
    inteiroNaoNegativo(faixa.preco_centavos_por_m3, `faixa_${indice}_preco`)

    const ultima = indice === p.faixas.length - 1

    if (faixa.ate_milli === null) {
      if (!ultima) throw new Error(`faixa_${indice}_aberta_sem_ser_ultima`)

      return
    }

    inteiroNaoNegativo(faixa.ate_milli, `faixa_${indice}_ate`)

    if (faixa.ate_milli <= anterior) throw new Error(`faixa_${indice}_fora_de_ordem`)

    anterior = faixa.ate_milli
  })

  const ultima = p.faixas[p.faixas.length - 1]

  if (ultima.ate_milli !== null) throw new Error('politica_sem_faixa_aberta')

  inteiroOuNulo(p.minimo_milli, 'minimo')
  inteiroOuNulo(p.taxa_fixa_centavos, 'taxa_fixa')

  if (p.esgoto_percentual !== null) {
    if (typeof p.esgoto_percentual !== 'number' || p.esgoto_percentual < 0 || p.esgoto_percentual > 100) {
      throw new Error('politica_esgoto_invalido')
    }
  }

  if (!p.moeda.trim()) throw new Error('politica_sem_moeda')
  if (p.vigencia_fim !== null && p.vigencia_fim < p.vigencia_inicio) throw new Error('politica_vigencia_invertida')
}

/**
 * Calcula a conta a partir do consumo medido.
 *
 * **Função pura**: não lê disco, não tem padrão, não arredonda preço. Recebe a política e o consumo,
 * devolve a composição. `consumo_medido_milli` e `consumo_faturado_milli` são campos separados porque
 * o mínimo faturado pode ser maior que o medido — e quem lê a fatura precisa ver as duas coisas.
 */
export function calcularConta(politica: PoliticaTarifaria, consumoMedidoMilli: number): Conta {
  inteiroNaoNegativo(consumoMedidoMilli, 'consumo')

  const faturado = politica.minimo_milli === null ? consumoMedidoMilli : Math.max(consumoMedidoMilli, politica.minimo_milli)
  const faixas_aplicadas: FaixaAplicada[] = []
  let restante = faturado
  let agua = 0
  let piso = 0

  for (const faixa of politica.faixas) {
    if (restante <= 0) break

    const teto = faixa.ate_milli === null ? restante : Math.max(0, faixa.ate_milli - piso)
    const naFaixa = Math.min(restante, teto)
    const subtotal = Math.round((naFaixa * faixa.preco_centavos_por_m3) / 1000)

    faixas_aplicadas.push({
      ate_milli: faixa.ate_milli,
      milli_na_faixa: naFaixa,
      preco_centavos_por_m3: faixa.preco_centavos_por_m3,
      subtotal_centavos: subtotal
    })

    agua += subtotal
    restante -= naFaixa
    piso = faixa.ate_milli ?? piso
  }

  const esgoto = politica.esgoto_percentual === null ? 0 : Math.round((agua * politica.esgoto_percentual) / 100)
  const taxa = politica.taxa_fixa_centavos ?? 0

  return {
    agua_centavos: agua,
    consumo_faturado_milli: faturado,
    consumo_medido_milli: consumoMedidoMilli,
    esgoto_centavos: esgoto,
    faixas_aplicadas,
    minimo_aplicado: faturado > consumoMedidoMilli,
    moeda: politica.moeda,
    politica_id: politica.id,
    taxa_fixa_centavos: taxa,
    total_centavos: agua + esgoto + taxa
  }
}

/** A política que vale numa data, ou `null` — nunca uma política inventada. */
export function politicaVigente(politicas: readonly PoliticaTarifaria[], quando: number): PoliticaTarifaria | null {
  let escolhida: PoliticaTarifaria | null = null

  for (const p of politicas) {
    if (p.vigencia_inicio > quando) continue
    if (p.vigencia_fim !== null && p.vigencia_fim < quando) continue
    if (!escolhida || p.vigencia_inicio > escolhida.vigencia_inicio) escolhida = p
  }

  return escolhida
}

export function parseTariffsUnsafe(texto: string): TariffFile {
  const bruto = JSON.parse(texto) as Partial<TariffFile>
  const politicas = Array.isArray(bruto.politicas) ? bruto.politicas : []

  for (const p of politicas) validarPolitica(p)

  return { politicas, schema_version: 1 }
}

export function tariffStorePath(userDataDir: string): string {
  return join(userDataDir, 'tariffs.json')
}

export class TariffStore {
  constructor(private readonly filePath: string) {}

  private async ler(): Promise<TariffFile> {
    try {
      return parseTariffsUnsafe(await readFile(this.filePath, 'utf8'))
    } catch {
      return emptyTariffs()
    }
  }

  private async gravar(file: TariffFile): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true })

    const temp = `${this.filePath}.tmp`

    await writeFile(temp, `${JSON.stringify(file, null, 2)}\n`, 'utf8')
    await backupRotativo(this.filePath)
    await rename(temp, this.filePath)
  }

  async list(tenantId: string): Promise<PoliticaTarifaria[]> {
    const file = await this.ler()

    return file.politicas.filter(p => p.tenant_id === tenantId).sort((a, b) => b.vigencia_inicio - a.vigencia_inicio)
  }

  /** Cria/atualiza por id. Valida antes de gravar — nunca guarda uma faixa com buraco. */
  async salvar(politica: PoliticaTarifaria): Promise<PoliticaTarifaria> {
    validarPolitica(politica)

    const file = await this.ler()
    const outras = file.politicas.filter(p => p.id !== politica.id)

    await this.gravar({ politicas: [...outras, politica], schema_version: 1 })

    return politica
  }

  async remover(id: string): Promise<void> {
    const file = await this.ler()

    await this.gravar({ politicas: file.politicas.filter(p => p.id !== id), schema_version: 1 })
  }

  /** A conta do consumo medido, ou `null` quando **não há** política vigente. */
  async calcular(tenantId: string, consumoMilli: number, quando: number): Promise<Conta | null> {
    const politica = politicaVigente(await this.list(tenantId), quando)

    return politica ? calcularConta(politica, consumoMilli) : null
  }
}
