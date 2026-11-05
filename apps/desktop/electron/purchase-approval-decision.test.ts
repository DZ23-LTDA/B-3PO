// O canal de aprovação de compra (r26 do GOAL V2).
//
// O BECO SEM SAÍDA QUE ESTE ARQUIVO FECHA
//
// A r25 auditou Compras: com um limite configurado, todo pedido acima do teto recebia
// `aprovacao_necessaria` — e **ninguém podia aprovar**. A recusa virara bloqueio permanente.
//
// O `purchase-approval.ts` já tinha as três regras e `decidirAprovacao`. Faltava a **porta**.
//
// O QUE OS TESTES PROVAM
//
//   1. o caminho de saída existe (aprovar → receber)
//   2. quem pediu não aprova o próprio pedido
//   3. quem não está na lista de aprovadores não aprova
//   4. o valor aprovado fica registrado

import { describe, expect, it } from 'vitest'

import { aprovarCompra, type AprovacaoDeps } from './purchase-approval-decision'
import type { LimiteDeCompra } from './purchase-approval'
import type { PurchaseOrder } from './purchases-store'

const LIMITE: LimiteDeCompra = { aprovadores: ['chefe', 'diretor'], cents: 100_000 }

function pedido(extra: Partial<PurchaseOrder> = {}): PurchaseOrder {
  return {
    created_at: 0,
    id: 'p1',
    items: [{ product_sku: 'SKU', quantity_milli: 1, total_cents: 150_000, unit_cost_cents: 150_000 }],
    notes: '',
    number: 1,
    status: 'pedido',
    supplier_id: 's1',
    tenant_id: 'local',
    total_cents: 150_000,
    updated_at: 0,
    ...extra
  } as PurchaseOrder
}

function deps(over: Partial<AprovacaoDeps> = {}, inicial: PurchaseOrder = pedido()): {
  deps: AprovacaoDeps
  salvos: PurchaseOrder[]
} {
  const salvos: PurchaseOrder[] = []
  let atual = inicial

  return {
    deps: {
      limiteDeCompra: async () => LIMITE,
      obterPedido: async () => atual,
      salvar: async p => {
        salvos.push(p)
        atual = p

        return { order: p }
      },
      ...over
    },
    salvos
  }
}

/** Um pedido cujo total DOS ITENS é o valor dado — provarCompra recalcula a partir deles. */
function pedidoDe(totalCents: number) {
  return pedido({
    items: [{ product_sku: 'SKU', quantity_milli: 1, total_cents: totalCents, unit_cost_cents: totalCents }],
    total_cents: totalCents
  })
}

describe('o caminho de saída existe', () => {
  it('um aprovador da lista aprova o pedido acima do teto', async () => {
    const d = deps()

    const r = await aprovarCompra(d.deps, 'p1', 'chefe')

    expect(r).toMatchObject({ aprovada: true })
    expect(d.salvos).toHaveLength(1)
  })

  it('o valor aprovado fica registrado — se os itens mudarem, a diferença é visível', async () => {
    const d = deps()

    await aprovarCompra(d.deps, 'p1', 'chefe')

    expect(d.salvos[0]?.approval).toMatchObject({
      aprovador: 'chefe',
      total_aprovado_cents: 150_000
    })
  })
})

describe('as três recusas do módulo sobem como estão', () => {
  it('quem pediu NÃO aprova o próprio pedido', async () => {
    // O solicitante tem de estar na lista de aprovadores para a regra ser o que barra.
    const d = deps({ limiteDeCompra: async () => ({ aprovadores: ['chefe'], cents: 100_000 }) }, pedido())

    // `solicitante` vazio por padrão; forçamos o caso real:
    const comSolicitante = {
      ...d.deps,
      obterPedido: async () => pedido({ approval: { aprovado_em: 0, aprovador: '', solicitante: 'chefe', total_aprovado_cents: 0 } })
    }

    expect(await aprovarCompra(comSolicitante, 'p1', 'chefe')).toMatchObject({ error: 'mesmo_solicitante' })
  })

  it('quem não está na lista não aprova', async () => {
    const d = deps()

    expect(await aprovarCompra(d.deps, 'p1', 'estranho')).toMatchObject({ error: 'nao_e_aprovador' })
    expect(d.salvos).toHaveLength(0)
  })

  it('pedido abaixo do teto não tem o que aprovar', async () => {
    const d = deps({}, pedido({ total_cents: 50_000, items: [{ product_sku: 'S', quantity_milli: 1, total_cents: 50_000, unit_cost_cents: 50_000 }] }))

    expect(await aprovarCompra(d.deps, 'p1', 'chefe')).toMatchObject({ error: 'compra_nao_precisa' })
  })

  it('sem limite configurado, nada precisa de aprovação', async () => {
    const d = deps({ limiteDeCompra: async () => ({ aprovadores: [], cents: null }) })

    expect(await aprovarCompra(d.deps, 'p1', 'chefe')).toMatchObject({ error: 'compra_nao_precisa' })
  })
})

