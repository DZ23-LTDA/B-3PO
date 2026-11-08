/**
 * Teste contra o servidor REAL do B-3PO/Hermes.
 *
 * Diferente do teste sobre socket local: aqui o alvo é o servidor de verdade, no endereço que o
 * ambiente informar (`B3PO_LIVE_ORIGIN`). Se não houver servidor no ar, os testes são **pulados** —
 * nunca fingidos como verdes.
 *
 * Rodar: `B3PO_LIVE_ORIGIN=http://127.0.0.1:54686 npx vitest run src/api/rest-client.live.test.ts`
 */

import { describe, expect, it } from 'vitest'

import { RestClient, RestError, SESSION_HEADER } from './rest-client'

const ORIGIN = process.env['B3PO_LIVE_ORIGIN'] ?? ''
const TOKEN = process.env['B3PO_LIVE_TOKEN'] ?? ''
const LIVE = ORIGIN.trim().length > 0
const AUTHED = LIVE && TOKEN.trim().length > 0

describe.skipIf(!LIVE)('servidor real (B3PO_LIVE_ORIGIN)', () => {
  it('/api/health responde e diz se exige token', async () => {
    const client = new RestClient({ origin: ORIGIN })
    const health = await client.health()

    expect(health.ok).toBe(true)
    expect(typeof health.authRequired).toBe('boolean')
    // o servidor vivo informa o commit; não fixamos o valor, só que veio
    expect(health.commit === null || /^[0-9a-f]{7,}$/.test(health.commit)).toBe(true)
  })

  it('/api/status devolve o estado real do gateway', async () => {
    const client = new RestClient({ origin: ORIGIN })
    const status = await client.status()

    expect(typeof status.gatewayRunning).toBe('boolean')
    expect(status.gatewayState === null || status.gatewayState.length > 0).toBe(true)
  })

  it('endpoint protegido sem token responde 401 e vira RestError unauthorized', async () => {
    const client = new RestClient({ origin: ORIGIN })

    await expect(client.get('/api/agents')).rejects.toMatchObject({ failure: 'unauthorized' })
  })

  it('o token viaja no header, nunca na URL', async () => {
    const seen: string[] = []
    const spy: typeof fetch = async (input, init) => {
      seen.push(String(input))
      const headers = (init?.headers ?? {}) as Record<string, string>
      seen.push(JSON.stringify(Object.keys(headers).map(k => k.toLowerCase())))

      return new Response(JSON.stringify({ ok: true, auth_required: false }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      })
    }

    const client = new RestClient({ origin: ORIGIN, token: 'tok-segredo', fetchImpl: spy })
    await client.health()

    expect(seen[0]).not.toContain('tok-segredo')
    expect(seen[1]).toContain(SESSION_HEADER.toLowerCase())
  })

  it('servidor fora do ar vira RestError unreachable (sem travar)', async () => {
    const client = new RestClient({ origin: 'http://127.0.0.1:9', timeoutMs: 1500 })

    await expect(client.health()).rejects.toBeInstanceOf(RestError)
  })
})

describe.skipIf(!AUTHED)('servidor real — endpoints autenticados', () => {
  it('/api/profiles devolve a lista de bots com o token do cofre', async () => {
    const client = new RestClient({ origin: ORIGIN, token: TOKEN })
    const profiles = await client.profiles()

    expect(Array.isArray(profiles)).toBe(true)
    // o perfil de teste sempre existe neste ambiente
    expect(profiles.length).toBeGreaterThan(0)
    expect(profiles[0]?.name.length).toBeGreaterThan(0)
    expect(typeof profiles[0]?.gatewayRunning).toBe('boolean')
  })

  it('sem token o mesmo endpoint recusa (a lista de bots não é pública)', async () => {
    const anonymous = new RestClient({ origin: ORIGIN })

    await expect(anonymous.profiles()).rejects.toMatchObject({ failure: 'unauthorized' })
  })

  it('/api/sessions responde com o token e traz a estrutura de paginação', async () => {
    const client = new RestClient({ origin: ORIGIN, token: TOKEN })
    const payload = await client.get<{ sessions: unknown[]; total: number }>('/api/sessions')

    expect(Array.isArray(payload.sessions)).toBe(true)
    expect(typeof payload.total).toBe('number')
  })
})
