// O FLUXO COMPLETO DE VENDA (r61 do GOAL V2).
//
// POR QUE ESTE ARQUIVO EXISTE
//
// A r45 fez isto para Compras e **encontrou** o que faltava. O §26 pede o mesmo para Venda:
//
//   "produto -> canal -> pedido -> reserva -> pagamento confirmado -> expedicao -> entrega ->
//    financeiro -> auditoria."
//
// O §17 diz: *"expandir **depois** de comprovar fluxo ponta a ponta"*. A r60 completou a entrega; este
// teste responde **se ela se conecta com a venda** — e não presume.
//
// O QUE ELE USA
//
// Stores reais em disco temporário e os canais reais. Um mock aqui provaria que o mock funciona.

import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { AuditStore, auditStorePath, configurarColetorDeAuditoria } from './audit-store'
import { DeliveryStore, deliveryStorePath } from './delivery-store'
import { FinanceStore, financeStorePath } from './finance-store'
import { InventoryStore, inventoryStorePath } from './inventory-store'
import type { Actor } from './rbac'
import { SalesStore, salesStorePath } from './sales-store'
import { ReservationStore, reservationStorePath } from './reservation-store'
import { registerSalesIpc } from './sales-ipc'

let dir = ''

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'b3po-venda-'))
  await mkdir(join(dir, 'b3po'), { recursive: true })
})

afterEach(async () => {
  configurarColetorDeAuditoria(null)
  await rm(dir, { force: true, recursive: true })
})

const DONO: Actor = { id: 'dono', kind: 'human', level: 'EXECUTE_ALLOWED', role: 'owner' }

interface Montagem {
  auditoria: AuditStore
  chamar: (canal: string, payload?: unknown) => Promise<Record<string, unknown>>
  entrega: DeliveryStore
  finance: FinanceStore
  inventory: InventoryStore
  sales: SalesStore
}

function montar(): Montagem {
  const mapa = new Map<string, (e: unknown, p: unknown) => Promise<unknown>>()
  const auditoria = new AuditStore(auditStorePath(dir))
  const sales = new SalesStore(salesStorePath(dir))
  const delivery = new DeliveryStore(deliveryStorePath(dir))
  const finance = new FinanceStore(financeStorePath(dir))
  const inventory = new InventoryStore(inventoryStorePath(dir))

  configurarColetorDeAuditoria(auditoria)

  registerSalesIpc(
    { handle: (c: string, l: (e: unknown, p: unknown) => Promise<unknown>) => mapa.set(c, l) } as never,
    { actorOf: async () => DONO, finance, inventory, sales } as never
  )

  return {
    auditoria,
    async chamar(canal, payload) {
      const h = mapa.get(canal)

      if (!h) throw new Error(`canal nao registrado: ${canal}`)

      return (await h(null, payload)) as Record<string, unknown>
    },
    entrega: delivery,
    finance,
    inventory,
    sales
  }
}

const drenar = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 60))

