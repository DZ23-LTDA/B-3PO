import { afterEach, describe, expect, it, vi } from 'vitest'

import type { CrmConversation } from './crm-conversations-store'
import { ingestEnabled, maybeStartWhatsAppIngest } from './crm-whatsapp-boot'
import type { ListenerHandle } from './crm-whatsapp-listener'

const sink = () => ({
  list: vi.fn(async () => [] as CrmConversation[]),
  upsert: vi.fn(async () => ({ error: 'nao_deveria_gravar' })),
})

let aberto: ListenerHandle | null = null

afterEach(async () => {
  if (aberto) {
    await aberto.close()
    aberto = null
  }
})

describe('ingestEnabled', () => {
  it('so liga com o opt-in explicito', () => {
    expect(ingestEnabled({ HERMES_DESKTOP_WHATSAPP_INGEST: '1' })).toBe(true)
    expect(ingestEnabled({ HERMES_DESKTOP_WHATSAPP_INGEST: '0' })).toBe(false)
    expect(ingestEnabled({ HERMES_DESKTOP_WHATSAPP_INGEST: 'true' })).toBe(false)
    expect(ingestEnabled({})).toBe(false)
  })
})

describe('maybeStartWhatsAppIngest', () => {
  it('desligado nao abre porta', async () => {
    expect(await maybeStartWhatsAppIngest({ appSecret: 's', enabled: false, sink: sink(), token: 't' })).toBeNull()
  })

  it('sem token nao abre porta (fail-closed)', async () => {
    expect(await maybeStartWhatsAppIngest({ appSecret: 's', enabled: true, sink: sink(), token: null })).toBeNull()
  })

  it('sem segredo da Meta nao abre porta', async () => {
    expect(await maybeStartWhatsAppIngest({ appSecret: undefined, enabled: true, sink: sink(), token: 't' })).toBeNull()
  })

  it('sem porta configurada NAO sobe — porta aleatoria seria listener inutil', async () => {
    expect(await maybeStartWhatsAppIngest({ appSecret: 'segredo', enabled: true, sink: sink(), token: 'tok' })).toBeNull()
    expect(
      await maybeStartWhatsAppIngest({ appSecret: 'segredo', enabled: true, port: 0, sink: sink(), token: 'tok' })
    ).toBeNull()
    expect(
      await maybeStartWhatsAppIngest({ appSecret: 'segredo', enabled: true, port: 70000, sink: sink(), token: 'tok' })
    ).toBeNull()
  })

  it('sobe na porta configurada, que e a mesma que a ponte usa', async () => {
    const porta = 9200 + Math.floor(Math.random() * 500)
    aberto = await maybeStartWhatsAppIngest({
      appSecret: 'segredo',
      enabled: true,
      port: porta,
      sink: sink(),
      token: 'tok',
    })

    expect(aberto?.port).toBe(porta)
  })
})
