// Guarda de permissão nos canais de vasilhame e de medidor (r78/r79).
//
// POR QUE ESTE ARQUIVO EXISTE
//
// Os dois canais novos movimentam **patrimônio e dinheiro**: `gas.entregar` põe um casco na casa de
// alguém, `gas.perder` tira do ativo, e `medidores.leitura` grava o número do qual a conta de água vai
// sair. **Nenhum dos três pode ser um `read`.**
//
// E há a distinção que é fácil errar: **ver** quantos cascos existem é operação de balcão (`read`);
// **entregar** não é.
//
// Um bot com escopo em `vendas` não movimenta casco, e um bot com escopo em `gas` não lança leitura de
// água. São recursos separados de propósito.

import { describe, expect, it } from 'vitest'

import type { IpcMainInvokeEvent } from 'electron'

import { registerGasIpc, type GasStoreLike } from './gas-ipc'
import { registerMeterIpc, type MeterStoreLike } from './meter-ipc'
import type { Actor } from './rbac'

type Handler = (event: unknown, ...args: unknown[]) => Promise<unknown>

const DONO: Actor = { id: 'ator-dono', kind: 'human', level: 'EXECUTE_ALLOWED', role: 'owner' }

const LEITOR: Actor = { id: 'ator-leitor', kind: 'human', level: 'READ', role: 'viewer' }

function negado(resposta: unknown): boolean {
  return typeof resposta === 'object' && resposta !== null && (resposta as { error?: string }).error === 'sem_permissao'
}

/** Registra e devolve o mapa de handlers — o mesmo formato que o `ipcMain.handle` usa. */
function registrar<T>(fn: (ipc: { handle: (canal: string, h: Handler) => void }, store: T, deps: { actorOf: () => Promise<Actor | null> }) => void, store: T, actor: Actor | null): Map<string, Handler> {
  const handlers = new Map<string, Handler>()

  fn({ handle: (canal, h) => handlers.set(canal, h) }, store, { actorOf: async () => actor })

  return handlers
}

function gasStoreEspiao() {
  const chamadas: string[] = []

  const store: GasStoreLike = {
    cadastrar: async () => {
      chamadas.push('cadastrar')

      return { saldo: { em_comodato: 0, em_estoque: 1, perdidos: 0, por_tipo: {} }, vasilhame: {} as never }
    },
    devolver: async () => {
      chamadas.push('devolver')

      return { saldo: { em_comodato: 0, em_estoque: 1, perdidos: 0, por_tipo: {} }, vasilhame: {} as never }
    },
    doCliente: async () => {
      chamadas.push('doCliente')

      return []
    },
    entregar: async () => {
      chamadas.push('entregar')

      return { saldo: { em_comodato: 1, em_estoque: 0, perdidos: 0, por_tipo: {} }, vasilhame: {} as never }
    },
    list: async () => {
      chamadas.push('list')

      return []
    },
    perder: async () => {
      chamadas.push('perder')

      return { saldo: { em_comodato: 0, em_estoque: 0, perdidos: 1, por_tipo: {} }, vasilhame: {} as never }
    },
    saldo: async () => {
      chamadas.push('saldo')

      return { em_comodato: 0, em_estoque: 0, perdidos: 0, por_tipo: {} }
    },
  }

  return { chamadas, store }
}

function meterStoreEspiao() {
  const chamadas: string[] = []

  const store: MeterStoreLike = {
    cadastrarMedidor: async () => {
      chamadas.push('cadastrarMedidor')

      return { medidor: {} as never, medidores: [] }
    },
    list: async () => {
      chamadas.push('list')

      return { consumos: [], leituras: [], medidores: [] }
    },
    registrarLeitura: async () => {
      chamadas.push('registrarLeitura')

      return { consumo: {} as never, leitura: {} as never }
    },
  }

  return { chamadas, store }
}

