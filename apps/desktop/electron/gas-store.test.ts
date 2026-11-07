import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { GasStore, emptyGas, gasSaldo, gasStorePath, parseGasUnsafe, vasilhamesDoCliente } from './gas-store'

/**
 * A vertical de gás/água tem UM invariante que, se quebrar, corrompe o patrimônio em silêncio: **um
 * vasilhame está com no máximo uma pessoa, e o status diz onde ele está**.
 *
 * Sem isso a revenda perde a conta: o casco sai, o estoque baixa, e ninguém sabe que ele precisa
 * voltar. Foi o que a r13 mediu — não faltava tela, faltava modelo.
 */
describe('GasStore', () => {
  let dir: string
  let store: GasStore

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'b3po-gas-'))
    store = new GasStore(gasStorePath(dir))
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('cadastra um vasilhame no estoque, sem cliente', async () => {
    const r = await store.cadastrar({ kind: 'botijao_13' })

    expect('error' in r).toBe(false)

    if ('error' in r) return

    expect(r.vasilhame.status).toBe('estoque')
    expect(r.vasilhame.customer_id).toBeNull()
    expect(r.saldo.em_estoque).toBe(1)
    expect(r.saldo.em_comodato).toBe(0)
  })

  it('entrega move para comodato com o cliente certo', async () => {
    const criado = await store.cadastrar({ kind: 'botijao_13' })

    if ('error' in criado) throw new Error(criado.error)

    const entregue = await store.entregar(criado.vasilhame.id, 'cli-1')

    if ('error' in entregue) throw new Error(entregue.error)

    expect(entregue.vasilhame.status).toBe('comodato')
    expect(entregue.vasilhame.customer_id).toBe('cli-1')
    expect(entregue.vasilhame.delivered_at).toBeGreaterThan(0)
    expect(entregue.saldo.em_estoque).toBe(0)
    expect(entregue.saldo.em_comodato).toBe(1)
  })

  it('entregar duas vezes para o MESMO cliente e idempotente', async () => {
    const criado = await store.cadastrar({ kind: 'botijao_45' })

    if ('error' in criado) throw new Error(criado.error)

    await store.entregar(criado.vasilhame.id, 'cli-1')
    const segunda = await store.entregar(criado.vasilhame.id, 'cli-1')

    expect('error' in segunda).toBe(false)

    if ('error' in segunda) return

    // Nao duplicou posse: continua sendo 1 em comodato, nao 2.
    expect(segunda.saldo.em_comodato).toBe(1)
  })

  it('entregar para OUTRO cliente recusa (ja esta em comodato)', async () => {
    const criado = await store.cadastrar({ kind: 'botijao_13' })

    if ('error' in criado) throw new Error(criado.error)

    await store.entregar(criado.vasilhame.id, 'cli-1')

    const outro = await store.entregar(criado.vasilhame.id, 'cli-2')

    expect('error' in outro).toBe(true)

    if (!('error' in outro)) return

    expect(outro.error).toBe('ja_esta_em_comodato')
  })

  it('devolver volta ao estoque e limpa o cliente', async () => {
    const criado = await store.cadastrar({ kind: 'botijao_13' })

    if ('error' in criado) throw new Error(criado.error)

    await store.entregar(criado.vasilhame.id, 'cli-1')

    const devolvido = await store.devolver(criado.vasilhame.id)

    if ('error' in devolvido) throw new Error(devolvido.error)

    expect(devolvido.vasilhame.status).toBe('estoque')
    expect(devolvido.vasilhame.customer_id).toBeNull()
    expect(devolvido.vasilhame.returned_at).toBeGreaterThan(0)
    expect(devolvido.saldo.em_estoque).toBe(1)
    expect(devolvido.saldo.em_comodato).toBe(0)
  })

  it('devolver um que ja esta no estoque e idempotente, nao erro', async () => {
    const criado = await store.cadastrar({ kind: 'botijao_13' })

    if ('error' in criado) throw new Error(criado.error)

    const devolvido = await store.devolver(criado.vasilhame.id)

    expect('error' in devolvido).toBe(false)
  })

  it('perder tira do saldo e grava o motivo', async () => {
    const criado = await store.cadastrar({ kind: 'botijao_13' })

    if ('error' in criado) throw new Error(criado.error)

    await store.entregar(criado.vasilhame.id, 'cli-1')

    const perdido = await store.perder(criado.vasilhame.id, 'cliente mudou de cidade')

    if ('error' in perdido) throw new Error(perdido.error)

    expect(perdido.vasilhame.status).toBe('perdido')
    expect(perdido.vasilhame.lost_reason).toBe('cliente mudou de cidade')
    expect(perdido.saldo.perdidos).toBe(1)
    expect(perdido.saldo.em_comodato).toBe(0)
    // Um perdido nao esta nem em estoque nem em comodato.
    expect(perdido.saldo.por_tipo.botijao_13).toBeUndefined()
  })

  it('nao deixa um vasilhame perdido ser entregue', async () => {
    const criado = await store.cadastrar({ kind: 'botijao_13' })

    if ('error' in criado) throw new Error(criado.error)

    await store.perder(criado.vasilhame.id, 'sumiu')

    const tentativa = await store.entregar(criado.vasilhame.id, 'cli-1')

    expect('error' in tentativa).toBe(true)

    if (!('error' in tentativa)) return

    expect(tentativa.error).toBe('vasilhame_perdido')
  })

  it('recusa comodato sem cliente (a invariante do patrimonio)', async () => {
    const r = await store.cadastrar({ kind: 'botijao_13', status: 'comodato' })

    expect('error' in r).toBe(true)

    if (!('error' in r)) return

    expect(r.error).toBe('comodato_exige_cliente')
  })

  it('recusa tipo invalido', async () => {
    const r = await store.cadastrar({ kind: 'bicicleta' })

    expect('error' in r).toBe(true)

    if (!('error' in r)) return

    expect(r.error).toBe('tipo_invalido')
  })

  it('lista o que um cliente esta segurando', async () => {
    const a = await store.cadastrar({ kind: 'botijao_13' })
    const b = await store.cadastrar({ kind: 'botijao_45' })

    if ('error' in a || 'error' in b) throw new Error('falhou ao cadastrar')

    await store.entregar(a.vasilhame.id, 'cli-1')
    await store.entregar(b.vasilhame.id, 'cli-2')

    const doCli1 = await store.doCliente('cli-1')

    expect(doCli1).toHaveLength(1)
    expect(doCli1[0]!.kind).toBe('botijao_13')
  })

  it('persiste entre instancias (o dado sobrevive a um restart)', async () => {
    const criado = await store.cadastrar({ kind: 'botijao_p13' })

    if ('error' in criado) throw new Error(criado.error)

    await store.entregar(criado.vasilhame.id, 'cli-9')

    const outra = new GasStore(gasStorePath(dir))
    const [v] = await outra.list()

    expect(v?.customer_id).toBe('cli-9')
    expect(v?.status).toBe('comodato')
  })
})

