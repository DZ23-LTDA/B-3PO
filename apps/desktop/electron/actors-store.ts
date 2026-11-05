// Atores do sistema, no disco do usuário.
//
// `rbac.ts` decide; este arquivo guarda **quem** existe. Sem atores persistidos, a política seria
// aplicada contra um ator inventado a cada chamada.
//
// Duas regras que evitam o estado inválido clássico:
// - não se remove o último dono ativo: sistema sem dono não tem quem conceda permissão depois;
// - nível e escopo de bot só sobem por concessão registrada (`canGrantLevel`), nunca por edição
//   direta do campo.

import { WriteQueue } from './write-queue'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import type { Actor, ActorKind, Level, Role } from './rbac'

export interface StoredActor extends Actor {
  active: boolean
  created_at: number
  name: string
  updated_at: number
}

export interface ActorsFile {
  actors: StoredActor[]
  schema_version: 1
}

function empty(): ActorsFile {
  return { actors: [], schema_version: 1 }
}

export function actorsStorePath(userDataDir: string): string {
  return join(userDataDir, 'b3po', 'actors.json')
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function normalizeActor(input: unknown, now: number): { error: string } | { actor: StoredActor } {
  const raw = (input ?? {}) as Record<string, unknown>
  const id = text(raw['id'])
  const name = text(raw['name'])

  if (!name) {
    return { error: 'name_required' }
  }

  const kind: ActorKind = raw['kind'] === 'bot' ? 'bot' : 'human'
  const role: Role = raw['role'] === 'bot' ? 'bot' : raw['role'] === 'owner' ? 'owner' : raw['role'] === 'manager' ? 'manager' : raw['role'] === 'operator' ? 'operator' : 'viewer'
  const levelRaw = raw['level']
  const level: Level | null =
    levelRaw === 'READ' || levelRaw === 'RECOMMEND' || levelRaw === 'PREPARE' || levelRaw === 'EXECUTE_ALLOWED' || levelRaw === 'SUPERVISED_AUTONOMY'
      ? levelRaw
      : null
  const scopes = Array.isArray(raw['scopes']) ? raw['scopes'].filter((s): s is string => typeof s === 'string') : []

  return {
    actor: {
      active: raw['active'] === undefined ? true : raw['active'] === true,
      created_at: typeof raw['created_at'] === 'number' ? raw['created_at'] : now,
      id: id || `act_${now}_${Math.random().toString(36).slice(2, 8)}`,
      kind,
      level,
      name,
      role,
      scopes,
      updated_at: now
    }
  }
}

export function parseActors(raw: string): ActorsFile {
  try {
    const parsed = JSON.parse(raw) as Partial<ActorsFile>

    if (!parsed || !Array.isArray(parsed.actors)) {
      return empty()
    }

    return {
      actors: parsed.actors.filter(entry => !!entry && typeof entry.id === 'string' && typeof entry.name === 'string'),
      schema_version: 1
    }
  } catch {
    return empty()
  }
}

/** O dono ativo com maior nível — quem o processo principal usa quando não há sessão de usuário. */
export function primaryOwner(actors: readonly StoredActor[]): StoredActor | null {
  return actors.find(actor => actor.active && actor.kind === 'human' && actor.role === 'owner') ?? null
}

export class ActorsStore {
  constructor(private readonly filePath: string) {}

  /** Fila de escrita (r238): read -> valida -> write nao era serializado. Ver write-queue.ts. */
  private readonly fila = new WriteQueue()

  async list(): Promise<StoredActor[]> {
    const file = await this.read()

    return [...file.actors].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  }

  async upsert(input: unknown): Promise<{ actors: StoredActor[]; actor: StoredActor } | { error: string }> {
    return this.fila.serializar(() => this.upsertSerializado(input))
  }

  private async upsertSerializado(input: unknown): Promise<{ actors: StoredActor[]; actor: StoredActor } | { error: string }> {
    const normalized = normalizeActor(input, Date.now())

    if ('error' in normalized) {
      return normalized
    }

    const file = await this.read()
    const actor = normalized.actor
    const indice = file.actors.findIndex(entry => entry.id === actor.id)

    if (indice >= 0) {
      file.actors[indice] = { ...actor, created_at: file.actors[indice]!.created_at }
    } else {
      file.actors.push(actor)
    }

    await this.write(file)

    return { actor, actors: await this.list() }
  }

  /** Desativa. Recusa quando tiraria o último dono ativo — sistema sem dono não tem quem reconceda. */
  async deactivate(id: string): Promise<{ actors: StoredActor[] } | { error: string }> {
    return this.fila.serializar(() => this.deactivateSerializado(id))
  }

  private async deactivateSerializado(id: string): Promise<{ actors: StoredActor[] } | { error: string }> {
    const file = await this.read()
    const indice = file.actors.findIndex(entry => entry.id === id)

    if (indice < 0) {
      return { error: 'ator_nao_encontrado' }
    }

    const alvo = file.actors[indice]!

    if (alvo.role === 'owner' && alvo.kind === 'human' && alvo.active) {
      const outrosDonos = file.actors.filter(
        entry => entry.id !== alvo.id && entry.active && entry.kind === 'human' && entry.role === 'owner'
      )

      if (outrosDonos.length === 0) {
        return { error: 'ultimo_dono' }
      }
    }

    file.actors[indice] = { ...alvo, active: false, updated_at: Date.now() }
    await this.write(file)

    return { actors: await this.list() }
  }

  /**
   * Cria o dono inicial na primeira execução.
   *
   * Só acontece quando não há nenhum ator humano com papel `owner` — depois disso, conceder acesso é
   * decisão de quem já é dono.
   */
  async ensureOwner(): Promise<StoredActor[]> {
    return this.fila.serializar(() => this.ensureOwnerSerializado())
  }

  private async ensureOwnerSerializado(): Promise<StoredActor[]> {
    const file = await this.read()

    if (primaryOwner(file.actors)) {
      return this.list()
    }

    const now = Date.now()

    file.actors.push({
      active: true,
      created_at: now,
      id: `act_owner_${now}`,
      kind: 'human',
      level: 'SUPERVISED_AUTONOMY',
      name: 'Proprietário',
      role: 'owner',
      scopes: [],
      updated_at: now
    })
    await this.write(file)

    return this.list()
  }

  private async read(): Promise<ActorsFile> {
    try {
      return parseActors(await readFile(this.filePath, 'utf8'))
    } catch {
      return empty()
    }
  }

  private async write(file: ActorsFile): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true })
    const temp = `${this.filePath}.tmp`
    await writeFile(temp, JSON.stringify(file, null, 2), 'utf8')
    await rename(temp, this.filePath)
  }
}
