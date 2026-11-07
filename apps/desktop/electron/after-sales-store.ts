import { backupRotativo } from './store-backup'
// Pós-venda: acompanhamento depois que a venda aconteceu.
//
// Fecha o ciclo comercial do GOAL: venda → entrega → atendimento → **pós-venda** (recompra,
// fidelização, satisfação). Sem ele, "recompra" não existe como dado: uma venda faturada há 60 dias
// não gera nada, e ninguém é lembrado de reoferecer.
//
// Três decisões:
//
// 1. **O prazo é derivado do tipo**, nunca digitado. Satisfação pergunta cedo; recompra, depois de um
//    intervalo que depende do que foi vendido. Prazo escolhido a dedo vira prazo esquecido.
// 2. **Atraso é derivado do relógio**, como no atendimento: guardar "está vencido" no disco envelhece
//    errado.
// 3. **Follow-up nasce de venda faturada.** Venda cancelada ou orçamento não gera pós-venda: cobrar
//    satisfação de algo que não foi entregue é ruído.

import { WriteQueue } from './write-queue'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { DEFAULT_TENANT } from './catalog-store'
import { idDaVenda, refVendaFollowUp } from './refs'

export const FOLLOW_UP_KINDS = ['satisfacao', 'recompra', 'fidelizacao'] as const

export type FollowUpKind = (typeof FOLLOW_UP_KINDS)[number]

export const FOLLOW_UP_STATUSES = ['pendente', 'feito', 'descartado'] as const

export type FollowUpStatus = (typeof FOLLOW_UP_STATUSES)[number]

/** Dias até o acompanhamento, por tipo. Tabela, não heurística. */
export const KIND_DAYS: Record<FollowUpKind, number> = {
  fidelizacao: 90,
  recompra: 30,
  satisfacao: 2
}

export interface FollowUp {
  contact_phone: string
  created_at: number
  /** Derivado de `sale_at` + `KIND_DAYS[kind]`. */
  due_at: number
  id: string
  kind: FollowUpKind
  notes: string
  /** Referência da venda que originou (`venda:<id>`). Idempotência: um follow-up por venda e tipo. */
  ref: string
  /** Quando a venda aconteceu. Base do prazo. */
  sale_at: number
  status: FollowUpStatus
  tenant_id: string
  updated_at: number
}

export interface AfterSalesFile {
  follow_ups: FollowUp[]
  schema_version: 1
}

function empty(): AfterSalesFile {
  return { follow_ups: [], schema_version: 1 }
}

export function afterSalesStorePath(userDataDir: string): string {
  return join(userDataDir, 'b3po', 'after-sales.json')
}

