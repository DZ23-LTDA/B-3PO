// Compras expostas ao renderer, incluindo o **recebimento**, que atravessa para o estoque.
//
// Mesma defesa de vendas: valida antes de gravar. O pedido só é marcado como recebido depois que as
// entradas passaram pelo ledger — e a `ref` determinística faz um retry completar o que faltou em vez de
// duplicar mercadoria.
//
// PERMISSÃO (r222)
//
// Compras é o segundo domínio que move dinheiro e estoque ao mesmo tempo. `receive` faz três coisas: marca o
// pedido recebido, **lança entradas no estoque** e **cria a conta a pagar**. Tudo isso é `execute`.
//
// A guarda vem ANTES do limite de compra de propósito: primeiro se sabe quem está agindo, depois se pergunta se
// o valor cabe no teto. Invertendo, um pedido acima do limite responderia "precisa de aprovação" a quem nem
// poderia comprar — e a pessoa iria atrás da assinatura errada.

import type { IpcRegistrar } from './ipc-types'
import { exigirAtor } from './permission-guard'
import type { Actor } from './rbac'
import { serverTenant } from './server-tenant'
import type { IpcMain, IpcMainInvokeEvent } from 'electron'

import type { InventoryMovement } from './inventory-store'
import { payableForPurchase, type FinanceEntry } from './finance-store'
import { normalizePurchase, stockMovementsFor, type PurchaseOrder, type Supplier } from './purchases-store'
import { situacaoDaCompra, type LimiteDeCompra } from './purchase-approval'
import { aprovarCompra } from './purchase-approval-decision'
import { escolherCotacao, type Cotacao } from './purchase-quotation'
import type { CotacaoGravada } from './quotation-store'

export interface PurchasesStoreLike {
  orders: (tenantId?: string) => Promise<PurchaseOrder[]>
  definirLimite: (input: unknown) => Promise<{ error: string } | { limite: { aprovadores: string[]; cents: null | number } }>
  lerLimite: () => Promise<{ aprovadores: string[]; cents: null | number }>
  saveOrder: (input: unknown) => Promise<{ error: string } | { order: PurchaseOrder; orders: PurchaseOrder[] }>
  suppliers: (tenantId?: string) => Promise<Supplier[]>
  upsertSupplier: (input: unknown) => Promise<{ error: string } | { supplier: Supplier; suppliers: Supplier[] }>
}

export interface InventoryLike {
  append: (input: unknown) => Promise<{ balance: number } | { error: string }>
}

export interface PurchasesDeps {
  /** Ator resolvido no processo principal. `null` recusa — compras nao cai em "anonimo com poder total". */
  actorOf: () => Promise<Actor | null>
  /**
   * Ids de ator que EXISTEM no sistema (r30 do GOAL V2).
   *
   * Sem isto, definirLimite aceita um id inexistente como aprovador - e o limite fica
   * configurado para NUNCA APROVAR. O erro so aparece quando alguem tenta aprovar.
   *
   * Opcional: quem monta sem atores continua funcionando, e a validacao nao roda.
   */
  atores?: () => Promise<string[]>
  finance: { append: (input: unknown) => Promise<{ entry: FinanceEntry } | { error: string }> }
  /** Limite de compra da empresa. Ausente ou com cents: null desliga o controle. */
  limiteDeCompra?: () => Promise<LimiteDeCompra>
  inventory: InventoryLike
  /** Store de cotacoes persistidas. Ausente = o canal responde lista vazia em vez de quebrar. */
  quotations?: {
    list: (tenantId?: string) => Promise<CotacaoGravada[]>
    remove: (id: unknown) => Promise<{ cotacoes: CotacaoGravada[] }>
    save: (payload: unknown) => Promise<unknown>
  }
  store: PurchasesStoreLike
}

export type ReceiveResult =
  | { error: string }
  | { finance: FinanceEntry | null; order: PurchaseOrder; orders: PurchaseOrder[]; stock: InventoryMovement[] }

type Denied = { error: 'sem_permissao'; reason: string }

