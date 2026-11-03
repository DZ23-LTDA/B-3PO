/**
 * Sessão do mobile: grava só o necessário no cofre, e o logout diz a verdade sobre a revogação.
 */
import { describe, expect, it } from 'vitest'

import { memoryStorage, revokeAndLogout, SessionStore, type SessionCredentials } from './session'

const credentials: SessionCredentials = {
  deviceId: 'device-1',
  gatewayUrl: 'wss://gateway.example/hermes',
  token: 'tok-abc'
}

describe('SessionStore', () => {
  it('grava e recupera a sessão', async () => {
    const storage = memoryStorage()
    const store = new SessionStore(storage)

    await store.save(credentials)

    await expect(store.load()).resolves.toEqual(credentials)
    // nada além dos três campos vai para o cofre
    const raw = storage.dump()['b3po.session'] as string
    expect(Object.keys(JSON.parse(raw)).sort()).toEqual(['deviceId', 'gatewayUrl', 'token'])
  })

  it('recusa credencial incompleta em vez de gravar sessão quebrada', async () => {
    const store = new SessionStore(memoryStorage())

    await expect(store.save({ ...credentials, token: '' })).rejects.toThrow(/incompleta/)
    await expect(store.save({ ...credentials, gatewayUrl: 'http://x' })).rejects.toThrow(/ws:\/\//)
  })

  it('registro corrompido não vira sessão', async () => {
    const storage = memoryStorage()
    await storage.set('b3po.session', '{isso não é json')
    await expect(new SessionStore(storage).load()).resolves.toBeNull()

    await storage.set('b3po.session', JSON.stringify({ token: 'só token' }))
    await expect(new SessionStore(storage).load()).resolves.toBeNull()
  })

  it('logout limpa o cofre', async () => {
    const store = new SessionStore(memoryStorage())
    await store.save(credentials)
    await store.logout()

    await expect(store.load()).resolves.toBeNull()
  })
})

describe('revokeAndLogout', () => {
  it('revoga no gateway e limpa localmente', async () => {
    const store = new SessionStore(memoryStorage())
    await store.save(credentials)
    const seen: SessionCredentials[] = []

    const outcome = await revokeAndLogout(store, async creds => {
      seen.push(creds)
    })

    expect(seen).toEqual([credentials])
    expect(outcome).toEqual({ localCleared: true, remoteRevoked: true })
    await expect(store.load()).resolves.toBeNull()
  })

  it('falha de rede não deixa o usuário preso logado, e reporta a revogação pendente', async () => {
    const store = new SessionStore(memoryStorage())
    await store.save(credentials)

    const outcome = await revokeAndLogout(store, async () => {
      throw new Error('offline')
    })

    expect(outcome).toEqual({ localCleared: true, remoteRevoked: false })
    await expect(store.load()).resolves.toBeNull()
  })

  it('sem sessão, não chama o gateway', async () => {
    const store = new SessionStore(memoryStorage())
    let called = false

    const outcome = await revokeAndLogout(store, async () => {
      called = true
    })

    expect(called).toBe(false)
    expect(outcome).toEqual({ localCleared: true, remoteRevoked: false })
  })
})
