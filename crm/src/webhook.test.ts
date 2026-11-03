/**
 * Webhook: assinatura HMAC, handshake e idempotência de evento repetido.
 */
import { describe, expect, it } from 'vitest'

import { consumeOnce, expectedSignature, parseInbound, verifyChallenge, verifySignature } from './webhook'

const SECRET = 'app-secret-de-teste'
const BODY = JSON.stringify({ entry: [] })

describe('verifySignature', () => {
  it('aceita a assinatura correta', () => {
    expect(verifySignature(BODY, expectedSignature(BODY, SECRET), SECRET)).toEqual({ ok: true })
  })

  it('rejeita assinatura errada', () => {
    expect(verifySignature(BODY, 'sha256=deadbeef', SECRET)).toMatchObject({ ok: false, reason: 'bad_signature' })
  })

  it('rejeita header ausente', () => {
    expect(verifySignature(BODY, undefined, SECRET)).toMatchObject({ ok: false, reason: 'missing_signature' })
  })

  it('corpo alterado invalida a assinatura', () => {
    const sig = expectedSignature(BODY, SECRET)
    expect(verifySignature(`${BODY} `, sig, SECRET)).toMatchObject({ ok: false })
  })

  it('segredo diferente falha', () => {
    expect(verifySignature(BODY, expectedSignature(BODY, SECRET), 'outro')).toMatchObject({ ok: false })
  })
})

describe('verifyChallenge', () => {
  it('devolve o challenge com token correto', () => {
    expect(
      verifyChallenge({ 'hub.challenge': 'abc', 'hub.mode': 'subscribe', 'hub.verify_token': 'tok' }, 'tok')
    ).toEqual({ challenge: 'abc', ok: true })
  })

  it('rejeita token errado ou modo diferente', () => {
    expect(verifyChallenge({ 'hub.mode': 'subscribe', 'hub.verify_token': 'x' }, 'tok').ok).toBe(false)
    expect(verifyChallenge({ 'hub.mode': 'unsubscribe', 'hub.verify_token': 'tok' }, 'tok').ok).toBe(false)
  })
})

describe('parseInbound', () => {
  it('extrai texto e timestamp (segundos → ms)', () => {
    const payload = {
      entry: [{ changes: [{ value: { messages: [{ from: '5511999998888', id: 'wamid.1', text: { body: 'oi' }, timestamp: '1700000000' }] } }] }]
    }

    expect(parseInbound(payload)).toEqual([
      { at: 1_700_000_000_000, from: '5511999998888', id: 'wamid.1', text: 'oi', type: 'text' }
    ])
  })

  it('ignora entrada sem id/from e mensagem sem texto', () => {
    const payload = {
      entry: [
        { changes: [{ value: { messages: [{ from: '55', id: 'wamid.2', timestamp: '1700000000' }] } }] },
        { changes: [{ value: { messages: [{ from: '55' }] } }] }
      ]
    }

    const messages = parseInbound(payload)
    expect(messages).toHaveLength(1)
    expect(messages[0]).toMatchObject({ id: 'wamid.2', text: '', type: 'other' })
  })

  it('payload vazio ou estranho devolve lista vazia', () => {
    expect(parseInbound({})).toEqual([])
    expect(parseInbound(null)).toEqual([])
  })
})

describe('consumeOnce', () => {
  const msg = (id: string) => ({ at: 1, from: '55', id, text: 'oi', type: 'text' as const })

  it('evento repetido (reentrega da Meta) não duplica', () => {
    const first = consumeOnce([msg('a'), msg('b')], [])
    expect(first.fresh.map(m => m.id)).toEqual(['a', 'b'])

    const again = consumeOnce([msg('b'), msg('c')], first.seen)
    expect(again.fresh.map(m => m.id)).toEqual(['c'])
    expect(again.seen.sort()).toEqual(['a', 'b', 'c'])
  })

  it('mesmo id em formatos repetidos no mesmo lote entra uma vez', () => {
    const { fresh } = consumeOnce([msg('x'), msg('x')], [])
    expect(fresh).toHaveLength(1)
  })
})
