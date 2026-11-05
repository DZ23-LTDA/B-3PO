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
