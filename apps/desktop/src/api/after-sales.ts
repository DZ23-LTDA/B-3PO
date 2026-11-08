/**
 * Pós-venda no renderer.
 *
 * O atraso e o prazo chegam prontos do processo principal (`atrasado`, `prazo_horas`): o relógio
 * autoritativo é o de lá, e um renderer com fuso ou hora errada mostraria acompanhamento atrasado
 * como no prazo.
 */

export interface FollowUpRow {
  atrasado: boolean
  contact_phone: string
  due_at: number
  id: string
  kind: 'fidelizacao' | 'recompra' | 'satisfacao'
  notes: string
  prazo_horas: number
  ref: string
  status: 'descartado' | 'feito' | 'pendente'
}

export interface AfterSalesIndicators {
  atrasados: number
  pendentes: number
  semAcompanhamento: number
}

interface Bridge {
  create: (payload: Record<string, unknown>) => Promise<{ error: string } | unknown>
  indicators: () => Promise<{ indicators: AfterSalesIndicators }>
  list: () => Promise<{ followUps: FollowUpRow[] }>
  setStatus: (payload: Record<string, unknown>) => Promise<{ error: string } | { followUps: FollowUpRow[] }>
}

function bridge(): Bridge | null {
  return (globalThis as { hermesDesktop?: { aftersales?: Bridge } }).hermesDesktop?.aftersales ?? null
}

export function afterSalesAvailable(): boolean {
  return bridge() !== null
}

export async function listFollowUps(): Promise<FollowUpRow[]> {
  const api = bridge()

  if (!api) return []

  const r = await api.list()

  return Array.isArray(r?.followUps) ? r.followUps : []
}

export async function indicators(): Promise<AfterSalesIndicators | null> {
  const api = bridge()

  if (!api) return null

  const r = await api.indicators()

  return r?.indicators ?? null
}

export async function markDone(id: string): Promise<{ error: string } | { followUps: FollowUpRow[] }> {
  const api = bridge()

  if (!api) return { error: 'pos_venda_indisponivel' }

  return api.setStatus({ id, status: 'feito' })
}

export const KIND_LABEL: Record<FollowUpRow['kind'], string> = {
  fidelizacao: 'Fidelização',
  recompra: 'Recompra',
  satisfacao: 'Satisfação'
}

/** Prazo em linguagem humana. Negativo = já venceu. */
export function prazoLabel(horas: number): string {
  if (horas <= 0) {
    const dias = Math.max(1, Math.round(Math.abs(horas) / 24))

    return `atrasado ${dias} ${dias === 1 ? 'dia' : 'dias'}`
  }

  if (horas < 24) {
    return `em ${Math.round(horas)} h`
  }

  const dias = Math.round(horas / 24)

  return `em ${dias} ${dias === 1 ? 'dia' : 'dias'}`
}
