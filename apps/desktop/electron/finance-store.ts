// Financeiro (contas a receber e a pagar) no disco do usuário.
//
// Mesma disciplina do estoque, pelo mesmo motivo: **totais não são armazenados**. "Quanto tenho a
// receber" é a soma dos lançamentos em aberto, calculada na hora. Um campo `saldo` ao lado do livro
// vira uma segunda verdade que diverge na primeira escrita interrompida.
//
// Duas regras de negócio que evitam erro silencioso:
//
// 1. `ref` idempotente. Faturar uma venda duas vezes não cria duas contas a receber — a segunda é
//    recusada com `ref_duplicado`, exatamente como no estoque.
// 2. Pago é estado final para o valor. Um lançamento pago não muda de valor nem volta para aberto;
//    corrigir é lançar o estorno. Sem isso, um "desfazer" reescreveria o caixa do mês fechado.

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { DEFAULT_TENANT } from './catalog-store'
import { cents } from './money'
import type { Sale } from './sales-store'

export const ENTRY_KINDS = ['receber', 'pagar'] as const
export const ENTRY_STATUSES = ['aberto', 'pago', 'cancelado'] as const

export type EntryKind = (typeof ENTRY_KINDS)[number]
export type EntryStatus = (typeof ENTRY_STATUSES)[number]

export interface FinanceEntry {
  amount_cents: number
  /** Centro de custo: departamento, obra ou projeto que absorve o lancamento. Vazio = nao alocado. */
  cost_center: string
  created_at: number
  currency: string
  description: string
  /** Vencimento em ms. */
  due_at: number
  id: string
  kind: EntryKind
  /** Quem paga ou recebe: telefone do contato, ou nome do fornecedor. */
  party: string
  /** Chave de idempotência do emissor (ex.: `venda:<id>`). Vazio = sem deduplicação. */
  ref: string
  status: EntryStatus
  tenant_id: string
  updated_at: number
}

export interface FinanceFile {
  entries: FinanceEntry[]
  schema_version: 1
}

function emptyFinance(): FinanceFile {
  return { entries: [], schema_version: 1 }
}

export function financeStorePath(userDataDir: string): string {
  return join(userDataDir, 'b3po', 'finance.json')
}

export function isKind(value: unknown): value is EntryKind {
  return typeof value === 'string' && (ENTRY_KINDS as readonly string[]).includes(value)
}