describe('o fluxo de venda, de ponta a ponta', () => {
  it('estoque entra → venda → faturamento → estoque sai → financeiro', async () => {
    const m = montar()

    // ── 1. PRODUTO / ESTOQUE ─────────────────────────────────────────────────────────────────────
    // A mercadoria precisa existir antes de ser vendida. Entra pelo mesmo ledger que a compra usa.
    await m.inventory.append({
      kind: 'entrada',
      product_sku: 'BUJAO-13',
      quantity_milli: 100_000,
      reason: 'carga inicial',
      ref: 'inicial:BUJAO-13',
      tenant_id: 'local'
    })

    const saldoInicial = (await m.inventory.balances())['BUJAO-13'] ?? 0

    expect(saldoInicial).toBe(100_000)

    // ── 2. VENDA ─────────────────────────────────────────────────────────────────────────────────
    const criada = await m.chamar('hermes:sales:faturar', {
      items: [{ product_sku: 'BUJAO-13', quantity_milli: 10_000, unit_price_cents: 12_000 }],
      party: 'cliente-1'
    })

    expect(criada['error']).toBeUndefined()

    const venda = criada['sale'] as { id: string; number: number; total_cents: number }

    // ── 3. ESTOQUE SAIU ──────────────────────────────────────────────────────────────────────────
    // O §26 tem "reserva" antes do pagamento. O produto **não tem reserva**: o estoque sai no
    // faturamento. Isso é uma diferença real contra o §26, e o teste a registra em vez de escondê-la.
    const saldoDepois = (await m.inventory.balances())['BUJAO-13'] ?? 0

    expect(saldoDepois).toBe(90_000)

    // ── 4. FINANCEIRO ────────────────────────────────────────────────────────────────────────────
    const contas = await m.finance.list()
    const aReceber = contas.find(c => c.kind === 'receber' && c.ref.includes(venda.id))

    expect(aReceber).toBeDefined()
    expect(aReceber?.amount_cents).toBe(venda.total_cents)

    // ── 5. AUDITORIA ─────────────────────────────────────────────────────────────────────────────
    await drenar()

    const { entries } = await m.auditoria.listar()

    expect(entries.some(e => e.resource === 'sales' && e.allowed)).toBe(true)
  })

  it('a venda faturada é imutável — reescrever apagaria o que o cliente já recebeu', async () => {
    const m = montar()

    await m.inventory.append({
      kind: 'entrada',
      product_sku: 'X',
      quantity_milli: 10_000,
      reason: 'carga',
      ref: 'inicial:X',
      tenant_id: 'local'
    })

    const criada = await m.chamar('hermes:sales:faturar', {
      items: [{ product_sku: 'X', quantity_milli: 1_000, unit_price_cents: 100 }],
      party: 'c1'
    })

    const venda = criada['sale'] as { id: string }

    // Faturar de novo não pode mudar a venda já faturada.
    const denovo = await m.chamar('hermes:sales:faturar', {
      id: venda.id,
      items: [{ product_sku: 'X', quantity_milli: 5_000, unit_price_cents: 100 }],
      party: 'c1'
    })

    expect(denovo['error']).toBe('venda_faturada_imutavel')
  })
})

describe('a entrega se liga à venda — o que a r55 mediu faltar', () => {
  it('a venda faturada pode ser entregue, e a entrega aponta para ela', async () => {
    const m = montar()

    await m.inventory.append({
      kind: 'entrada',
      product_sku: 'Y',
      quantity_milli: 10_000,
      reason: 'carga',
      ref: 'inicial:Y',
      tenant_id: 'local'
    })

    const criada = await m.chamar('hermes:sales:faturar', {
      items: [{ product_sku: 'Y', quantity_milli: 1_000, unit_price_cents: 100 }],
      party: 'c1'
    })

    const venda = criada['sale'] as { id: string }

    // A entrega usa o MESMO id da venda — é a ligação que a r57 criou com `porPedido`.
    const entrega = await m.entrega.criar({ destino: 'Rua A, 10', order_id: venda.id })

    expect('error' in entrega).toBe(false)

    const achada = await m.entrega.porPedido(venda.id)

    expect(achada?.order_id).toBe(venda.id)
    expect(achada?.status).toBe('pendente')
  })

  it('a entrega anda até o comprovante, e ele fica no disco', async () => {
    const m = montar()

    await m.inventory.append({
      kind: 'entrada',
      product_sku: 'Z',
      quantity_milli: 10_000,
      reason: 'carga',
      ref: 'inicial:Z',
      tenant_id: 'local'
    })

    const criada = await m.chamar('hermes:sales:faturar', {
      items: [{ product_sku: 'Z', quantity_milli: 1_000, unit_price_cents: 100 }],
      party: 'c1'
    })

    const venda = criada['sale'] as { id: string }
    const entrega = await m.entrega.criar({ destino: 'Rua B', order_id: venda.id })
    const id = 'entrega' in entrega ? entrega.entrega.id : ''

    await m.entrega.transitar({ id, recebedor: 'joao', status: 'em_rota' })
    await m.entrega.transitar({ id, recebedor: 'maria', status: 'entregue' })

    // Instância nova: o ponto é o DISCO.
    const outra = new DeliveryStore(deliveryStorePath(dir))
    const relida = await outra.porPedido(venda.id)

    expect(relida?.status).toBe('entregue')
    expect(relida?.comprovante?.recebedor).toBe('maria')
  })
})

