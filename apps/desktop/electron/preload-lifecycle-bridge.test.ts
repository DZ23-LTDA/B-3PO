// A ponte do preload para os canais criados nas r190–r191 (rodada 192).
//
// POR QUE ESTE TESTE EXISTE
//
// Um canal registrado no processo principal que o preload nao expoe e um canal que a TELA NAO ALCANCA. O `tsc`
// nao reclama disso: o preload e um objeto literal, e omitir uma chave nao e erro de tipo.
//
// Este e o elo que a r191 declarou faltando: `hermes:hr:offboarding`, `hermes:hr:treinamentos` e
// `hermes:purchases:cotacao` existiam no IPC e nao atravessavam a ponte.

import { expect, it, vi } from 'vitest'

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
  hr: { offboarding: (p: unknown) => Promise<unknown>; treinamentos: (p: unknown) => Promise<unknown> }
  purchases: { cotacao: (p: unknown) => Promise<unknown> }
}

async function ponte(): Promise<Ponte> {
  await import('./preload')

  const registro = host.exposeInMainWorld.mock.calls.find(([nome]): boolean => nome === 'hermesDesktop')

  expect(registro).toBeTruthy()

  return registro![1] as Ponte
}

it('expoe a cotacao de compras', async () => {
  const b = await ponte()

  expect(typeof b.purchases.cotacao).toBe('function')

  await b.purchases.cotacao({ cotacoes: [], quantidade: 1 })

  expect(host.invoke).toHaveBeenCalledWith('hermes:purchases:cotacao', { cotacoes: [], quantidade: 1 })
})

it('expoe o offboarding de RH', async () => {
  const b = await ponte()

  expect(typeof b.hr.offboarding).toBe('function')

  await b.hr.offboarding({ concluidos: [], exigidos: [] })

  expect(host.invoke).toHaveBeenCalledWith('hermes:hr:offboarding', { concluidos: [], exigidos: [] })
})

it('expoe os treinamentos de RH', async () => {
  const b = await ponte()

  expect(typeof b.hr.treinamentos).toBe('function')

  await b.hr.treinamentos({ agora: 1000, treinamentos: [] })

  expect(host.invoke).toHaveBeenCalledWith('hermes:hr:treinamentos', { agora: 1000, treinamentos: [] })
})

it('os tres usam canais DIFERENTES entre si', async () => {
  // Dois metodos apontando para o mesmo canal passariam nos testes acima, cada um isolado.
  const b = await ponte()

  host.invoke.mockClear()
  await b.purchases.cotacao({})
  await b.hr.offboarding({})
  await b.hr.treinamentos({})

  const canais = host.invoke.mock.calls.map(c => c[0])

  expect(new Set(canais).size).toBe(3)
})
