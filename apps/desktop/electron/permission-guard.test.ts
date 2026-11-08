import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { ActorsStore, actorsStorePath, primaryOwner } from './actors-store'
import { guardedHandler, withPermission } from './permission-guard'
import type { Actor, AuditEntry } from './rbac'

const humano = (over: Partial<Actor> = {}): Actor => ({
  id: 'u1',
  kind: 'human',
  level: 'SUPERVISED_AUTONOMY',
  role: 'owner',
  ...over
})

const bot = (over: Partial<Actor> = {}): Actor => ({
  id: 'b1',
  kind: 'bot',
  level: 'EXECUTE_ALLOWED',
  role: 'bot',
  scopes: ['inventory'],
  ...over
})

describe('guarda de permissao', () => {
  it('executa quando autorizado', async () => {
    const r = await withPermission(humano(), 'execute', { resource: 'catalog' }, async () => 'feito')

    expect(r).toBe('feito')
  })

  it('NAO executa o handler quando negado — e devolve motivo', async () => {
    let chamou = false
    const r = await withPermission(
      humano({ level: 'READ', role: 'viewer' }),
      'execute',
      { resource: 'catalog' },
      async () => {
        chamou = true

        return 'nao devia'
      }
    )

    expect(chamou).toBe(false)
    expect(r).toEqual({ error: 'sem_permissao', reason: 'nivel_insuficiente' })
  })

  it('bot nao executa acao humana nem com nivel maximo', async () => {
    let chamou = false
    const r = await withPermission(
      bot({ level: 'SUPERVISED_AUTONOMY' }),
      'settle_real_payment',
      { resource: 'finance' },
      async () => {
        chamou = true

        return 1
      }
    )

    expect(chamou).toBe(false)
    expect(r).toEqual({ error: 'sem_permissao', reason: 'acao_exige_humano' })
  })

  it('bot fora do escopo nao executa', async () => {
    const r = await withPermission(bot(), 'read', { resource: 'finance' }, async () => 'segredo')

    expect(r).toEqual({ error: 'sem_permissao', reason: 'fora_do_escopo' })
  })

  it('audita permitido E negado', async () => {
    const eventos: AuditEntry[] = []
    const opts = { now: () => 500, onAudit: (e: AuditEntry) => eventos.push(e), resource: 'inventory' }

    await withPermission(bot(), 'read', opts, async () => 'ok')
    await withPermission(bot({ level: 'READ' }), 'execute', opts, async () => 'x')

    expect(eventos).toHaveLength(2)
    expect(eventos[0]).toMatchObject({ action: 'read', actorId: 'b1', allowed: true, at: 500 })
    expect(eventos[1]).toMatchObject({ action: 'execute', allowed: false, reason: 'nivel_insuficiente' })
  })

  it('guardedHandler resolve o ator a cada chamada, nao uma vez so', async () => {
    let atual: Actor = humano({ level: 'READ', role: 'viewer' })
    let execucoes = 0

    const handler = guardedHandler(
      () => atual,
      'execute',
      { resource: 'catalog' },
      async () => {
        execucoes += 1

        return 'feito'
      }
    )

    expect(await handler()).toEqual({ error: 'sem_permissao', reason: 'nivel_insuficiente' })
    expect(execucoes).toBe(0)

    // O ator muda (login/troca de papel) e a proxima chamada ja ve o novo.
    atual = humano()

    expect(await handler()).toBe('feito')
    expect(execucoes).toBe(1)
  })
})

describe('store de atores', () => {
  async function withStore<T>(run: (store: ActorsStore) => Promise<T>): Promise<T> {
    const dir = await mkdtemp(join(tmpdir(), 'b3po-actors-'))

    try {
      return await run(new ActorsStore(actorsStorePath(dir)))
    } finally {
      await rm(dir, { force: true, recursive: true })
    }
  }

  it('cria o dono inicial uma unica vez', async () => {
    await withStore(async store => {
      const primeira = await store.ensureOwner()

      expect(primaryOwner(primeira)).not.toBeNull()

      const segunda = await store.ensureOwner()

      expect(segunda.filter(a => a.role === 'owner')).toHaveLength(1)
    })
  })

  it('recusa desativar o ultimo dono', async () => {
    await withStore(async store => {
      const [dono] = await store.ensureOwner()

      expect(await store.deactivate(dono!.id)).toEqual({ error: 'ultimo_dono' })
    })
  })

  it('permite desativar um dono quando ha outro', async () => {
    await withStore(async store => {
      const [dono] = await store.ensureOwner()

      await store.upsert({ kind: 'human', level: 'SUPERVISED_AUTONOMY', name: 'Segundo', role: 'owner' })

      const r = await store.deactivate(dono!.id)

      expect('actors' in r).toBe(true)
      expect((await store.list()).filter(a => a.active && a.role === 'owner')).toHaveLength(1)
    })
  })

  it('exige nome e normaliza campos invalidos para valores seguros', async () => {
    await withStore(async store => {
      expect(await store.upsert({ name: ' ' })).toEqual({ error: 'name_required' })

      const r = await store.upsert({ kind: 'inventado', level: 'DEUS', name: 'X', role: 'imperador' })

      expect('actor' in r).toBe(true)
      if (!('actor' in r)) return

      // Tipo e papel desconhecidos caem no mais restritivo, nunca no mais poderoso.
      expect(r.actor.kind).toBe('human')
      expect(r.actor.role).toBe('viewer')
      expect(r.actor.level).toBeNull()
    })
  })
})
