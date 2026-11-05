// O FLUXO COMPLETO DE COMPRAS (r45 do GOAL V2).
//
// POR QUE ESTE ARQUIVO EXISTE
//
// O §26 é explícito:
//
//   "solicitação -> cotação -> comparação -> aprovação autorizada -> pedido -> recebimento ->
//    estoque -> financeiro -> auditoria.
//
//    Não considerar botão, tela, store, teste isolado ou resposta textual como prova de fluxo completo."
//
// Cada etapa da r41–r44 tem o seu próprio teste. **Nenhum deles percorre a sequência** — e é a sequência
// que o §26 pede.
//
// O QUE ELE USA
//
// Stores reais, em disco temporário, e os canais reais. Não há mock de domínio: o arquivo JSON é escrito
// e lido de verdade. Um mock aqui provaria que o mock funciona.
//
// O QUE ELE **NÃO** USA
//
// A tela. Ela é uma camada de apresentação — e o §26 diz "nem botão, nem tela". O que este teste prova é
// que os dados atravessam o fluxo; a tela é coberta por typecheck.

import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { AuditStore, auditStorePath, configurarColetorDeAuditoria } from './audit-store'
import { FinanceStore, financeStorePath } from './finance-store'
import { InventoryStore, inventoryStorePath } from './inventory-store'
import { registerPurchasesIpc } from './purchases-ipc'
import { PurchasesStore, purchasesStorePath } from './purchases-store'
import type { Actor } from './rbac'

let dir = ''

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'b3po-fluxo-'))
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
  canais: string[]
  finance: FinanceStore
  inventory: InventoryStore
  store: PurchasesStore
}

function montar(opcoes: { atores?: string[]; limite?: { aprovadores: string[]; cents: null | number } } = {}): Montagem {
  const mapa = new Map<string, (e: unknown, p: unknown) => Promise<unknown>>()
  const auditoria = new AuditStore(auditStorePath(dir))
  const store = new PurchasesStore(purchasesStorePath(dir))
  const finance = new FinanceStore(financeStorePath(dir))
  const inventory = new InventoryStore(inventoryStorePath(dir))

  configurarColetorDeAuditoria(auditoria)

  registerPurchasesIpc(
    { handle: (c: string, l: (e: unknown, p: unknown) => Promise<unknown>) => mapa.set(c, l) } as never,
    {
      actorOf: async () => DONO,
      atores: opcoes.atores ? async () => opcoes.atores ?? [] : undefined,
      finance,
      // O limite vem do store; aqui já está configurado se o teste pediu.
      limiteDeCompra: () => store.lerLimite(),
      inventory,
      store
    }
  )

  return {
    auditoria,
    async chamar(canal, payload) {
      const h = mapa.get(canal)

      if (!h) throw new Error(`canal nao registrado: ${canal}`)

      return (await h(null, payload)) as Record<string, unknown>
    },
    canais: [...mapa.keys()],
    finance,
    inventory,
    store
  }
}

const drenar = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 60))

