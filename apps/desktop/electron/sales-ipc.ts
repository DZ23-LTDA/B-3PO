// Vendas expostas ao renderer, incluindo o **faturamento**, que atravessa três domínios.
//
// O problema real: gravar a venda, baixar o estoque e lançar a receita são três arquivos distintos, e
// arquivo JSON não tem transação entre si. Se a venda grava e o estoque falha por falta de saldo, o
// sistema fica com uma venda faturada que não saiu do depósito.
//
// A defesa aqui é **validar antes de escrever qualquer coisa**: o faturamento simula os movimentos de
// estoque contra o saldo atual e recusa a operação inteira se algum SKU não tiver quantidade. Só depois
// de o caminho estar livre é que a venda, a baixa e a receita são gravadas, nesta ordem, com `ref`
// determinística para que um retry complete o que faltou em vez de duplicar.
//
// O que isto NÃO é: atomicidade. Continua existindo uma janela entre as três gravações. O que existe é
// (a) recusa antes de sujar o estado no caso previsível, e (b) idempotência que torna a repetição segura.

import type { IpcRegistrar } from './ipc-types'
import { serverTenant } from './server-tenant'
import type { IpcMain, IpcMainInvokeEvent } from 'electron'

import { receivableForSale, type FinanceEntry } from './finance-store'
import { balanceFor, type InventoryMovement } from './inventory-store'
import type { Actor } from './rbac'
import { withPermission } from './permission-guard'
import { normalizeSale, stockMovementsFor, type Sale } from './sales-store'

export interface SalesStoreLike {
  cancel: (id: string, tenantId?: string, reason?: string) => Promise<{ error: string } | { sales: Sale[] }>
  create: (input: unknown) => Promise<{ error: string } | { sale: Sale; sales: Sale[] }>
  list: (tenantId?: string) => Promise<Sale[]>
}

export interface InventoryLike {
  // O store real devolve `movement` junto do saldo. O tipo estava declarando só `balance`, e o
  // `'movement' in baixa` nunca estreitava — o compilador via sempre o braço sem movimento.
  append: (input: unknown) => Promise<{ balance: number; movement: InventoryMovement } | { error: string }>
  balances: (tenantId?: string) => Promise<Record<string, number>>
}

export interface FinanceLike {
  append: (input: unknown) => Promise<{ entry: FinanceEntry } | { error: string }>
}

export interface SalesDeps {
  /** Quem está agindo. Resolvido no processo principal, nunca recebido do renderer. */
  actorOf: () => Promise<Actor | null>
  /** Opcional: quando presente, faturar cria os acompanhamentos de pos-venda. */
  afterSales?: { create: (input: unknown) => Promise<unknown> }
  finance: FinanceLike
  inventory: InventoryLike
  /**
   * Opcional: quando presente, faturar anuncia o evento para as automacoes.
   *
   * Recebe um resumo do que aconteceu, nao o payload cru: a automacao nao deve depender da forma do
   * pedido, so do fato de que a venda foi faturada.
   */
  onEvent?: (event: { sale_id: string; tenant_id: string; total_cents: number; type: 'venda.faturada' }) => Promise<void>
  sales: SalesStoreLike
}

export type FaturarResult =
  | { error: string; message?: string }
  | { finance: FinanceEntry | null; sale: Sale; sales: Sale[]; stock: InventoryMovement[] }

/**
 * Simula a baixa de estoque contra o saldo atual e devolve o SKU que falta, ou null.
 *
 * Precisa considerar movimentações do mesmo SKU no próprio pedido: duas linhas do mesmo produto somam
 * antes de comparar com o saldo, senão um pedido com 2×6 unidades passaria com 10 em estoque.
 */
export function stockShortage(sale: Sale, balances: Record<string, number>): null | string {
  const necessario: Record<string, number> = {}

  for (const movement of stockMovementsFor(sale)) {
    necessario[movement.product_sku] = (necessario[movement.product_sku] ?? 0) + movement.quantity_milli
  }

  for (const [sku, quantidade] of Object.entries(necessario)) {
    if ((balances[sku] ?? 0) < quantidade) {
      return sku
    }
  }

  return null
}

