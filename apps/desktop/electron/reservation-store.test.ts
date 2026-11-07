// O store de reservas (r63 do GOAL V2).
//
// A r62 criou a regra. Estes testes provam que ela atravessa o disco — e a ligação com `faturar`.

import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { PRAZO_PADRAO_MS } from './reservation'
import { ReservationStore, parseReservationStore, reservationStorePath } from './reservation-store'

let dir = ''
let store: ReservationStore

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'b3po-res-'))
  store = new ReservationStore(reservationStorePath(dir))
})

afterEach(async () => {
  await rm(dir, { force: true, recursive: true })
})

const PEDIDO = { product_sku: 'BUJAO', quantity_milli: 10_000, sale_id: 'venda-1' }

describe('o caminho', () => {
  it('grava dentro de b3po/', () => {
    expect(reservationStorePath('/x')).toBe(join('/x', 'b3po', 'reservas.json'))
  })

  it('arquivo corrompido vira store vazio', () => {
    expect(parseReservationStore('{nao e json')).toEqual({ reservas: [], schema_version: 1 })
  })

  it('reserva SEM expires_at é descartada — travaria um produto para sempre', () => {
    const cru = JSON.stringify({
      reservas: [
        { id: 'r1', product_sku: 'B', quantity_milli: 1, sale_id: 'v1', status: 'ativa' },
        { expires_at: 1, id: 'r2', product_sku: 'B', quantity_milli: 1, sale_id: 'v2', status: 'ativa' }
      ],
      schema_version: 1
    })

    expect(parseReservationStore(cru).reservas.map(r => r.id)).toEqual(['r2'])
  })
})

describe('criar', () => {
  it('cria ativa com prazo padrão', async () => {
    const r = await store.criar(PEDIDO)

    expect('reserva' in r && r.reserva.status).toBe('ativa')
    expect('reserva' in r && r.reserva.expires_at).toBeGreaterThan(Date.now() + PRAZO_PADRAO_MS - 5_000)
  })

  it('a mesma venda não ganha duas reservas ativas', async () => {
    await store.criar(PEDIDO)

    expect(await store.criar(PEDIDO)).toEqual({ error: 'reserva_ja_existe' })
  })

  it('sem venda ou sem SKU, recusa', async () => {
    expect(await store.criar({ product_sku: 'B', quantity_milli: 1 })).toEqual({ error: 'sale_obrigatoria' })
    expect(await store.criar({ quantity_milli: 1, sale_id: 'v' })).toEqual({ error: 'sku_obrigatorio' })
  })
})

describe('quanto está reservado — a pergunta que a tela faz', () => {
  it('reservadoDoSku soma as ativas', async () => {
    await store.criar({ ...PEDIDO, sale_id: 'v1', quantity_milli: 10_000 })
    await store.criar({ ...PEDIDO, sale_id: 'v2', quantity_milli: 5_000 })

    expect(await store.reservadoDoSku('BUJAO')).toBe(15_000)
  })

  it('vencida não conta', async () => {
    await store.criar({ ...PEDIDO, sale_id: 'v1' }, 'local', 1_000, 1_000)

    // `expires_at` = 2_000; agora é 3_000.
    expect(await store.reservadoDoSku('BUJAO', 3_000)).toBe(0)
  })

  it('ativas() e vencidas() separam o que ocupa do que precisa de alguém', async () => {
    await store.criar({ ...PEDIDO, sale_id: 'v1' }, 'local', 1_000, 100_000)
    await store.criar({ ...PEDIDO, sale_id: 'v2' }, 'local', 1_000, 1_000)

    expect(await store.ativas('local', 3_000)).toHaveLength(1)
    expect(await store.vencidas('local', 3_000)).toHaveLength(1)
  })
})

describe('a ligação com faturar', () => {
  it('confirmarDaVenda marca a reserva daquela venda', async () => {
    await store.criar(PEDIDO)

    const r = await store.confirmarDaVenda('venda-1')

    expect(r && 'reserva' in r && r.reserva.status).toBe('confirmada')
    // Confirmada não ocupa mais: o estoque sai por outro caminho.
    expect(await store.reservadoDoSku('BUJAO')).toBe(0)
  })

  it('SEM reserva devolve null — e null é SUCESSO, não ausência de resposta', async () => {
    // O balcão vende e entrega no mesmo minuto. Exigir reserva obrigaria toda venda direta a criar uma
    // antes, o que seria cerimônia sem propósito.
    expect(await store.confirmarDaVenda('venda-sem-reserva')).toBeNull()
  })

  it('reserva VENCIDA não é confirmada — o produto já está disponível para outro', async () => {
    await store.criar(PEDIDO, 'local', 1_000, 1_000)

    const r = await store.confirmarDaVenda('venda-1', 3_000)

    // Devolve o erro, e a venda fato continua valendo — o que não vale é a reserva.
    expect(r).toEqual({ error: 'prazo_vencido' })
  })

  it('a reserva confirmada sobrevive a instância nova', async () => {
    await store.criar(PEDIDO)
    await store.confirmarDaVenda('venda-1')

    const outra = new ReservationStore(reservationStorePath(dir))

    expect((await outra.porVenda('venda-1'))?.status).toBe('confirmada')
  })
})

describe('mudar', () => {
  it('ativa → liberada', async () => {
    const criada = await store.criar(PEDIDO)
    const id = 'reserva' in criada ? criada.reserva.id : ''

    const r = await store.mudar({ id, status: 'liberada' })

    expect(r && 'reserva' in r && r.reserva.status).toBe('liberada')
    expect(await store.reservadoDoSku('BUJAO')).toBe(0)
  })

  it('confirmada não volta', async () => {
    const criada = await store.criar(PEDIDO)
    const id = 'reserva' in criada ? criada.reserva.id : ''

    await store.mudar({ id, status: 'confirmada' })

    expect(await store.mudar({ id, status: 'ativa' })).toEqual({ error: 'reserva_ja_finalizada' })
  })

  it('sem id ou status inválido, recusa antes de tocar no arquivo', async () => {
    expect(await store.mudar({ status: 'ativa' })).toEqual({ error: 'reserva_obrigatoria' })
    expect(await store.mudar({ id: 'x', status: 'inventado' })).toEqual({ error: 'status_invalido' })
  })

  it('id inexistente', async () => {
    expect(await store.mudar({ id: 'nao-existe', status: 'liberada' })).toEqual({ error: 'reserva_inexistente' })
  })
})

describe('o que o store NÃO faz', () => {
  it('não libera vencidas sozinho — quem libera é uma pessoa', async () => {
    // Um store que se auto-limpa em `read` esconderia a escrita, e quem depurasse um produto travado não
    // encontraria o que aconteceu.
    await store.criar(PEDIDO, 'local', 1_000, 1_000)

    // Ler não muda nada.
    const vencidas = await store.vencidas('local', 3_000)

    expect(vencidas).toHaveLength(1)
    expect(vencidas[0]?.status).toBe('ativa')

    // E o arquivo continua com a reserva `ativa`.
    const outra = new ReservationStore(reservationStorePath(dir))

    expect((await outra.listar('local'))[0]?.status).toBe('ativa')
  })
})