describe('gasSaldo', () => {
  it('conta por tipo apenas o que nao esta perdido', () => {
    const base = {
      created_at: 1,
      deposit_cents: 0,
      delivered_at: 0,
      kind: 'botijao_13' as const,
      lost_reason: '',
      returned_at: null,
      serial: '',
      tenant_id: 'local',
      updated_at: 1,
    }

    const saldo = gasSaldo([
      { ...base, customer_id: null, id: '1', status: 'estoque' },
      { ...base, customer_id: 'c1', id: '2', status: 'comodato' },
      { ...base, customer_id: 'c1', id: '3', status: 'perdido' },
    ])

    expect(saldo.em_estoque).toBe(1)
    expect(saldo.em_comodato).toBe(1)
    expect(saldo.perdidos).toBe(1)
    expect(saldo.por_tipo.botijao_13).toBe(2)
  })
})

describe('parseGasUnsafe', () => {
  it('arquivo corrompido vira store vazio, nao crash', () => {
    expect(parseGasUnsafe('{ isto nao e json').vasilhames).toEqual([])
    expect(parseGasUnsafe('null').vasilhames).toEqual([])
    expect(parseGasUnsafe('{"vasilhames": "nao e array"}').vasilhames).toEqual([])
  })

  it('descarta entradas sem id e normaliza tipo/status desconhecidos', () => {
    const f = parseGasUnsafe(
      JSON.stringify({
        vasilhames: [
          { id: 'ok', kind: 'botijao_13', status: 'estoque' },
          { kind: 'botijao_13' },
          { id: 'x', kind: 'foguete', status: 'voando' },
        ],
        version: 99,
      })
    )

    expect(f.vasilhames).toHaveLength(2)
    expect(f.vasilhames.find(v => v.id === 'x')?.kind).toBe('outro')
    expect(f.vasilhames.find(v => v.id === 'x')?.status).toBe('estoque')
  })

  it('emptyGas tem a forma esperada', () => {
    expect(emptyGas()).toEqual({ schema_version: 1, vasilhames: [] })
  })
})

describe('vasilhamesDoCliente', () => {
  it('so devolve o que esta em comodato com aquele cliente', () => {
    const base = {
      created_at: 1,
      deposit_cents: 0,
      delivered_at: 0,
      kind: 'botijao_13' as const,
      lost_reason: '',
      returned_at: null,
      serial: '',
      tenant_id: 'local',
      updated_at: 1,
    }

    const lista = vasilhamesDoCliente(
      [
        { ...base, customer_id: 'c1', id: '1', status: 'comodato' },
        { ...base, customer_id: 'c1', id: '2', status: 'perdido' },
        { ...base, customer_id: 'c2', id: '3', status: 'comodato' },
      ],
      'c1'
    )

    expect(lista).toHaveLength(1)
    expect(lista[0]!.id).toBe('1')
  })
})