describe('as guardas do canal', () => {
  it('pedido inexistente', async () => {
    const d = deps({ obterPedido: async () => null })

    expect(await aprovarCompra(d.deps, 'nao-existe', 'chefe')).toMatchObject({ error: 'pedido_inexistente' })
  })

  it('pedido já recebido não se aprova: aprovação é a porta de ANTES do recebimento', async () => {
    const d = deps({}, pedido({ status: 'recebido' }))

    expect(await aprovarCompra(d.deps, 'p1', 'chefe')).toMatchObject({ error: 'pedido_ja_recebido' })
    expect(d.salvos).toHaveLength(0)
  })

  it('aprovador vazio recusa — não há "aprovado pelo sistema"', async () => {
    const d = deps()

    expect(await aprovarCompra(d.deps, 'p1', '')).toMatchObject({ error: 'aprovador_obrigatorio' })
  })

  it('erro do store sobe como está', async () => {
    const d = deps({ salvar: async () => ({ error: 'disco_cheio' }) })

    expect(await aprovarCompra(d.deps, 'p1', 'chefe')).toMatchObject({ error: 'disco_cheio' })
  })
})
describe('a alçada de aprovação (r52 do §15)', () => {
  it('o exemplo literal do §15: alçada de R$ 2.000 não aprova pedido de R$ 5.000', async () => {
    // O §15 dá este caso com todas as letras. Antes da r52, `aprovadores: ['chefe']` dizia QUEM podia
    // aprovar e NADA sobre quanto — e um chefe com alçada de R$ 2.000 liberava R$ 5.000.
    const limite: LimiteDeCompra = { alcadas: { chefe: 200_000 }, aprovadores: ['chefe'], cents: 100_000 }
    const d = deps({ limiteDeCompra: async () => limite }, pedidoDe(500_000))

    expect(await aprovarCompra(d.deps, 'p1', 'chefe')).toMatchObject({ error: 'acima_da_alcada' })
    expect(d.salvos).toHaveLength(0)
  })

  it('dentro da alçada, aprova', async () => {
    const limite: LimiteDeCompra = { alcadas: { chefe: 600_000 }, aprovadores: ['chefe'], cents: 100_000 }
    const d = deps({ limiteDeCompra: async () => limite }, pedidoDe(500_000))

    expect(await aprovarCompra(d.deps, 'p1', 'chefe')).toMatchObject({ aprovada: true })
  })

  it('sem alçada configurada, o aprovador pode o que o limite da empresa deixou passar', async () => {
    // Aditivo: nenhuma configuração existente muda de comportamento.
    const limite: LimiteDeCompra = { aprovadores: ['chefe'], cents: 100_000 }
    const d = deps({ limiteDeCompra: async () => limite }, pedidoDe(500_000))

    expect(await aprovarCompra(d.deps, 'p1', 'chefe')).toMatchObject({ aprovada: true })
  })

  it('alçada exatamente igual ao valor aprova — o teto é inclusivo', async () => {
    const limite: LimiteDeCompra = { alcadas: { chefe: 500_000 }, aprovadores: ['chefe'], cents: 100_000 }
    const d = deps({ limiteDeCompra: async () => limite }, pedidoDe(500_000))

    expect(await aprovarCompra(d.deps, 'p1', 'chefe')).toMatchObject({ aprovada: true })
  })

  it('a alçada de OUTRO aprovador não vale para este', async () => {
    const limite: LimiteDeCompra = { alcadas: { diretor: 900_000 }, aprovadores: ['chefe'], cents: 100_000 }
    const d = deps({ limiteDeCompra: async () => limite }, pedidoDe(500_000))

    // `chefe` não tem alçada própria: pode o que o limite da empresa deixou passar.
    expect(await aprovarCompra(d.deps, 'p1', 'chefe')).toMatchObject({ aprovada: true })
  })

  it('quem NÃO está na lista não descobre que faltou alçada', async () => {
    // A ordem das recusas importa: `nao_e_aprovador` vem antes de `acima_da_alcada`. Dizer "faltou
    // alçada" sugeriria que basta pedir mais limite, quando o problema é não estar na lista.
    const limite: LimiteDeCompra = { alcadas: { chefe: 1 }, aprovadores: ['chefe'], cents: 100_000 }
    const d = deps({ limiteDeCompra: async () => limite }, pedidoDe(500_000))

    expect(await aprovarCompra(d.deps, 'p1', 'estranho')).toMatchObject({ error: 'nao_e_aprovador' })
  })
})