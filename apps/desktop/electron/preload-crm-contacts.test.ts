import { expect, it, vi } from 'vitest'

const host = vi.hoisted(() => ({
  exposeInMainWorld: vi.fn(),
  invoke: vi.fn().mockResolvedValue({ contacts: [] }),
  send: vi.fn(),
  sendSync: vi.fn((): unknown => ({}))
}))

vi.mock('electron', () => ({
  contextBridge: { exposeInMainWorld: host.exposeInMainWorld },
  ipcRenderer: { invoke: host.invoke, send: host.send, sendSync: host.sendSync, on: vi.fn(), removeListener: vi.fn() },
  webFrame: {},
  webUtils: {}
}))

/**
 * O painel do CRM chama `window.hermesDesktop.crmContacts.*`; se o preload não expuser (ou expuser com outro
 * nome de canal), a tela quebra em runtime sem o `tsc` reclamar.
 */
type CrmBridge = {
  list: () => Promise<unknown>
  remove: (phone: string) => Promise<unknown>
  upsert: (payload: unknown) => Promise<unknown>
}

async function crmBridge(): Promise<CrmBridge> {
  await import('./preload')

  const registration = host.exposeInMainWorld.mock.calls.find(([name]): boolean => name === 'hermesDesktop')

  expect(registration).toBeTruthy()

  return (registration![1] as { crmContacts: CrmBridge }).crmContacts
}

it('expõe crmContacts com os três métodos', async () => {
  const bridge = await crmBridge()

  expect(Object.keys(bridge).sort()).toEqual(['list', 'remove', 'upsert'])
})

it('cada método fala com o canal certo', async () => {
  const bridge = await crmBridge()

  await bridge.list()
  expect(host.invoke).toHaveBeenCalledWith('hermes:crm-contacts:list')

  await bridge.upsert({ name: 'Maria' })
  expect(host.invoke).toHaveBeenCalledWith('hermes:crm-contacts:upsert', { name: 'Maria' })

  await bridge.remove('+5511999991111')
  expect(host.invoke).toHaveBeenCalledWith('hermes:crm-contacts:remove', '+5511999991111')
})
