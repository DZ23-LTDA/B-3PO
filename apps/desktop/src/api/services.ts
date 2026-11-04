/**
 * Catálogo de serviços no renderer.
 *
 * O serviço é a fonte canônica de duração e preço. A agenda consulta aqui em vez de aceitar texto
 * livre — é o que impede "Corte", "corte" e "Corte " virarem três serviços.
 */

export interface ServiceRow {
  active: boolean
  duration_min: number
  id: string
  name: string
  notes: string
  price_cents: number
}

interface ServicesBridge {
  find: (name: string) => Promise<{ service: ServiceRow | null }>
  list: () => Promise<{ services: ServiceRow[] }>
  remove: (id: string) => Promise<{ error: string } | { services: ServiceRow[] }>
  save: (payload: Record<string, unknown>) => Promise<{ error: string } | { service: ServiceRow; services: ServiceRow[] }>
}

function bridge(): ServicesBridge | null {
  const host = (globalThis as { hermesDesktop?: { services?: ServicesBridge } }).hermesDesktop

  return host?.services ?? null
}

export function servicesAvailable(): boolean {
  return bridge() !== null
}

export async function listServices(): Promise<ServiceRow[]> {
  const api = bridge()

  if (!api) return []

  const r = await api.list()

  return Array.isArray(r?.services) ? r.services : []
}

export async function saveService(
  payload: Record<string, unknown>
): Promise<{ error: string } | { services: ServiceRow[] }> {
  const api = bridge()

  if (!api) return { error: 'servicos_indisponivel' }

  const r = await api.save(payload)

  return 'error' in r ? r : { services: r.services }
}

export async function removeService(id: string): Promise<{ error: string } | { services: ServiceRow[] }> {
  const api = bridge()

  if (!api) return { error: 'servicos_indisponivel' }

  return api.remove(id)
}

export async function findService(name: string): Promise<ServiceRow | null> {
  const api = bridge()

  if (!api) return null

  const r = await api.find(name)

  return r?.service ?? null
}

/** Duração em minutos que a agenda usa para fechar o horário a partir do início. */
export function endsAtFor(startsAt: number, durationMin: number): number {
  return startsAt + Math.max(1, Math.round(durationMin)) * 60_000
}