export function registerSalesIpc(ipcMain: IpcRegistrar, deps: SalesDeps): void {
  ipcMain.handle(
    'hermes:sales:list',
    async (_event: IpcMainInvokeEvent, tenantId: unknown): Promise<{ sales: Sale[] }> => ({
      sales: await deps.sales.list(serverTenant(tenantId))
    })
  )

  // Orçamento e pedido não movem estoque nem financeiro.
  ipcMain.handle(
    'hermes:sales:create',
    async (_event: IpcMainInvokeEvent, payload: unknown): Promise<{ error: string } | { sale: Sale; sales: Sale[] }> =>
      deps.sales.create(payload)
  )

  ipcMain.handle(
    'hermes:sales:cancel',
    async (_event: IpcMainInvokeEvent, id: unknown, tenantId: unknown, reason: unknown): Promise<
      { error: string } | { sales: Sale[] }
    > =>
      deps.sales.cancel(
        typeof id === 'string' ? id : '',
        serverTenant(tenantId),
        typeof reason === 'string' ? reason : ''
      )
  )

  ipcMain.handle('hermes:sales:faturar', async (_event: IpcMainInvokeEvent, payload: unknown): Promise<FaturarResult | { error: 'sem_permissao'; reason: string }> => {
    const actor = await deps.actorOf()

    if (!actor) {
      return { error: 'sem_permissao', reason: 'sem_ator' }
    }

    const permitido = await withPermission(actor, 'execute', { resource: 'sales' }, async () => true)

    if (permitido !== true) {
      return { error: 'sem_permissao', reason: (permitido as { reason: string }).reason }
    }

    return faturar(payload)
  })

  async function faturar(payload: unknown): Promise<FaturarResult> {
    const normalized = normalizeSale({ ...(payload as object), status: 'faturado' }, Date.now())

    if ('error' in normalized) {
      return { error: normalized.error }
    }

    // Verifica contra o saldo ATUAL antes de gravar a venda: recusar depois seria deixar uma venda
    // faturada que nunca saiu do depósito.
    const falta = stockShortage({ ...normalized.sale, number: 0 }, await deps.inventory.balances(normalized.sale.tenant_id))

    if (falta) {
      return { error: 'saldo_insuficiente', message: falta }
    }

    const criada = await deps.sales.create({ ...(payload as object), status: 'faturado' })

    if ('error' in criada) {
      return { error: criada.error }
    }

    const stock: InventoryMovement[] = []

    for (const movement of stockMovementsFor(criada.sale)) {
      const baixa = await deps.inventory.append(movement)

      // `ref_duplicado` aqui significa que a baixa já aconteceu num retry: não é erro, é idempotência.
      if ('movement' in baixa) {
        stock.push((baixa as { movement: InventoryMovement }).movement)
      } else if (baixa.error !== 'ref_duplicado') {
        return { error: baixa.error }
      }
    }

    const receber = receivableForSale(criada.sale)
    let finance: FinanceEntry | null = null

    if (receber) {
      const lancado = await deps.finance.append(receber)

      if ('entry' in lancado) {
        finance = lancado.entry
      } else if (lancado.error !== 'ref_duplicado') {
        return { error: lancado.error }
      }
    }

    // Evento para as automacoes. Mesma regra do pos-venda: a venda e o fato principal, e uma
    // automacao que falha nao pode desfaze-la nem devolver erro ao operador. A diferenca e que aqui
    // o silencio e mais estreito: o executor registra cada disparo (`onRun`), entao a falha aparece
    // no relatorio de automacoes mesmo sem quebrar o faturamento.
    if (deps.onEvent) {
      try {
        await deps.onEvent({
          sale_id: criada.sale.id,
          tenant_id: criada.sale.tenant_id,
          total_cents: criada.sale.total_cents,
          type: 'venda.faturada'
        })
      } catch {
        // Ignorado de proposito, pelo mesmo motivo do pos-venda.
      }
    }

    // Pos-venda nasce daqui: sem isto o dominio existe e ninguem o alimenta. Satisfacao e recompra
    // sao criadas com o `ref` da venda, entao refaturar (retry) nao duplica.
    //
    // Falha aqui NAO desfaz a venda. A venda ja esta gravada e o estoque ja saiu: devolver erro agora
    // faria o operador achar que nao faturou e tentar de novo. Acompanhamento perdido e degradacao;
    // venda fantasma e prejuizo.
    if (deps.afterSales) {
      for (const kind of ['satisfacao', 'recompra'] as const) {
        try {
          await deps.afterSales.create({
            contact_phone: criada.sale.contact_phone ?? '',
            kind,
            sale_at: criada.sale.created_at,
            sale_id: criada.sale.id,
            tenant_id: criada.sale.tenant_id
          })
        } catch {
          // Silencioso de proposito: o indicador `semAcompanhamento` revela o buraco na tela.
        }
      }
    }

    return { finance, sale: criada.sale, sales: criada.sales, stock }
  }
}

/** Saldo de um SKU, para a tela mostrar disponibilidade ao montar o pedido. */
export async function saldoDoSku(deps: Pick<SalesDeps, 'inventory'>, sku: string, tenantId?: string): Promise<number> {
  const lista = await deps.inventory.balances(tenantId)

  return typeof lista[sku] === 'number' ? lista[sku] : 0
}

/** Reexport para conveniência de teste: mesma regra, sem IPC. */
export { balanceFor }