describe('o que o fluxo de venda NÃO tem, e o §26 pede', () => {
  it('não há RESERVA: o estoque sai no faturamento, não no pagamento', async () => {
    // O §26: "produto -> canal -> pedido -> RESERVA -> pagamento confirmado -> expedicao -> entrega".
    //
    // O produto **não tem reserva**: faturar baixa o estoque imediatamente, e não há campo de quantidade
    // reservada. Este teste **registra a diferença** em vez de fingir que ela não existe.
    const m = montar()

    await m.inventory.append({
      kind: 'entrada',
      product_sku: 'R',
      quantity_milli: 10_000,
      reason: 'carga',
      ref: 'inicial:R',
      tenant_id: 'local'
    })

    await m.chamar('hermes:sales:faturar', {
      items: [{ product_sku: 'R', quantity_milli: 1_000, unit_price_cents: 100 }],
      party: 'c1'
    })

    // Saiu na hora: não há "reservado" separado de "disponível".
    expect((await m.inventory.balances())['R'] ?? 0).toBe(9_000)
  })
})
describe('a venda consome a reserva (r64)', () => {
  it('faturar confirma a reserva daquela venda — a promessa vira fato', async () => {
    const mapa = new Map<string, (e: unknown, p: unknown) => Promise<unknown>>()
    const sales = new SalesStore(salesStorePath(dir))
    const reservation = new ReservationStore(reservationStorePath(dir))
    const finance = new FinanceStore(financeStorePath(dir))
    const inventory = new InventoryStore(inventoryStorePath(dir))

    registerSalesIpc(
      { handle: (c: string, l: (e: unknown, p: unknown) => Promise<unknown>) => mapa.set(c, l) } as never,
      { actorOf: async () => DONO, finance, inventory, reservations: reservation, sales } as never
    )

    const chamar = async (canal: string, payload?: unknown): Promise<Record<string, unknown>> =>
      (await mapa.get(canal)?.(null, payload)) as Record<string, unknown>

    await inventory.append({
      kind: 'entrada',
      product_sku: 'W',
      quantity_milli: 10_000,
      reason: 'carga',
      ref: 'inicial:W',
      tenant_id: 'local'
    })

    // A reserva existe ANTES da venda — é ela que segura o produto para este cliente.
    const r = await reservation.criar({ product_sku: 'W', quantity_milli: 1_000, sale_id: 'venda-r' }, 'local')

    expect('error' in r).toBe(false)

    // A venda é faturada com o MESMO id.
    const criada = await chamar('hermes:sales:faturar', {
      id: 'venda-r',
      items: [{ product_sku: 'W', quantity_milli: 1_000, unit_price_cents: 100 }],
      party: 'c1'
    })

    expect(criada['error']).toBeUndefined()

    // E a reserva virou `confirmada` — sem isto ela venceria sozinha e o produto ficaria prometido.
    const depois = await reservation.porVenda('venda-r')

    expect(depois?.status).toBe('confirmada')
  })

  it('faturar SEM reserva continua funcionando — o balcão não é obrigado a reservar', async () => {
    const m = montar()

    await m.inventory.append({
      kind: 'entrada',
      product_sku: 'V',
      quantity_milli: 10_000,
      reason: 'carga',
      ref: 'inicial:V',
      tenant_id: 'local'
    })

    const criada = await m.chamar('hermes:sales:faturar', {
      items: [{ product_sku: 'V', quantity_milli: 1_000, unit_price_cents: 100 }],
      party: 'c1'
    })

    // A montagem de `montar()` não tem `reservations` — e a venda passa igual.
    expect(criada['error']).toBeUndefined()
  })
})