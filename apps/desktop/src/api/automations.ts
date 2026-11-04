/**
 * Automações no renderer.
 *
 * As ações vêm do catálogo REAL do processo principal (`automations.tools`), não de uma lista escrita à
 * mão aqui: uma lista paralela envelhece na primeira ferramenta nova e oferece ação que não existe.
 *
 * Só ações que executam aparecem — consultar não muda nada e não deveria virar "automação".
 */

export interface AutomationRuleRow {
  action_args: Record<string, unknown>
  action_name: string
  active: boolean
  actor_id: string
  id: string
  name: string
  trigger: string
}

export interface ToolOption {
  action: string
  description: string
  domain: string
  name: string
}

export type WriteResult = { error: string } | { ok: true }

interface Bridge {
  create: (payload: Record<string, unknown>) => Promise<unknown>
  list: () => Promise<{ rules: AutomationRuleRow[] }>
  setActive: (payload: Record<string, unknown>) => Promise<unknown>
  tools: () => Promise<{ tools: ToolOption[] }>
  triggers: () => Promise<{ triggers: string[] }>
}

function bridge(): Bridge | null {
  return (globalThis as { hermesDesktop?: { automations?: Bridge } }).hermesDesktop?.automations ?? null
}

export function automationsAvailable(): boolean {
  return bridge() !== null
}

export async function listRules(): Promise<AutomationRuleRow[]> {
  const api = bridge()

  return api ? ((await api.list()).rules ?? []) : []
}

export async function listTriggers(): Promise<string[]> {
  const api = bridge()

  return api ? ((await api.triggers()).triggers ?? []) : []
}

export async function listTools(): Promise<ToolOption[]> {
  const api = bridge()

  return api ? ((await api.tools()).tools ?? []) : []
}

export async function createRule(payload: Record<string, unknown>): Promise<WriteResult> {
  const api = bridge()

  return api ? normalizar(await api.create(payload)) : { error: 'automacoes_indisponiveis' }
}

export async function setRuleActive(id: string, active: boolean): Promise<WriteResult> {
  const api = bridge()

  return api ? normalizar(await api.setActive({ active, id })) : { error: 'automacoes_indisponiveis' }
}

function normalizar(bruto: unknown): WriteResult {
  const erro = (bruto as { error?: unknown } | null)?.error

  return typeof erro === 'string' ? { error: erro } : { ok: true }
}

/** Rótulo humano do gatilho. `venda.faturada` é chave técnica, não texto de tela. */
export const TRIGGER_LABEL: Record<string, string> = {
  'conta.vencendo': 'Uma conta vai vencer',
  'estoque.zerado': 'Um produto zerou',
  'ticket.aberto': 'Um atendimento foi aberto',
  'ticket.atrasado': 'Um atendimento passou do prazo',
  'venda.faturada': 'Uma venda foi faturada'
}
