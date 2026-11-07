import { createHmac } from 'node:crypto'

import { describe, expect, it, vi } from 'vitest'

import type { CrmConversation } from './crm-conversations-store'
import { handleWhatsAppIngest } from './crm-whatsapp-endpoint'

const SEGREDO = 'segredo-de-teste-local'
const TOKEN = 'tok_local_de_teste'
const assinar = (corpo: string) => 'sha256=' + createHmac('sha256', SEGREDO).update(corpo, 'utf8').digest('hex')

const corpoDe = (texto = 'Oi! Vi o anuncio.') =>
  JSON.stringify({
    entry: [
      {
        changes: [
          {
            value: {
              contacts: [{ wa_id: '5511999991111', profile: { name: 'Maria Souza' } }],
              messages: [{ from: '5511999991111', id: 'wamid.ABC123', timestamp: String(Math.floor(Date.now() / 1000)), text: { body: texto } }],
            },
          },
        ],
      },
    ],
  })

function sinkFalso() {
  const dados = new Map<string, CrmConversation>()

  return {
    dados,
    list: vi.fn(async () => [...dados.values()]),
    upsert: vi.fn(async (input: unknown) => {
      const conversa = input as CrmConversation
      dados.set(conversa.id, conversa)

      return { conversation: conversa }
    }),
  }
}

const pedido = (extra: Record<string, unknown> = {}) => {
  const body = corpoDe()

  return {
    appSecret: SEGREDO,
    // r69: now explicito, coerente com o timestamp do payload. Sem ele o frescor usa o relogio
    // do modulo, e o teste fica dependente de timing entre arquivos.
    now: Date.now(),
    body,
    expectedToken: TOKEN,
    headers: { 'x-b3po-token': TOKEN, 'x-hub-signature-256': assinar(body) },
    method: 'POST',
    sink: sinkFalso(),
    ...extra,
    // O cast para o tipo do handler perderia dados, que e o que o teste inspeciona.
  } as Parameters<typeof handleWhatsAppIngest>[0] & { sink: ReturnType<typeof sinkFalso> }
}

describe('handleWhatsAppIngest', () => {
  it('grava com token e assinatura validos', async () => {
    const p = pedido()
    const r = await handleWhatsAppIngest(p)

    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({ ok: true, stored: 1 })
    expect([...p.sink.dados.values()][0].title).toBe('Maria Souza')
  })

  it('SEM token configurado nao atende (fail-closed)', async () => {
    const p = pedido({ expectedToken: null })
    const r = await handleWhatsAppIngest(p)

    expect(r.status).toBe(401)
    expect(r.body).toEqual({ error: 'token_ausente' })
    expect(p.sink.upsert).not.toHaveBeenCalled()
  })

  it('token errado nao chega a tocar no store — loopback nao e autorizacao', async () => {
    const p = pedido({ headers: { 'x-b3po-token': 'outro', 'x-hub-signature-256': assinar(corpoDe()) } })
    const r = await handleWhatsAppIngest(p)

    expect(r.status).toBe(401)
    expect(r.body).toEqual({ error: 'token_invalido' })
    expect(p.sink.list).not.toHaveBeenCalled()
  })

  it('aceita o token pelo header Authorization: Bearer', async () => {
    const body = corpoDe()
    const r = await handleWhatsAppIngest(
      pedido({ headers: { authorization: `Bearer ${TOKEN}`, 'x-hub-signature-256': assinar(body) } })
    )

    expect(r.status).toBe(200)
  })

  it('token certo mas assinatura errada continua 401 — defesa em profundidade', async () => {
    const p = pedido({ headers: { 'x-b3po-token': TOKEN, 'x-hub-signature-256': 'sha256=' + 'a'.repeat(64) } })
    const r = await handleWhatsAppIngest(p)

    expect(r.status).toBe(401)
    expect(r.body).toEqual({ error: 'assinatura_invalida' })
    expect(p.sink.upsert).not.toHaveBeenCalled()
  })

  it('payload ruim e 400 (nao 401): o adapter precisa distinguir para nao repetir em loop', async () => {
    const body = 'nao-e-json'
    const r = await handleWhatsAppIngest(
      pedido({ body, headers: { 'x-b3po-token': TOKEN, 'x-hub-signature-256': assinar(body) } })
    )

    expect(r.status).toBe(400)
    expect(r.body).toEqual({ error: 'json_invalido' })
  })

  it('metodo diferente de POST e 405', async () => {
    const r = await handleWhatsAppIngest(pedido({ method: 'GET' }))

    expect(r.status).toBe(405)
  })

  it('reentrega devolve 200 com duplicated — o adapter nao deve tratar como falha', async () => {
    const p = pedido()
    await handleWhatsAppIngest(p)
    const segunda = await handleWhatsAppIngest(p)

    expect(segunda.status).toBe(200)
    expect(segunda.body).toMatchObject({ duplicated: 1, stored: 0 })
  })
})
