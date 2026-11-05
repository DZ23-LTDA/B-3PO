// Catálogo de serviços.
//
// Antes deste arquivo, a agenda guardava `service` como **texto livre**: dois agendamentos podiam
// dizer "Corte" e "corte ", e nada sabia quanto custa nem quanto tempo leva. Serviço sem catálogo é
// texto, e texto não vira ordem de serviço nem receita.
//
// Este é o dono canônico do serviço. A agenda referencia por id; o caixa consulta o preço daqui em
// vez de alguém digitar de novo.
//
// Regras que protegem o dado:
// - nome único por tenant: dois "Corte" com preços diferentes é o mesmo serviço cobrado duas vezes;
// - duração maior que zero: serviço de 0 min não ocupa horário e quebra a detecção de conflito;
// - preço não negativo.

import { WriteQueue } from './write-queue'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { DEFAULT_TENANT } from './catalog-store'
import { cents } from './money'

export interface Service {
  active: boolean
  /** Duração padrão em minutos. A agenda usa para calcular o fim do horário. */
  duration_min: number
  created_at: number
  id: string
  name: string
  notes: string
  price_cents: number
  tenant_id: string
  updated_at: number
}

export interface ServicesFile {
  schema_version: 1
  services: Service[]
}

function empty(): ServicesFile {
  return { schema_version: 1, services: [] }
}

export function servicesStorePath(userDataDir: string): string {
  return join(userDataDir, 'b3po', 'services.json')
}

function normalizeKey(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

export function normalizeService(input: unknown, now: number): { error: string } | { service: Service } {
  const raw = (input ?? {}) as Record<string, unknown>
  const name = typeof raw['name'] === 'string' ? raw['name'].trim() : ''

  if (!name) {
    return { error: 'name_required' }
  }

  const duration = raw['duration_min']
  const durationMin = typeof duration === 'number' && Number.isFinite(duration) ? Math.round(duration) : 30

  if (durationMin <= 0) {
    return { error: 'duration_required' }
  }

  // `cents` ja garante inteiro e nao-negativo; 0 e valido (servico cortesia). Nao ha ramo de erro
  // de preco aqui de proposito: duplicar a regra de dinheiro em cada dominio e como os dois
  // conversores divergem.
  const preco = cents(raw['price_cents'])

  return {
    service: {
      active: raw['active'] === undefined ? true : raw['active'] === true,
      created_at: typeof raw['created_at'] === 'number' ? raw['created_at'] : now,
      duration_min: durationMin,
      id: typeof raw['id'] === 'string' && raw['id'].trim() ? raw['id'].trim() : `srv_${now}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      notes: typeof raw['notes'] === 'string' ? raw['notes'].trim() : '',
      price_cents: preco,
      tenant_id: typeof raw['tenant_id'] === 'string' && raw['tenant_id'].trim() ? raw['tenant_id'].trim() : DEFAULT_TENANT,
      updated_at: now
    }
  }
}

export function parseServices(raw: string): ServicesFile {
  return parseServicesUnsafe(raw)
}

function parseServicesUnsafe(raw: string): ServicesFile {
  try {
    const parsed = JSON.parse(raw) as Partial<ServicesFile>

    if (!parsed || !Array.isArray(parsed.services)) {
      return empty()
    }

    const vistos = new Set<string>()
    const services: Service[] = []

    for (const entry of parsed.services) {
      if (!entry || typeof entry.id !== 'string' || typeof entry.name !== 'string') {
        continue
      }

      const chave = `${typeof entry.tenant_id === 'string' ? entry.tenant_id : DEFAULT_TENANT}::${normalizeKey(entry.name)}`

      if (vistos.has(chave)) {
        continue
      }

      vistos.add(chave)
      services.push({
        active: entry.active !== false,
        created_at: typeof entry.created_at === 'number' ? entry.created_at : 0,
        duration_min: typeof entry.duration_min === 'number' && entry.duration_min > 0 ? entry.duration_min : 30,
        id: entry.id,
        name: entry.name,
        notes: typeof entry.notes === 'string' ? entry.notes : '',
        price_cents: typeof entry.price_cents === 'number' && entry.price_cents >= 0 ? entry.price_cents : 0,
        tenant_id: typeof entry.tenant_id === 'string' ? entry.tenant_id : DEFAULT_TENANT,
        updated_at: typeof entry.updated_at === 'number' ? entry.updated_at : 0
      })
    }

    return { schema_version: 1, services }
  } catch {
    return empty()
  }
}

/** Serviços ativos de um tenant, por nome — o que a agenda oferece para escolher. */
export function servicesFor(services: readonly Service[], tenantId: string = DEFAULT_TENANT): Service[] {
  return services
    .filter(service => service.active && service.tenant_id === tenantId)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}

export class ServicesStore {
  constructor(private readonly filePath: string) {}

  /** Fila de escrita (r238): read -> valida -> write nao era serializado. Ver write-queue.ts. */
  private readonly fila = new WriteQueue()

  async list(tenantId: string = DEFAULT_TENANT): Promise<Service[]> {
    return servicesFor((await this.read()).services, tenantId)
  }

  /** Procura por nome (sem acento/caixa) — a agenda recebe texto e precisa do serviço canônico. */
  async findByName(name: string, tenantId: string = DEFAULT_TENANT): Promise<Service | null> {
    const chave = normalizeKey(name)

    return (await this.read()).services.find(s => s.tenant_id === tenantId && normalizeKey(s.name) === chave) ?? null
  }

  async upsert(input: unknown): Promise<{ service: Service; services: Service[] } | { error: string }> {
    return this.fila.serializar(() => this.upsertSerializado(input))
  }

  private async upsertSerializado(input: unknown): Promise<{ service: Service; services: Service[] } | { error: string }> {
    const normalized = normalizeService(input, Date.now())

    if ('error' in normalized) {
      return normalized
    }

    const file = await this.read()
    const service = normalized.service
    const chave = normalizeKey(service.name)
    const conflito = file.services.find(
      s => s.id !== service.id && s.tenant_id === service.tenant_id && normalizeKey(s.name) === chave
    )

    if (conflito) {
      return { error: 'servico_duplicado' }
    }

    const indice = file.services.findIndex(s => s.id === service.id)

    if (indice >= 0) {
      file.services[indice] = { ...service, created_at: file.services[indice]!.created_at }
    } else {
      file.services.push(service)
    }

    await this.write(file)

    return { service, services: await this.list(service.tenant_id) }
  }

  async remove(id: string): Promise<{ services: Service[] } | { error: string }> {
    return this.fila.serializar(() => this.removeSerializado(id))
  }

  private async removeSerializado(id: string): Promise<{ services: Service[] } | { error: string }> {
    const file = await this.read()
    const restante = file.services.filter(s => s.id !== id)

    if (restante.length === file.services.length) {
      return { error: 'servico_nao_encontrado' }
    }

    await this.write({ schema_version: 1, services: restante })

    return { services: await this.list() }
  }

  private async read(): Promise<ServicesFile> {
    try {
      return parseServicesUnsafe(await readFile(this.filePath, 'utf8'))
    } catch {
      return empty()
    }
  }

  private async write(file: ServicesFile): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true })
    const temp = `${this.filePath}.tmp`
    await writeFile(temp, JSON.stringify(file, null, 2), 'utf8')
    await rename(temp, this.filePath)
  }
}