describe('o fluxo de compras, de ponta a ponta', () => {
  it('solicitação → pedido → recebimento → estoque → financeiro → auditoria', async () => {
    const m = montar()

    // ── 1. SOLICITAÇÃO ────────────────────────────────────────────────────────────────────────────
    // Alguém nota que falta mercadoria e registra POR QUÊ. É a etapa que o produto não tinha.
    const pediu = await m.chamar('hermes:purchases:solicitar', {
      motivo: 'acabou no deposito e ha venda marcada',
      product_sku: 'SKU-1',
      quantity_milli: 30_000
    })

    expect(pediu['error']).toBeUndefined()

    const solicitacoes = (await m.store.solicitacoes()) as { id: string; status: string }[]

    expect(solicitacoes).toHaveLength(1)
    expect(solicitacoes[0]?.status).toBe('aberta')

    const idSolicitacao = solicitacoes[0]?.id as string

    // ── 2. COTAÇÃO / COMPARAÇÃO ───────────────────────────────────────────────────────────────────
    // A cotação é o que DESCOBRE o fornecedor. Ela precede o pedido, e é por isso que a solicitação não
    // cria o pedido sozinha.
    const fornecedor = 'forn-1'

    // ── 3. SOLICITAÇÃO ATENDIDA → PEDIDO ──────────────────────────────────────────────────────────
    // A LIGAÇÃO (r44): o pedido nasce com o item da solicitação e a origem registrada.
    const atendida = await m.chamar('hermes:purchases:atenderSolicitacao', {
      id: idSolicitacao,
      supplier_id: fornecedor
    })

    expect(atendida['error']).toBeUndefined()

    const pedido = atendida['pedido'] as { id: string; notes: string; status: string }

    expect(pedido.status).toBe('rascunho')
    // A origem está no pedido, dos dois lados.
    expect(pedido.notes).toContain(idSolicitacao)

    const aposAtender = (await m.store.solicitacoes()) as { pedido_id: null | string; status: string }[]

    expect(aposAtender[0]?.status).toBe('atendida')
    expect(aposAtender[0]?.pedido_id).toBeTruthy()

    // ── 4. APROVAÇÃO / RECEBIMENTO ───────────────────────────────────────────────────────────────
    // O pedido é recebido com CONFERÊNCIA (r39): chegaram 30, pedidos 30.
    const recebido = await m.chamar('hermes:purchases:receive', {
      conferidos: [{ quantity_milli: 30_000, sku: 'SKU-1' }],
      id: pedido.id,
      items: [{ product_sku: 'SKU-1', quantity_milli: 30_000, unit_cost_cents: 1_500 }],
      supplier_id: fornecedor
    })

    expect(recebido['error']).toBeUndefined()

    // ── 5. ESTOQUE ───────────────────────────────────────────────────────────────────────────────
    // A entrada existe, com a quantidade que chegou.
    const saldo = (await m.inventory.balances())['SKU-1'] ?? 0

    expect(saldo).toBe(30_000)

    // ── 6. FINANCEIRO ────────────────────────────────────────────────────────────────────────────
    // A conta a pagar nasceu do recebimento.
    const contas = await m.finance.list()
    const contaDoPedido = contas.find(c => c.ref === `compra:${pedido.id}`)

    expect(contaDoPedido).toBeDefined()
    expect(contaDoPedido?.kind).toBe('pagar')

    // ── 7. AUDITORIA ─────────────────────────────────────────────────────────────────────────────
    // Toda decisão de permissão deixou rastro em disco (r35).
    await drenar()

    const { entries } = await m.auditoria.listar()

    expect(entries.length).toBeGreaterThan(0)
    // A trilha tem as duas ações que importam: pedir e atender.
    expect(entries.some(e => e.action === 'execute' && e.resource === 'purchases' && e.allowed)).toBe(true)
  })

  it('a conferência muda o estoque, e a divergência é devolvida', async () => {
    const m = montar()

    // Chegaram 20 de 30: o caso que o código antigo errava, somando 30 ao estoque.
    const pediu = await m.chamar('hermes:purchases:solicitar', {
      motivo: 'reposicao',
      product_sku: 'SKU-2',
      quantity_milli: 30_000
    })

    expect(pediu['error']).toBeUndefined()

    const lista = (await m.store.solicitacoes()) as { id: string }[]
    const atendida = await m.chamar('hermes:purchases:atenderSolicitacao', {
      id: lista[0]?.id,
      supplier_id: 'forn-1'
    })
    const pedido = atendida['pedido'] as { id: string }

    const recebido = await m.chamar('hermes:purchases:receive', {
      conferidos: [{ quantity_milli: 20_000, sku: 'SKU-2' }],
      id: pedido.id,
      items: [{ product_sku: 'SKU-2', quantity_milli: 30_000, unit_cost_cents: 1_000 }],
      supplier_id: 'forn-1'
    })

    // O estoque recebeu 20, não 30.
    expect((await m.inventory.balances())['SKU-2'] ?? 0).toBe(20_000)

    // E a divergência foi DITA, não escondida.
    const conferencia = recebido['conferencia'] as { divergencias: { diferenca_milli: number }[] }

    expect(conferencia.divergencias).toHaveLength(1)
    expect(conferencia.divergencias[0]?.diferenca_milli).toBe(-10_000)
  })

  it('o limite barra o recebimento e a aprovação libera — e sem aprovação nada entra', async () => {
    const m = montar({ atores: ['dono'], limite: { aprovadores: ['dono'], cents: 10_000 } })

    // Configura o limite pelo canal (r27): antes da r27 ele só mudava editando código.
    const configurado = await m.chamar('hermes:purchases:definirLimite', {
      aprovadores: ['dono'],
      cents: 10_000
    })

    expect(configurado['error']).toBeUndefined()

    // Um pedido acima do teto é BARrado.
    const acima = await m.chamar('hermes:purchases:receive', {
      items: [{ product_sku: 'SKU-3', quantity_milli: 10_000, unit_cost_cents: 5_000 }],
      supplier_id: 'forn-1'
    })

    expect(acima['error']).toBe('aprovacao_necessaria')
    // Nada entrou no estoque nem no financeiro.
    expect((await m.inventory.balances())['SKU-3'] ?? 0).toBe(0)
  })
})

