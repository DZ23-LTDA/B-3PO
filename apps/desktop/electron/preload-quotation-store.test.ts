// Cotacao gravada pela ponte e pela API (rodada 200).
//
// A r198 criou o store, a r199 o canal. Faltava a ponte: sem ela o store existia e ninguem alcancava — o mesmo
// defeito da r189, um nivel acima. Este teste fecha o caminho ate `src/api`.

import { afterEach, describe, expect, it, vi } from 'vitest'

const host = vi.hoisted(() => ({
  exposeInMainWorld: vi.fn(),
  invoke: vi.fn().mockResolvedValue({}),
  send: vi.fn(),
  sendSync: vi.fn((): unknown => ({}))
}))

vi.mock('electron', () => ({
  contextBridge: { exposeInMainWorld: host.exposeInMainWorld },
  ipcRenderer: { invoke: host.invoke, send: host.send, sendSync: host.sendSync, on: vi.fn(), removeListener: vi.fn() },
  webFrame: {},
  webUtils: {}
}))

type Ponte = {
  purchases: {
    quotations: (t?: string) => Promise<unknown>
    removeQuotation: (id: string) => Promise<unknown>
    saveQuotation: (p: unknown) => Promise<unknown>
  }
}

async function ponte(): Promise<Ponte> {
  await import('./preload')

  const registro = host.exposeInMainWorld.mock.calls.find(([nome]): boolean => nome === 'hermesDesktop')

  expect(registro).toBeTruthy()

  return registro![1] as Ponte
}

afterEach(() => {
  host.invoke.mockClear()
})

describe('a ponte expoe a cotacao gravada', () => {
  it('quotations usa o canal certo', async () => {
    const b = await ponte()

    await b.purchases.quotations('local')

    expect(host.invoke).toHaveBeenCalledWith('hermes:purchases:quotations', 'local')
  })

  it('saveQuotation usa o canal certo', async () => {
    const b = await ponte()
    const payload = { id: 'c1', supplier_id: 's1' }

    await b.purchases.saveQuotation(payload)

    expect(host.invoke).toHaveBeenCalledWith('hermes:purchases:saveQuotation', payload)
  })

  it('removeQuotation usa o canal certo', async () => {
    const b = await ponte()

    await b.purchases.removeQuotation('c1')

    expect(host.invoke).toHaveBeenCalledWith('hermes:purchases:removeQuotation', 'c1')
  })

  it('os tres usam canais DIFERENTES entre si', async () => {
    // Dois metodos apontando para o mesmo canal passariam nos testes acima, cada um isolado.
    const b = await ponte()

    host.invoke.mockClear()
    await b.purchases.quotations()
    await b.purchases.saveQuotation({})
    await b.purchases.removeQuotation('x')

    const canais = host.invoke.mock.calls.map(c => c[0])

    expect(new Set(canais).size).toBe(3)
  })
})