export function isStatus(value: unknown): value is EntryStatus {
  return typeof value === 'string' && (ENTRY_STATUSES as readonly string[]).includes(value)
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export interface FinanceTotals {
  /** Em aberto a receber, em centavos. */
  openReceivableCents: number
  /** Em aberto a pagar, em centavos. */
  openPayableCents: number
  /** Já recebido. */
  paidReceivableCents: number
  /** Já pago. */
  paidPayableCents: number
  /** Em aberto com vencimento no passado. */
  overdueCents: number
}

/** Todos os números são derivados dos lançamentos. Nada aqui é um campo gravado. */
export function totals(entries: readonly FinanceEntry[], tenantId: string = DEFAULT_TENANT, now: number = Date.now()): FinanceTotals {
  const out: FinanceTotals = {
    openPayableCents: 0,
    openReceivableCents: 0,
    overdueCents: 0,
    paidPayableCents: 0,
    paidReceivableCents: 0
  }

  for (const entry of entries) {
    if (entry.tenant_id !== tenantId || entry.status === 'cancelado') {
      continue
    }

    const pago = entry.status === 'pago'
    const receber = entry.kind === 'receber'

    if (pago) {
      if (receber) {
        out.paidReceivableCents += entry.amount_cents
      } else {
        out.paidPayableCents += entry.amount_cents
      }

      continue
    }

    if (receber) {
      out.openReceivableCents += entry.amount_cents
    } else {
      out.openPayableCents += entry.amount_cents
    }

    if (entry.due_at > 0 && entry.due_at < now) {
      out.overdueCents += entry.amount_cents
    }
  }

  return out
}

export function normalizeEntry(input: unknown, now: number): { error: string } | { entry: FinanceEntry } {
  const raw = (input ?? {}) as Record<string, unknown>
  const kind = raw['kind']

  if (!isKind(kind)) {
    return { error: 'kind_invalid' }
  }

  const amount = cents(raw['amount_cents'] ?? raw['amount'])

  // Lançamento de zero não é lançamento: some da soma e ninguém percebe.
  if (amount <= 0) {
    return { error: 'amount_required' }
  }

  const due = Number(raw['due_at'])

  if (!Number.isFinite(due) || due <= 0) {
    return { error: 'due_at_required' }
  }

  const status = raw['status']

  if (status !== undefined && status !== null && text(status) !== '' && !isStatus(status)) {
    return { error: 'status_invalid' }
  }

  return {
    entry: {
      amount_cents: amount,
      cost_center: text(raw['cost_center']).slice(0, 60),
      created_at: typeof raw['created_at'] === 'number' ? raw['created_at'] : now,
      currency: (text(raw['currency']) || 'BRL').toUpperCase(),
      description: text(raw['description']),
      due_at: Math.round(due),
      id: text(raw['id']) || `fin_${now}_${Math.random().toString(36).slice(2, 8)}`,
      kind,
      party: text(raw['party']),
      ref: text(raw['ref']),
      status: isStatus(status) ? status : 'aberto',
      tenant_id: text(raw['tenant_id']) || DEFAULT_TENANT,
      updated_at: now
    }
  }
}

/**
 * Quanto cada centro de custo consome, separado por natureza.
 *
 * Centro vazio vira a chave `''` em vez de ser descartado: um lancamento sem alocacao precisa aparecer como
 * "nao alocado", nao sumir do relatorio. Descartar daria um total por centro que nao fecha com o total geral —
 * e a diferenca seria invisivel.
 */
export function totaisPorCentroDeCusto(
  entries: readonly FinanceEntry[]
): Record<string, { pago_cents: number; pendente_cents: number }> {
  const out: Record<string, { pago_cents: number; pendente_cents: number }> = {}

  for (const entry of entries) {
    // Cancelado nao consome nada: incluí-lo faria o relatorio cobrar o que foi estornado.
    if (entry.status === 'cancelado') continue

    const chave = entry.cost_center || ''
    const atual = out[chave] ?? { pago_cents: 0, pendente_cents: 0 }

    if (entry.status === 'pago') {
      atual.pago_cents += entry.amount_cents
    } else {
      atual.pendente_cents += entry.amount_cents
    }

    out[chave] = atual
  }

  return out
}
export function parseFinance(raw: string): FinanceFile {
  try {
    const parsed = JSON.parse(raw) as Partial<FinanceFile>

    if (!parsed || !Array.isArray(parsed.entries)) {
      return emptyFinance()
    }

    return {
      entries: parsed.entries.filter(
        entry =>
          !!entry &&
          typeof entry.id === 'string' &&
          typeof entry.tenant_id === 'string' &&
          typeof entry.amount_cents === 'number' &&
          Number.isFinite(entry.amount_cents) &&
          isKind((entry as FinanceEntry).kind) &&
          isStatus((entry as FinanceEntry).status)
      ),
      schema_version: 1
    }
  } catch {
    return emptyFinance()
  }
}

/**
 * O lançamento que uma venda faturada exige: uma conta a receber, com `ref` determinística.
 *
 * Só venda faturada gera receita. Orçamento e pedido ainda não são dinheiro — e por isso devolvem null.
 */
export function receivableForSale(sale: Sale, now: number = Date.now()): Omit<FinanceEntry, 'created_at' | 'id' | 'updated_at'> | null {
  if (sale.status !== 'faturado' || sale.total_cents <= 0) {
    return null
  }

  return {
    amount_cents: sale.total_cents,
    cost_center: '',
    currency: sale.currency,
    description: `Venda ${sale.number}`,
    due_at: now,
    kind: 'receber',
    party: sale.contact_phone,
    ref: `venda:${sale.id}`,
    status: 'aberto',
    tenant_id: sale.tenant_id
  }
}

/**
 * A conta a pagar que um pedido **recebido** gera.
 *
 * Espelha `receivableForSale`: a venda faturada gera a receber, a compra recebida gera a pagar. O
 * lançamento é derivado do pedido, nunca digitado — assim o financeiro não pode divergir da compra.
 *
 * Só `recebido` gera: rascunho e pedido são intenção, e cancelado não é obrigação. Mesma regra da venda,
 * onde só `faturado` gera.
 *
 * `due_at` é o momento do recebimento porque o pedido não guarda prazo de pagamento. Quando o cadastro de
 * fornecedor tiver condição de pagamento, este é o campo que passa a ler dele.
 */
export function payableForPurchase(
  order: { id: string; number: number; status: string; supplier_id: string; tenant_id: string; total_cents: number },
  now: number = Date.now()
): Omit<FinanceEntry, 'created_at' | 'id' | 'updated_at'> | null {
  if (order.status !== 'recebido' || order.total_cents <= 0) {
    return null
  }

  return {
    amount_cents: order.total_cents,
    cost_center: '',
    currency: 'BRL',
    description: `Compra ${order.number}`,
    due_at: now,
    kind: 'pagar',
    party: order.supplier_id,
    ref: `compra:${order.id}`,
    status: 'aberto',
    tenant_id: order.tenant_id
  }
}

export class FinanceStore {
  /**
   * Fila de escrita (r235).
   *
   * Mesmo defeito da r234 no estoque: read -> valida -> write sem serializacao. Duas chamadas simultaneas leem o
   * mesmo estado e a segunda grava por cima da primeira.
   *
   * A fila e por INSTANCIA, que e a unidade de escrita do arquivo. Duas instancias sobre o mesmo arquivo continuam
   * sem protecao mutua - isso exigiria lock de sistema de arquivos, e o produto usa uma instancia por diretorio.
   */
  private fila: Promise<unknown> = Promise.resolve()

  /** Serializa uma escrita: a proxima so comeca quando esta terminar. */
  private serializar<T>(run: () => Promise<T>): Promise<T> {
    const resultado = this.fila.then(run)

    this.fila = resultado.catch(() => undefined)

    return resultado
  }

  constructor(private readonly filePath: string) {}

  async list(tenantId: string = DEFAULT_TENANT): Promise<FinanceEntry[]> {
    const file = await this.read()

    return file.entries
      .filter(entry => entry.tenant_id === tenantId)
      .sort((a, b) => a.due_at - b.due_at)
  }

  async totals(tenantId: string = DEFAULT_TENANT): Promise<FinanceTotals> {
    return totals(await this.read().then(file => file.entries), tenantId)
  }

  async append(input: unknown): Promise<{ error: string } | { entries: FinanceEntry[]; entry: FinanceEntry }> {
    return this.serializar(() => this.appendSerializado(input))
  }

  private async appendSerializado(input: unknown): Promise<{ error: string } | { entries: FinanceEntry[]; entry: FinanceEntry }> {
    const normalized = normalizeEntry(input, Date.now())

    if ('error' in normalized) {
      return normalized
    }

    const file = await this.read()
    const entry = normalized.entry
    const anterior = file.entries.find(item => item.id === entry.id)

    if (anterior && anterior.status === 'pago') {
      return { error: 'lancamento_pago_imutavel' }
    }

    if (entry.ref && file.entries.some(item => item.tenant_id === entry.tenant_id && item.ref === entry.ref)) {
      return { error: 'ref_duplicado' }
    }

    const indice = file.entries.findIndex(item => item.id === entry.id)

    if (indice >= 0) {
      const original = file.entries[indice]!

      file.entries[indice] = { ...entry, created_at: original.created_at }
    } else {
      file.entries.push(entry)
    }

    await this.write(file)

    return { entries: await this.list(entry.tenant_id), entry }
  }

  /** Marca como pago. Pago é final: pagar de novo é erro, não no-op silencioso. */
  async settle(id: string, tenantId: string = DEFAULT_TENANT, paidAt: number = Date.now()): Promise<{ error: string } | { entries: FinanceEntry[] }> {
    return this.serializar(() => this.settleSerializado(id, tenantId, paidAt))
  }

  private async settleSerializado(id: string, tenantId: string = DEFAULT_TENANT, paidAt: number = Date.now()): Promise<{ error: string } | { entries: FinanceEntry[] }> {
    const file = await this.read()
    const indice = file.entries.findIndex(item => item.id === id && item.tenant_id === tenantId)

    if (indice < 0) {
      return { error: 'lancamento_nao_encontrado' }
    }

    const anterior = file.entries[indice]!

    if (anterior.status === 'pago') {
      return { error: 'lancamento_ja_pago' }
    }

    if (anterior.status === 'cancelado') {
      return { error: 'lancamento_cancelado' }
    }

    file.entries[indice] = { ...anterior, status: 'pago', updated_at: paidAt }
    await this.write(file)

    return { entries: await this.list(tenantId) }
  }

  private async read(): Promise<FinanceFile> {
    try {
      return parseFinance(await readFile(this.filePath, 'utf8'))
    } catch {
      return emptyFinance()
    }
  }

  private async write(file: FinanceFile): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true })
    const temp = `${this.filePath}.tmp`
    await writeFile(temp, JSON.stringify(file, null, 2), 'utf8')
    await rename(temp, this.filePath)
  }
}