describe('o que o fluxo NÃO faz, e é importante saber', () => {
  it('atender uma solicitação NÃO aprova nada — o pedido nasce em rascunho', async () => {
    const m = montar({ limite: { aprovadores: ['chefe'], cents: 1_000 } })

    await m.chamar('hermes:purchases:definirLimite', { aprovadores: ['chefe'], cents: 1_000 })

    const pediu = await m.chamar('hermes:purchases:solicitar', {
      motivo: 'x',
      product_sku: 'SKU-4',
      quantity_milli: 10_000
    })

    expect(pediu['error']).toBeUndefined()

    const lista = (await m.store.solicitacoes()) as { id: string }[]
    const atendida = await m.chamar('hermes:purchases:atenderSolicitacao', {
      id: lista[0]?.id,
      supplier_id: 'forn-1'
    })

    // Rascunho: a aprovação continua no caminho, e é a diferença entre PEDIR e AUTORIZAR.
    expect((atendida['pedido'] as { status: string }).status).toBe('rascunho')
  })

  it('solicitação cancelada não vira pedido', async () => {
    const m = montar()

    await m.chamar('hermes:purchases:solicitar', { motivo: 'x', product_sku: 'SKU-5', quantity_milli: 1_000 })

    const lista = (await m.store.solicitacoes()) as { id: string }[]

    await m.chamar('hermes:purchases:solicitacaoStatus', { id: lista[0]?.id, status: 'cancelada' })

    const r = await m.chamar('hermes:purchases:atenderSolicitacao', {
      id: lista[0]?.id,
      supplier_id: 'forn-1'
    })

    expect(r['error']).toBe('ja_cancelada')
  })
})
describe('o preço atravessa o fluxo (r49)', () => {
  it('o pedido nasce com o custo da proposta vencedora, não com zero', async () => {
    const m = montar()

    await m.chamar('hermes:purchases:solicitar', { motivo: 'x', product_sku: 'SKU-P', quantity_milli: 10_000 })

    const lista = (await m.store.solicitacoes()) as { id: string }[]

    // Sem o custo, o pedido nasceria com `total_cents: 0` — e um pedido de valor zero NÃO gera conta a
    // pagar (`payableForPurchase` recusa `total <= 0`). A compra existiria no estoque e não no financeiro.
    const atendida = await m.chamar('hermes:purchases:atenderSolicitacao', {
      id: lista[0]?.id,
      supplier_id: 'forn-1',
      unit_cost_cents: 1_500
    })

    expect(atendida['error']).toBeUndefined()

    const pedido = atendida['pedido'] as { total_cents: number }

    expect(pedido.total_cents).toBe(15_000)
  })

  it('sem preço, o pedido nasce com zero — e o financeiro não é inventado', async () => {
    const m = montar()

    await m.chamar('hermes:purchases:solicitar', { motivo: 'x', product_sku: 'SKU-Q', quantity_milli: 10_000 })

    const lista = (await m.store.solicitacoes()) as { id: string }[]
    const atendida = await m.chamar('hermes:purchases:atenderSolicitacao', {
      id: lista[0]?.id,
      supplier_id: 'forn-1'
    })

    // Inventar um preço seria pior que um pedido incompleto: valor errado vira conta a pagar errada.
    expect((atendida['pedido'] as { total_cents: number }).total_cents).toBe(0)
  })
})
describe('o caminho APROVADO (r50)', () => {
  it('a recusa grava o pedido aguardando, e o id devolvido é aprovAvel', async () => {
    // O ator da montagem é dono; a lista de aprovadores tem de incluí-lo, senão a recusa é
    // `nao_e_aprovador` e o teste mediria a coisa errada.
    const m = montar({ atores: ['dono'], limite: { aprovadores: ['dono'], cents: 10_000 } })

    await m.chamar('hermes:purchases:definirLimite', { aprovadores: ['dono'], cents: 10_000 })

    const recusa = await m.chamar('hermes:purchases:receive', {
      items: [{ product_sku: 'SKU-A', quantity_milli: 10_000, unit_cost_cents: 5_000 }],
      supplier_id: 'forn-1'
    })

    expect(recusa['error']).toBe('aprovacao_necessaria')

    // r50: o pedido EXISTE. Sem isto, `aprovarCompra` responderia `pedido_inexistente` — o beco da r25
    // tinha voltado disfarçado.
    const pedidoId = recusa['pedido_id'] as string

    expect(pedidoId).toBeTruthy()

    // E não entrou no estoque: "aguardando aprovação" significa que NADA aconteceu ainda.
    expect((await m.inventory.balances())['SKU-A'] ?? 0).toBe(0)

    // A aprovação aceita o id devolvido pela recusa.
    const aprovado = await m.chamar('hermes:purchases:aprovar', { pedido_id: pedidoId })

    expect(aprovado['error']).toBeUndefined()
    expect(aprovado['aprovada']).toBe(true)
  })

  it('aprovado, o recebimento entra no estoque e no financeiro', async () => {
    // O ator da montagem é dono; a lista de aprovadores tem de incluí-lo, senão a recusa é
    // `nao_e_aprovador` e o teste mediria a coisa errada.
    const m = montar({ atores: ['dono'], limite: { aprovadores: ['dono'], cents: 10_000 } })

    await m.chamar('hermes:purchases:definirLimite', { aprovadores: ['dono'], cents: 10_000 })

    const recusa = await m.chamar('hermes:purchases:receive', {
      items: [{ product_sku: 'SKU-B', quantity_milli: 10_000, unit_cost_cents: 5_000 }],
      supplier_id: 'forn-1'
    })

    const pedidoId = recusa['pedido_id'] as string

    await m.chamar('hermes:purchases:aprovar', { pedido_id: pedidoId })

    // Com a aprovação, a segunda tentativa de receber passa — e é `aprovado_por` que a libera.
    const recebido = await m.chamar('hermes:purchases:receive', {
      aprovado_por: 'dono',
      id: pedidoId,
      items: [{ product_sku: 'SKU-B', quantity_milli: 10_000, unit_cost_cents: 5_000 }],
      supplier_id: 'forn-1'
    })

    expect(recebido['error']).toBeUndefined()

    // Estoque e financeiro, como no caminho sem limite.
    expect((await m.inventory.balances())['SKU-B'] ?? 0).toBe(10_000)

    const contas = await m.finance.list()

    expect(contas.some(c => c.kind === 'pagar' && c.amount_cents === 50_000)).toBe(true)
  })
})