export function registerPurchasesIpc(ipcMain: IpcRegistrar, deps: PurchasesDeps): void {
  ipcMain.handle(
    'hermes:purchases:suppliers',
    async (_event: IpcMainInvokeEvent, tenantId: unknown): Promise<Denied | { suppliers: Supplier[] }> =>
      exigirAtor(deps.actorOf, 'read', 'purchases', async () => ({
        suppliers: await deps.store.suppliers(serverTenant(tenantId))
      }))
  )

  ipcMain.handle(
    'hermes:purchases:saveSupplier',
    async (_event: IpcMainInvokeEvent, payload: unknown) =>
      exigirAtor(deps.actorOf, 'execute', 'purchases', async () => deps.store.upsertSupplier(payload))
  )

  ipcMain.handle(
    'hermes:purchases:orders',
    async (_event: IpcMainInvokeEvent, tenantId: unknown): Promise<Denied | { orders: PurchaseOrder[] }> =>
      exigirAtor(deps.actorOf, 'read', 'purchases', async () => ({
        orders: await deps.store.orders(serverTenant(tenantId))
      }))
  )

  ipcMain.handle(
    'hermes:purchases:saveOrder',
    async (_event: IpcMainInvokeEvent, payload: unknown) =>
      exigirAtor(deps.actorOf, 'execute', 'purchases', async () => deps.store.saveOrder(payload))
  )

  // Receber: marca como recebido e lança as entradas no estoque, nesta ordem.
  ipcMain.handle(
    'hermes:purchases:receive',
    async (_event: IpcMainInvokeEvent, payload: unknown): Promise<Denied | ReceiveResult> =>
      exigirAtor(deps.actorOf, 'execute', 'purchases', async () => {
        const normalizado = normalizePurchase({ ...(payload as object), status: 'recebido' }, Date.now())

        if ('error' in normalizado) {
          return { error: normalizado.error }
        }

        // Limite de compra (GOAL §15). Sem limiteDeCompra configurado, nada muda: o controle e opt-in do dono.
        // Recusar AQUI, antes de gravar, e o que impede um pedido acima do teto de virar estoque e conta a pagar
        // para depois alguem descobrir que precisava de assinatura.
        if (deps.limiteDeCompra) {
          const limite = await deps.limiteDeCompra()
          const total = normalizado.order.items.reduce((soma, item) => soma + (item.total_cents ?? 0), 0)
          const situacao = situacaoDaCompra(total, limite)

          if (situacao.precisa) {
            return { error: 'aprovacao_necessaria' }
          }
        }

        const salvo = await deps.store.saveOrder({ ...(payload as object), status: 'recebido' })

        if ('error' in salvo) {
          return { error: salvo.error }
        }

        const stock: InventoryMovement[] = []

        for (const movimento of stockMovementsFor(salvo.order)) {
          const entrada = await deps.inventory.append(movimento)

          if ('balance' in entrada) {
            stock.push(movimento as unknown as InventoryMovement)
          } else if (entrada.error !== 'ref_duplicado') {
            return { error: entrada.error }
          }
        }

        // A conta a pagar e derivada do pedido recebido, com ref deterministica: um retry nao duplica.
        const pagar = payableForPurchase(salvo.order)
        let finance: FinanceEntry | null = null

        if (pagar) {
          const lancado = await deps.finance.append(pagar)

          if ('entry' in lancado) {
            finance = lancado.entry
          } else if (lancado.error !== 'ref_duplicado') {
            return { error: lancado.error }
          }
        }

        return { order: salvo.order, orders: salvo.orders, stock, finance }
      })
  )
  // Cotacao: compara propostas para uma quantidade e devolve a escolha com a economia contra a segunda.

  /** Le o limite vigente (r30). cents: null = sem limite, e o estado inicial. */
  ipcMain.handle('hermes:purchases:limite', async (): Promise<unknown> =>
    exigirAtor(deps.actorOf, 'read', 'purchases', async () => ({ limite: await deps.store.lerLimite() }))
  )

  /**
   * Define o limite - acao execute.
   *
   * r30 do GOAL V2: valida os aprovadores contra os atores que EXISTEM. Sem isso, digitar um id
   * inexistente salva um limite que NUNCA APROVA, e o erro so aparece na tentativa de aprovar.
   *
   * A recusa nomeia QUEM nao existe: 'aprovador_inexistente' sozinho obrigaria a procurar qual id errou.
   */
  ipcMain.handle('hermes:purchases:definirLimite', async (_event: unknown, payload: unknown): Promise<unknown> =>
    exigirAtor(deps.actorOf, 'execute', 'purchases', async () => {
      const raw = (payload ?? {}) as Record<string, unknown>
      const lista = Array.isArray(raw['aprovadores'])
        ? raw['aprovadores'].filter((a): a is string => typeof a === 'string' && a.trim() !== '').map(a => a.trim())
        : []

      if (deps.atores && lista.length > 0) {
        const existentes = new Set(await deps.atores())
        const faltando = lista.filter(id => !existentes.has(id))

        if (faltando.length > 0) {
          return { error: 'aprovador_inexistente', motivo: 'ator nao encontrado: ' + faltando.join(', ') }
        }
      }

      return deps.store.definirLimite(raw)
    })
  )
  //
  // NAO grava nada: uma cotacao e proposta, nao compromisso. Persistir aqui faria uma proposta vencida virar
  // divida; quem compra decide se vira pedido.
  // r26 do GOAL V2: o canal de aprovacao fecha o beco sem saida da r25. Antes dele,
  // 'aprovacao_necessaria' era uma recusa correta sem caminho de saida.
  //
  // O aprovador vem do RESOLVEDOR, nunca do payload: se viesse do renderer, bastaria escrever o nome
  // de um aprovador para liberar o proprio gasto — e a regra 'mesmo_solicitante' viraria decorativa.
  ipcMain.handle(
    'hermes:purchases:aprovar',
    async (_event: IpcMainInvokeEvent, payload: unknown) =>
      exigirAtor(deps.actorOf, 'execute', 'purchases', async () => {
        const raw = (payload ?? {}) as Record<string, unknown>
        const pedidoId = typeof raw['pedido_id'] === 'string' ? raw['pedido_id'] : ''

        if (!pedidoId) return { error: 'pedido_obrigatorio' }
        if (!deps.limiteDeCompra) return { error: 'limite_indisponivel' }

        const ator = await deps.actorOf()
        const limiteDeCompra = deps.limiteDeCompra

        return aprovarCompra(
          {
            limiteDeCompra,
            obterPedido: async id => {
              const lista = await deps.store.orders()

              return lista.find(o => o.id === id) ?? null
            },
            salvar: async pedido => {
              const salvo = await deps.store.saveOrder(pedido as unknown as Record<string, unknown>)

              return 'error' in salvo ? { error: salvo.error } : { order: salvo.order }
            }
          },
          pedidoId,
          ator?.id ?? ''
        )
      })
  )


  ipcMain.handle(
    'hermes:purchases:cotacao',
    async (_event: IpcMainInvokeEvent, payload: unknown) =>
      exigirAtor(deps.actorOf, 'read', 'purchases', async () => {
        const raw = (payload ?? {}) as Record<string, unknown>
        const cotacoes = Array.isArray(raw['cotacoes']) ? (raw['cotacoes'] as Cotacao[]) : []
        const quantidade = Number(raw['quantidade'])

        return escolherCotacao(cotacoes, quantidade)
      })
  )
  // Cotacoes persistidas. Sem store injetado, a lista sai vazia em vez de lancar: o canal nao derruba a tela.
  ipcMain.handle(
    'hermes:purchases:quotations',
    async (_event: IpcMainInvokeEvent, tenantId: unknown): Promise<Denied | { quotations: CotacaoGravada[] }> =>
      exigirAtor(deps.actorOf, 'read', 'purchases', async () => ({
        quotations: deps.quotations ? await deps.quotations.list(serverTenant(tenantId)) : []
      }))
  )

  ipcMain.handle(
    'hermes:purchases:saveQuotation',
    async (_event: IpcMainInvokeEvent, payload: unknown) =>
      exigirAtor(deps.actorOf, 'execute', 'purchases', async () => {
        if (!deps.quotations) return { error: 'cotacoes_indisponivel' }

        return deps.quotations.save(payload)
      })
  )

  ipcMain.handle(
    'hermes:purchases:removeQuotation',
    async (_event: IpcMainInvokeEvent, id: unknown) =>
      exigirAtor(deps.actorOf, 'execute', 'purchases', async () => {
        if (!deps.quotations) return { cotacoes: [] }

        return deps.quotations.remove(id)
      })
  )
}
