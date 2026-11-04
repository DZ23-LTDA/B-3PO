/**
 * Agentes (atores do sistema) no renderer.
 *
 * Um agente bot é um operador autorizado: tem nível, escopo e — quando o app reinicia — credencial de
 * MCP. Esta tela é a porta que faltava: até aqui, criar um bot exigia chamar IPC à mão.
 */

export interface ActorRow {
  active: boolean
  id: string
  kind: 'bot' | 'human'
  level: null | string
  name: string
  role: string
  scopes: string[]
}

export const LEVELS = ['READ', 'RECOMMEND', 'PREPARE', 'EXECUTE_ALLOWED', 'SUPERVISED_AUTONOMY'] as const

/** Escopos são nomes de domínio: é o que `toolsFor` usa para filtrar o catálogo do agente. */
export const SCOPE_OPTIONS = [
  'catalog',
  'desk',
  'finance',
  'hr',
  'inventory',
  'sales',
  'scheduling',
  'services'
] as const

interface AdminBridge {
  actors: () => Promise<{ actors: ActorRow[] }>
  deactivate: (id: string) => Promise<{ error: string } | { actors: ActorRow[] }>
  saveActor: (payload: Record<string, unknown>) => Promise<{ error: string; reason?: string } | { actor: ActorRow; actors: ActorRow[] }>
  whoami: () => Promise<{ actor: ActorRow | null }>
}

function bridge(): AdminBridge | null {
  const host = (globalThis as { hermesDesktop?: { admin?: AdminBridge } }).hermesDesktop

  return host?.admin ?? null
}

export function adminAvailable(): boolean {
  return bridge() !== null
}

export async function listActors(): Promise<ActorRow[]> {
  const api = bridge()

  if (!api) return []

  const r = await api.actors()

  return Array.isArray(r?.actors) ? r.actors : []
}

export async function whoami(): Promise<ActorRow | null> {
  const api = bridge()

  if (!api) return null

  const r = await api.whoami()

  return r?.actor ?? null
}

export async function saveActor(
  payload: Record<string, unknown>
): Promise<{ error: string; reason?: string } | { actors: ActorRow[] }> {
  const api = bridge()

  if (!api) return { error: 'administracao_indisponivel' }

  const r = await api.saveActor(payload)

  return 'error' in r ? r : { actors: r.actors }
}

export async function deactivateActor(id: string): Promise<{ error: string } | { actors: ActorRow[] }> {
  const api = bridge()

  if (!api) return { error: 'administracao_indisponivel' }

  return api.deactivate(id)
}

export function levelLabel(level: null | string): string {
  const mapa: Record<string, string> = {
    EXECUTE_ALLOWED: 'Executa',
    PREPARE: 'Prepara',
    READ: 'Consulta',
    RECOMMEND: 'Recomenda',
    SUPERVISED_AUTONOMY: 'Autonomia supervisionada'
  }

  return level ? (mapa[level] ?? level) : 'sem acesso'
}