describe('gas: leitura é read, movimentação é execute', () => {
  it('um leitor VÊ o saldo e os vasilhames', async () => {
    const { store, chamadas } = gasStoreEspiao()
    const h = registrar(registerGasIpc, store, LEITOR)

    const r = await h.get('hermes:gas:list')!(null)

    expect(negado(r)).toBe(false)
    expect(chamadas).toContain('list')
  })

  it('um leitor NÃO entrega, devolve, perde nem cadastra', async () => {
    const { store, chamadas } = gasStoreEspiao()
    const h = registrar(registerGasIpc, store, LEITOR)

    for (const canal of ['hermes:gas:cadastrar', 'hermes:gas:entregar', 'hermes:gas:devolver', 'hermes:gas:perder']) {
      expect(negado(await h.get(canal)!(null, 'x', 'y'))).toBe(true)
    }

    // Nada chegou ao store — a recusa é antes do efeito.
    expect(chamadas.filter(c => c !== 'list' && c !== 'saldo')).toEqual([])
  })

  it('o dono executa as quatro movimentações', async () => {
    const { store, chamadas } = gasStoreEspiao()
    const h = registrar(registerGasIpc, store, DONO)

    for (const canal of ['hermes:gas:cadastrar', 'hermes:gas:entregar', 'hermes:gas:devolver', 'hermes:gas:perder']) {
      expect(negado(await h.get(canal)!(null, 'v1', 'c1'))).toBe(false)
    }

    expect(chamadas).toEqual(expect.arrayContaining(['cadastrar', 'entregar', 'devolver', 'perder']))
  })

  it('sem ator, tudo é negado', async () => {
    const { store } = gasStoreEspiao()
    const h = registrar(registerGasIpc, store, null)

    expect(negado(await h.get('hermes:gas:list')!(null))).toBe(true)
    expect(negado(await h.get('hermes:gas:entregar')!(null, 'v1', 'c1'))).toBe(true)
  })

  it('um bot sem escopo em gas não movimenta casco', async () => {
    const bot: Actor = {
      id: 'bot-1',
      kind: 'bot',
      level: 'EXECUTE_ALLOWED',
      role: 'bot',
      scopes: ['vendas'],
    }

    const { store, chamadas } = gasStoreEspiao()
    const h = registrar(registerGasIpc, store, bot)

    expect(negado(await h.get('hermes:gas:entregar')!(null, 'v1', 'c1'))).toBe(true)
    expect(chamadas).not.toContain('entregar')
  })

  it('um bot COM escopo em gas executa', async () => {
    const bot: Actor = { id: 'bot-2', kind: 'bot', level: 'EXECUTE_ALLOWED', role: 'bot', scopes: ['gas'] }

    const { store, chamadas } = gasStoreEspiao()
    const h = registrar(registerGasIpc, store, bot)

    expect(negado(await h.get('hermes:gas:entregar')!(null, 'v1', 'c1'))).toBe(false)
    expect(chamadas).toContain('entregar')
  })
})

describe('medidores: ver consumo é read, lançar leitura é execute', () => {
  it('um leitor VÊ a lista', async () => {
    const { store, chamadas } = meterStoreEspiao()
    const h = registrar(registerMeterIpc, store, LEITOR)

    expect(negado(await h.get('hermes:medidores:list')!(null))).toBe(false)
    expect(chamadas).toContain('list')
  })

  it('um leitor NÃO lança leitura nem cadastra medidor', async () => {
    const { store, chamadas } = meterStoreEspiao()
    const h = registrar(registerMeterIpc, store, LEITOR)

    expect(negado(await h.get('hermes:medidores:leitura')!(null, {}))).toBe(true)
    expect(negado(await h.get('hermes:medidores:cadastrar')!(null, {}))).toBe(true)
    // Nada chegou ao store — a recusa acontece antes do efeito.
    expect(chamadas).toEqual([])
  })

  it('o dono lança leitura', async () => {
    const { store, chamadas } = meterStoreEspiao()
    const h = registrar(registerMeterIpc, store, DONO)

    expect(negado(await h.get('hermes:medidores:leitura')!(null, {}))).toBe(false)
    expect(chamadas).toContain('registrarLeitura')
  })

  it('bot com escopo em gas NÃO lança leitura de água (recursos separados)', async () => {
    const bot: Actor = { id: 'bot-3', kind: 'bot', level: 'EXECUTE_ALLOWED', role: 'bot', scopes: ['gas'] }

    const { store, chamadas } = meterStoreEspiao()
    const h = registrar(registerMeterIpc, store, bot)

    expect(negado(await h.get('hermes:medidores:leitura')!(null, {}))).toBe(true)
    expect(chamadas).not.toContain('registrarLeitura')
  })

  it('sem ator, negado', async () => {
    const { store } = meterStoreEspiao()
    const h = registrar(registerMeterIpc, store, null)

    expect(negado(await h.get('hermes:medidores:list')!(null))).toBe(true)
  })
})

describe('os canais registrados', () => {
  it('gas expõe exatamente 6', () => {
    const h = registrar(registerGasIpc, gasStoreEspiao().store, DONO)

    expect([...h.keys()].sort()).toEqual([
      'hermes:gas:cadastrar',
      'hermes:gas:devolver',
      'hermes:gas:doCliente',
      'hermes:gas:entregar',
      'hermes:gas:list',
      'hermes:gas:perder',
    ])
  })

  it('medidores expõe exatamente 3', () => {
    const h = registrar(registerMeterIpc, meterStoreEspiao().store, DONO)

    expect([...h.keys()].sort()).toEqual([
      'hermes:medidores:cadastrar',
      'hermes:medidores:leitura',
      'hermes:medidores:list',
    ])
  })
})

// O tipo do evento não é usado pelos handlers; um objeto vazio serve.
const _evt: IpcMainInvokeEvent = {} as IpcMainInvokeEvent
void _evt