function texto(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function dueAtFor(saleAt: number, kind: FollowUpKind): number {
  return saleAt + KIND_DAYS[kind] * 86_400_000
}

export function normalizeFollowUp(input: unknown, now: number): { error: string } | { followUp: FollowUp } {
  const raw = (input ?? {}) as Record<string, unknown>
  const saleAt = typeof raw['sale_at'] === 'number' ? raw['sale_at'] : 0

  if (saleAt <= 0) {
    return { error: 'sale_at_required' }
  }

  const kind = FOLLOW_UP_KINDS.includes(raw['kind'] as FollowUpKind) ? (raw['kind'] as FollowUpKind) : 'satisfacao'
  const saleId = texto(raw['sale_id'])

  if (!saleId) {
    // Sem a venda de origem, o follow-up nao tem a quem se referir nem como ser idempotente.
    return { error: 'sale_required' }
  }

  const ref = refVendaFollowUp(saleId, kind)

  return {
    followUp: {
      contact_phone: texto(raw['contact_phone']),
      created_at: now,
      due_at: dueAtFor(saleAt, kind),
      id: texto(raw['id']) || `fu_${now}_${Math.random().toString(36).slice(2, 8)}`,
      kind,
      notes: texto(raw['notes']),
      ref,
      sale_at: saleAt,
      status: 'pendente',
      tenant_id: texto(raw['tenant_id']) || DEFAULT_TENANT,
      updated_at: now
    }
  }
}

export function parseAfterSales(raw: string): AfterSalesFile {
  try {
    const parsed = JSON.parse(raw) as Partial<AfterSalesFile>

    if (!parsed || !Array.isArray(parsed.follow_ups)) {
      return empty()
    }

    return {
      follow_ups: parsed.follow_ups.filter(f => f && typeof f.id === 'string' && typeof f.ref === 'string'),
      schema_version: 1
    }
  } catch {
    return empty()
  }
}

/** Vencido agora? Derivado do relógio, e só enquanto pendente. */
export function isOverdue(followUp: FollowUp, now: number): boolean {
  return followUp.status === 'pendente' && now > followUp.due_at
}

export function followUpsFor(followUps: readonly FollowUp[], tenantId: string = DEFAULT_TENANT): FollowUp[] {
  return [...followUps]
    .filter(f => f.tenant_id === tenantId && f.status === 'pendente')
    .sort((a, b) => a.due_at - b.due_at)
}

export interface AfterSalesIndicators {
  atrasados: number
  pendentes: number
  /** Vendas faturadas sem nenhum follow-up pendente — é o buraco do pós-venda. */
  semAcompanhamento: number
}

export function indicators(
  followUps: readonly FollowUp[],
  sales: readonly { id: string; status: string; tenant_id: string }[],
  now: number,
  tenantId: string = DEFAULT_TENANT
): AfterSalesIndicators {
  const doTenant = followUps.filter(f => f.tenant_id === tenantId && f.status === 'pendente')
  const comFollowUp = new Set(doTenant.map(f => idDaVenda(f.ref) ?? ''))
  const faturadas = sales.filter(s => s.tenant_id === tenantId && s.status === 'faturado')

  return {
    atrasados: doTenant.filter(f => isOverdue(f, now)).length,
    pendentes: doTenant.length,
    semAcompanhamento: faturadas.filter(s => !comFollowUp.has(s.id)).length
  }
}

export class AfterSalesStore {
  constructor(private readonly filePath: string) {}

  /** Fila de escrita (r238): read -> valida -> write nao era serializado. Ver write-queue.ts. */
  private readonly fila = new WriteQueue()

  async list(tenantId: string = DEFAULT_TENANT): Promise<FollowUp[]> {
    return followUpsFor((await this.read()).follow_ups, tenantId)
  }

  /**
   * Todos, inclusive os ja resolvidos.
   *
   * `list()` filtra por pendente de proposito — e a lista de trabalho. Mas o indicador de buraco
   * precisa saber se a venda TEVE acompanhamento: um follow-up ja feito conta como atendido.
   */
  async listAll(tenantId: string = DEFAULT_TENANT): Promise<FollowUp[]> {
    return (await this.read()).follow_ups.filter(f => f.tenant_id === tenantId)
  }

  async create(input: unknown): Promise<{ followUp: FollowUp; followUps: FollowUp[] } | { error: string }> {
    return this.fila.serializar(() => this.createSerializado(input))
  }

  private async createSerializado(input: unknown): Promise<{ followUp: FollowUp; followUps: FollowUp[] } | { error: string }> {
    const normalized = normalizeFollowUp(input, Date.now())

    if ('error' in normalized) {
      return normalized
    }

    const file = await this.read()
    const followUp = normalized.followUp

    // Idempotente por (venda, tipo): reenviar a mesma venda nao duplica o acompanhamento.
    if (file.follow_ups.some(f => f.ref === followUp.ref)) {
      return { error: 'acompanhamento_duplicado' }
    }

    file.follow_ups.push(followUp)
    await this.write(file)

    return { followUp, followUps: await this.list(followUp.tenant_id) }
  }

  async setStatus(id: string, status: FollowUpStatus): Promise<{ followUps: FollowUp[] } | { error: string }> {
    return this.fila.serializar(() => this.setStatusSerializado(id, status))
  }

  private async setStatusSerializado(id: string, status: FollowUpStatus): Promise<{ followUps: FollowUp[] } | { error: string }> {
    const file = await this.read()
    const indice = file.follow_ups.findIndex(f => f.id === id)

    if (indice < 0) {
      return { error: 'acompanhamento_nao_encontrado' }
    }

    const atual = file.follow_ups[indice]!

    file.follow_ups[indice] = { ...atual, status, updated_at: Date.now() }
    await this.write(file)

    return { followUps: await this.list(atual.tenant_id) }
  }

  private async read(): Promise<AfterSalesFile> {
    try {
      return parseAfterSales(await readFile(this.filePath, 'utf8'))
    } catch {
      return empty()
    }
  }

  private async write(file: AfterSalesFile): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true })
    const temp = `${this.filePath}.tmp`
    await writeFile(temp, JSON.stringify(file, null, 2), 'utf8')
    await backupRotativo(this.filePath)
    await rename(temp, this.filePath)
  }
}
