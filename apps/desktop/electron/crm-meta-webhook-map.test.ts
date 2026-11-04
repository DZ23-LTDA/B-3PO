import { describe, expect, it } from 'vitest'

import { parseMetaWebhook } from './crm-meta-webhook-map'

// Payload no formato da Meta Cloud API. O `timestamp` vem em SEGUNDOS; o store trabalha em ms.
const payload = (texto: string, extra: Record<string, unknown> = {}) => ({
  object: 'whatsapp_business_account',
  entry: [
    {
      id: 'WABA_ID',
      changes: [
        {
          field: 'messages',
          value: {
            messaging_product: 'whatsapp',
            contacts: [{ wa_id: '5511999991111', profile: { name: 'Maria Souza' } }],
            messages: [
              {
                from: '5511999991111',
                id: 'wamid.ABC123',
                timestamp: '1793772076',
                text: { body: texto },
                type: 'text',
              },
            ],
            ...extra,
          },
        },
      ],
    },
  ],
})

describe('parseMetaWebhook', () => {
  it('extrai a mensagem com telefone, wamid e timestamp em ms', () => {
    const r = parseMetaWebhook(payload('Oi! Vi o anuncio.'))

    expect('events' in r).toBe(true)
    if (!('events' in r)) return

    expect(r.events).toHaveLength(1)
    const [evento] = r.events
    expect(evento.phone).toBe('+5511999991111')
    expect(evento.externalId).toBe('wamid.ABC123')
    expect(evento.sentAt).toBe(1793772076000)
    expect(evento.conversation.messages[0]).toEqual({
      body: 'Oi! Vi o anuncio.',
      direction: 'entrada',
      external_id: 'wamid.ABC123',
      sent_at: 1793772076000,
    })

    expect(evento.conversation).toMatchObject({
      contact_phone: '+5511999991111',
      last_message_preview: 'Oi! Vi o anuncio.',
      status: 'aberta',
      title: 'Maria Souza',
      unread: 1,
    })
  })

  it('sem nome no perfil, o titulo e o proprio telefone — nao inventa nome', () => {
    const semNome = payload('Oi')
    ;(semNome.entry[0].changes[0].value as { contacts?: unknown }).contacts = []

    const r = parseMetaWebhook(semNome)
    if (!('events' in r)) throw new Error('esperava eventos')

    expect(r.events[0].conversation.title).toBe('+5511999991111')
  })

  it('telefone ja com + nao vira ++', () => {
    const comMais = payload('Oi')
    ;(comMais.entry[0].changes[0].value as { messages: { from: string }[] }).messages[0].from = '+5511999991111'

    const r = parseMetaWebhook(comMais)
    if (!('events' in r)) throw new Error('esperava eventos')

    expect(r.events[0].phone).toBe('+5511999991111')
  })

  it('mensagem sem texto (imagem/audio) e contada como ignorada, nao entra vazia', () => {
    const semTexto = payload('')
    ;(semTexto.entry[0].changes[0].value as { messages: Record<string, unknown>[] }).messages[0].text = undefined

    const r = parseMetaWebhook(semTexto)
    if (!('events' in r)) throw new Error('esperava eventos')

    expect(r.events).toHaveLength(0)
    expect(r.ignored).toBe(1)
  })

  it('evento de status (lido/entregue) nao vira mensagem', () => {
    const soStatus = {
      entry: [{ changes: [{ value: { statuses: [{ id: 'wamid.X', status: 'read' }] } }] }],
    }

    expect(parseMetaWebhook(soStatus)).toEqual({ events: [], ignored: 0 })
  })

  it('payload invalido devolve erro, nao excecao', () => {
    expect(parseMetaWebhook(null)).toEqual({ error: 'payload_invalido' })
    expect(parseMetaWebhook('lixo')).toEqual({ error: 'payload_invalido' })
  })

  it('timestamp ausente usa "agora" em vez de 1970', () => {
    const semTs = payload('Oi')
    ;(semTs.entry[0].changes[0].value as { messages: Record<string, unknown>[] }).messages[0].timestamp = undefined

    const r = parseMetaWebhook(semTs, 1793772000000)
    if (!('events' in r)) throw new Error('esperava eventos')

    expect(r.events[0].sentAt).toBe(1793772000000)
  })

  it('duas entregas do MESMO payload produzem o mesmo external_id (idempotencia a jusante)', () => {
    const a = parseMetaWebhook(payload('Oi'))
    const b = parseMetaWebhook(payload('Oi'))
    if (!('events' in a) || !('events' in b)) throw new Error('esperava eventos')

    expect(a.events[0].externalId).toBe(b.events[0].externalId)
  })
})
