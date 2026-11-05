import { createHmac } from 'node:crypto'

import { afterEach, describe, expect, it, vi } from 'vitest'

import type { CrmConversation } from './crm-conversations-store'
import { startWhatsAppListener, type ListenerHandle } from './crm-whatsapp-listener'

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

let aberto: ListenerHandle | null = null

afterEach(async () => {
  if (aberto) {
    await aberto.close()
    aberto = null
  }
})

const subir = async (extra: Record<string, unknown> = {}) => {
  const sink = sinkFalso()
  aberto = await startWhatsAppListener({ appSecret: SEGREDO, sink, token: TOKEN, ...extra })

  return { sink, url: `http://127.0.0.1:${aberto.port}/` }
}

describe('startWhatsAppListener', () => {
  it('aceita o repasse e grava no store (socket real em loopback)', async () => {
    const { sink, url } = await subir()
    const body = corpoDe()

    const r = await fetch(url, {
      body,
      headers: { 'content-type': 'application/json', 'x-b3po-token': TOKEN, 'x-hub-signature-256': assinar(body) },
      method: 'POST',
    })

    expect(r.status).toBe(200)
    expect(await r.json()).toMatchObject({ ok: true, stored: 1 })
    expect([...sink.dados.values()][0].title).toBe('Maria Souza')
  })

  it('sem token devolve 401 e nao grava', async () => {
    const { sink, url } = await subir()
    const body = corpoDe()

    const r = await fetch(url, {
      body,
      headers: { 'content-type': 'application/json', 'x-hub-signature-256': assinar(body) },
      method: 'POST',
    })

    expect(r.status).toBe(401)
    expect(sink.upsert).not.toHaveBeenCalled()
  })

  it('GET devolve 405', async () => {
    const { url } = await subir()

    expect((await fetch(url)).status).toBe(405)
  })

  it('corpo maior que o limite devolve 413 sem chamar o store', async () => {
    const { sink, url } = await subir()
    const gigante = 'x'.repeat(1024 * 1024 + 10)

    const r = await fetch(url, {
      body: gigante,
      headers: { 'x-b3po-token': TOKEN },
      method: 'POST',
    })

    expect(r.status).toBe(413)
    expect(sink.upsert).not.toHaveBeenCalled()
  })

  it('reentrega pelo socket tambem devolve 200 com duplicated', async () => {
    const { url } = await subir()
    const body = corpoDe()
    const enviar = () =>
      fetch(url, {
        body,
        headers: { 'x-b3po-token': TOKEN, 'x-hub-signature-256': assinar(body) },
        method: 'POST',
      })

    await enviar()
    const segunda = await enviar()

    expect(segunda.status).toBe(200)
    expect(await segunda.json()).toMatchObject({ duplicated: 1, stored: 0 })
  })

  it('escuta em 127.0.0.1, nao em 0.0.0.0', async () => {
    const { url } = await subir()

    expect(url.startsWith('http://127.0.0.1:')).toBe(true)
  })
})
