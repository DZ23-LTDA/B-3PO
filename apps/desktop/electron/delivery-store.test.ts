// O store de entregas (r57 do GOAL V2).
//
// A r56 criou a regra. Estes testes provam que ela **atravessa o disco** — e a ligação que a r55 mediu
// faltar: a venda saber que saiu.

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { DeliveryStore, deliveryStorePath, parseDeliveryStore } from './delivery-store'

let dir = ''
let store: DeliveryStore

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'b3po-ent-'))
  store = new DeliveryStore(deliveryStorePath(dir))
})

afterEach(async () => {
  await rm(dir, { force: true, recursive: true })
})

const PEDIDO = { destino: 'Rua A, 10', order_id: 'venda-1' }

describe('o caminho', () => {
  it('grava dentro de b3po/, como os outros stores', () => {
    expect(deliveryStorePath('/x')).toBe(join('/x', 'b3po', 'entregas.json'))
  })

  it('arquivo corrompido vira store vazio, não exceção', () => {
    expect(parseDeliveryStore('{nao e json')).toEqual({ entregas: [], schema_version: 1 })
    expect(parseDeliveryStore('{"entregas":"x"}')).toEqual({ entregas: [], schema_version: 1 })
  })

  it('entrega sem order_id é descartada na leitura — quebraria a ligação com a venda', () => {
    const cru = JSON.stringify({
      entregas: [
        { destino: 'X', id: 'e1', status: 'pendente' },
        { destino: 'Y', id: 'e2', order_id: 'v', status: 'pendente', tenant_id: 'local' }
      ],
      schema_version: 1
    })

    expect(parseDeliveryStore(cru).entregas.map(e => e.id)).toEqual(['e2'])
  })
})

describe('criar', () => {
  it('cria pendente e devolve a lista', async () => {
    const r = await store.criar(PEDIDO)

    expect('entrega' in r && r.entrega.status).toBe('pendente')
    expect(await store.listar()).toHaveLength(1)
  })

  it('a mesma venda não ganha duas entregas', async () => {
    // Duas rotas para a mesma venda deixariam a pergunta "já saiu?" sem resposta.
    await store.criar(PEDIDO)

    expect(await store.criar(PEDIDO)).toEqual({ error: 'entrega_ja_existe' })
    expect(await store.listar()).toHaveLength(1)
  })

  it('sem destino ou sem pedido, recusa', async () => {
    expect(await store.criar({ order_id: 'v' })).toEqual({ error: 'destino_obrigatorio' })
    expect(await store.criar({ destino: 'X' })).toEqual({ error: 'order_obrigatorio' })
  })
})

describe('a ligação com a venda — o que a r55 mediu faltar', () => {
  it('porPedido encontra a entrega daquela venda', async () => {
    await store.criar(PEDIDO)

    const achada = await store.porPedido('venda-1')

    expect(achada?.order_id).toBe('venda-1')
  })

  it('porPedido é null quando a venda não tem entrega', async () => {
    expect(await store.porPedido('venda-sem-entrega')).toBeNull()
  })
})

describe('transitar', () => {
  it('pendente → em_rota → entregue, com comprovante persistido', async () => {
    const criada = await store.criar(PEDIDO)
    const id = 'entrega' in criada ? criada.entrega.id : ''

    await store.transitar({ id, recebedor: 'joao', status: 'em_rota' })

    const entregue = await store.transitar({ id, recebedor: 'maria', status: 'entregue' })

    expect('entrega' in entregue && entregue.entrega.comprovante).toEqual({
      recebido_em: expect.any(Number),
      recebedor: 'maria'
    })

    // E sobrevive a uma instância nova: o ponto é o DISCO.
    const outra = new DeliveryStore(deliveryStorePath(dir))
    const relida = await outra.porPedido('venda-1')

    expect(relida?.status).toBe('entregue')
    expect(relida?.comprovante?.recebedor).toBe('maria')
  })

  it('entregue sem comprovante é recusado pelo store, não só pela função', async () => {
    const criada = await store.criar(PEDIDO)
    const id = 'entrega' in criada ? criada.entrega.id : ''

    await store.transitar({ id, recebedor: 'joao', status: 'em_rota' })

    expect(await store.transitar({ id, status: 'entregue' })).toEqual({ error: 'comprovante_obrigatorio' })
  })

  it('entrega inexistente', async () => {
    expect(await store.transitar({ id: 'nao-existe', status: 'em_rota' })).toEqual({ error: 'entrega_inexistente' })
  })

  it('sem id ou status inválido, recusa antes de tocar no arquivo', async () => {
    expect(await store.transitar({ status: 'em_rota' })).toEqual({ error: 'entrega_obrigatoria' })
    expect(await store.transitar({ id: 'x', status: 'inventado' })).toEqual({ error: 'status_invalido' })
  })
})

describe('as consultas', () => {
  it('pendentes traz o que falta sair', async () => {
    const a = await store.criar({ destino: 'A', order_id: 'v1' })
    await store.criar({ destino: 'B', order_id: 'v2' })

    const idA = 'entrega' in a ? a.entrega.id : ''

    await store.transitar({ id: idA, recebedor: 'joao', status: 'em_rota' })

    const fila = await store.pendentes()

    expect(fila).toHaveLength(2)
    expect(fila.every(e => e.status === 'pendente' || e.status === 'em_rota')).toBe(true)
  })

  it('listar ordena por mais recente', async () => {
    await new DeliveryStore(deliveryStorePath(dir)).criar({ destino: 'A', order_id: 'v1' }, 'local', 1_000)
    await store.criar({ destino: 'B', order_id: 'v2' }, 'local', 2_000)

    expect((await store.listar()).map(e => e.order_id)).toEqual(['v2', 'v1'])
  })

  it('isola por tenant', async () => {
    await store.criar({ destino: 'A', order_id: 'v1' }, 'empresa-a')

    expect(await store.listar('empresa-b')).toHaveLength(0)
  })
})
