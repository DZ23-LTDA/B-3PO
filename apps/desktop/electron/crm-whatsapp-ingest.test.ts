import { createHmac } from 'node:crypto'

import { describe, expect, it, vi } from 'vitest'

import type { CrmConversation } from './crm-conversations-store'
import { ingestMetaWebhook } from './crm-whatsapp-ingest'

const SEGREDO = 'segredo-de-teste-local'
const assinar = (corpo: string) => 'sha256=' + createHmac('sha256', SEGREDO).update(corpo, 'utf8').digest('hex')

const corpoDe = (texto: string, wamid = 'wamid.ABC123', de = '5511999991111') =>
  JSON.stringify({
    entry: [
      {
        changes: [
          {
            value: {
              contacts: [{ wa_id: de, profile: { name: 'Maria Souza' } }],
              messages: [{ from: de, id: wamid, timestamp: String(Math.floor(Date.now() / 1000)), text: { body: texto }, type: 'text' }],
            },
          },
        ],
      },
    ],
  })

/** Store em memoria com a MESMA semantica do real (upsert por id, lista por telefone). */
function sinkFalso(inicial: CrmConversation[] = []) {
  const dados = new Map(inicial.map(c => [c.id, c]))

  return {
    dados,
    list: vi.fn(async () => [...dados.values()]),
    upsert: vi.fn(async (input: unknown) => {
      const conversa = input as CrmConversation
      if (!conversa.id) {
        return { error: 'falta_id' }
      }
      dados.set(conversa.id, conversa)

      return { conversation: conversa }
    }),
  }
}

describe('ingestMetaWebhook', () => {
  it('grava a mensagem numa conversa nova', async () => {
    const corpo = corpoDe('Oi! Vi o anuncio.')
    const sink = sinkFalso()

    const r = await ingestMetaWebhook({ appSecret: SEGREDO, now: Date.now(), rawBody: corpo, signature: assinar(corpo), sink })

    expect(r).toEqual({ duplicated: 0, ignored: 0, stored: 1 })
    const [conversa] = [...sink.dados.values()]
    expect(conversa.title).toBe('Maria Souza')
    expect(conversa.messages).toHaveLength(1)
    expect(conversa.messages[0].external_id).toBe('wamid.ABC123')
  })

  it('REENTREGA do mesmo evento nao duplica mensagem nem mexe na conversa', async () => {
    const corpo = corpoDe('Oi!')
    const sink = sinkFalso()
    const base = { appSecret: SEGREDO, now: Date.now(), rawBody: corpo, signature: assinar(corpo), sink }

    await ingestMetaWebhook(base)
    const depoisDaPrimeira = [...sink.dados.values()][0]

    const segunda = await ingestMetaWebhook(base)

    expect(segunda).toEqual({ duplicated: 1, ignored: 0, stored: 0 })
    const depoisDaSegunda = [...sink.dados.values()][0]
    expect(depoisDaSegunda.messages).toHaveLength(1)
    expect(depoisDaSegunda).toBe(depoisDaPrimeira) // nem reescreveu
  })

  it('segunda mensagem de verdade entra e soma no nao lido', async () => {
    const primeiro = corpoDe('Oi!', 'wamid.1')
    const segundo = corpoDe('Tudo bem?', 'wamid.2')
    const sink = sinkFalso()

    await ingestMetaWebhook({ appSecret: SEGREDO, rawBody: primeiro, signature: assinar(primeiro), sink })
    await ingestMetaWebhook({ appSecret: SEGREDO, rawBody: segundo, signature: assinar(segundo), sink })

    const [conversa] = [...sink.dados.values()]
    expect(conversa.messages.map(m => m.external_id)).toEqual(['wamid.1', 'wamid.2'])
    expect(conversa.unread).toBe(2)
    expect(conversa.last_message_preview).toBe('Tudo bem?')
  })

  it('assinatura invalida NAO toca no store', async () => {
    const corpo = corpoDe('Oi!')
    const sink = sinkFalso()

    const r = await ingestMetaWebhook({ appSecret: SEGREDO, rawBody: corpo, signature: 'sha256=' + 'a'.repeat(64), sink })

    expect(r).toEqual({ error: 'assinatura_invalida' })
    expect(sink.upsert).not.toHaveBeenCalled()
    expect(sink.list).not.toHaveBeenCalled()
  })

  it('sem segredo configurado nao aceita nada (fail-closed)', async () => {
    const corpo = corpoDe('Oi!')
    const sink = sinkFalso()

    const r = await ingestMetaWebhook({ appSecret: null, rawBody: corpo, signature: assinar(corpo), sink })

    expect(r).toEqual({ error: 'segredo_ausente' })
    expect(sink.upsert).not.toHaveBeenCalled()
  })

  it('corpo que nao e JSON devolve erro em vez de excecao', async () => {
    const corpo = 'nao-e-json'
    const sink = sinkFalso()

    const r = await ingestMetaWebhook({ appSecret: SEGREDO, rawBody: corpo, signature: assinar(corpo), sink })

    expect(r).toEqual({ error: 'json_invalido' })
  })

  it('evento de status nao grava nada', async () => {
    const corpo = JSON.stringify({ entry: [{ changes: [{ value: { statuses: [{ id: 'wamid.X', status: 'read' }] } }] }] })
    const sink = sinkFalso()

    const r = await ingestMetaWebhook({ appSecret: SEGREDO, rawBody: corpo, signature: assinar(corpo), sink })

    expect(r).toEqual({ duplicated: 0, ignored: 0, stored: 0 })
    expect(sink.upsert).not.toHaveBeenCalled()
  })

  it('erro do store na gravacao volta como error, sem excecao', async () => {
    const corpo = corpoDe('Oi!')
    const sink = sinkFalso()
    sink.upsert.mockResolvedValueOnce({ error: 'disco_cheio' } as never)

    const r = await ingestMetaWebhook({ appSecret: SEGREDO, rawBody: corpo, signature: assinar(corpo), sink })

    expect(r).toEqual({ error: 'disco_cheio' })
  })
})
