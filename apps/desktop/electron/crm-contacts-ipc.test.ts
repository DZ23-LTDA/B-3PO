import { expect, it, vi } from 'vitest'

import { registerCrmContactsIpc } from './crm-contacts-ipc'

/**
 * A fiação é onde um erro compila e quebra em runtime: handler registrado com outro nome de canal, ou
 * faltando um. Aqui os três canais são exercitados contra um ipcMain falso.
 */
const fakeIpc = () => {
  const handlers = new Map<string, (...args: unknown[]) => unknown>()

  return {
    handlers,
    ipcMain: {
      handle: (channel: string, handler: (...args: unknown[]) => unknown) => {
        handlers.set(channel, handler)
      }
    }
  }
}

const store = (over: Partial<{ list: () => Promise<unknown>; remove: (phone: string) => Promise<unknown>; upsert: (input: unknown) => Promise<unknown> }> = {}) => ({
  list: vi.fn(async () => [{ name: 'Maria', phone: '+5511999991111' }]),
  remove: vi.fn(async (phone: string) => ({ contacts: [], removed: phone })),
  upsert: vi.fn(async () => ({ contacts: [] })),
  ...over
})

it('registra os três canais e delega para o store', async () => {
  const { handlers, ipcMain } = fakeIpc()
  const s = store()

  registerCrmContactsIpc(ipcMain, s as never)

  expect([...handlers.keys()].sort()).toEqual([
    'hermes:crm-contacts:list',
    'hermes:crm-contacts:remove',
    'hermes:crm-contacts:upsert'
  ])

  expect(await handlers.get('hermes:crm-contacts:list')!({})).toEqual({
    contacts: [{ name: 'Maria', phone: '+5511999991111' }]
  })
  expect(s.list).toHaveBeenCalled()

  await handlers.get('hermes:crm-contacts:upsert')!({}, { name: 'João' })
  expect(s.upsert).toHaveBeenCalledWith({ name: 'João' })

  await handlers.get('hermes:crm-contacts:remove')!({}, '+5511888882222')
  expect(s.remove).toHaveBeenCalledWith('+5511888882222')
})

it('remove sem telefone válido não inventa argumento: passa string vazia', async () => {
  const { handlers, ipcMain } = fakeIpc()
  const s = store()

  registerCrmContactsIpc(ipcMain, s as never)

  await handlers.get('hermes:crm-contacts:remove')!({}, 42)
  expect(s.remove).toHaveBeenCalledWith('')
})
