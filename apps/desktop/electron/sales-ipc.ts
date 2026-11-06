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
import { limitadorDe, mensagemDeLimite } from './rate-limit'
import { estornoForDevolucao } from './sales-return'
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
  /**
   * Opcional: quando presente, faturar CONSOME a reserva daquela venda (r64 do GOAL V2).
   *
   * Sem isto, uma reserva criada nunca mudava de estado: o produto ficava prometido e a venda
   * nao sabia. A reserva existe para ser consumida - e o momento em que ela importa e este.
   *
   * Opcional de proposito: quem monta sem reservas (teste, uso programatico) continua
   * funcionando, e o balcao que vende sem reservar nao passa a exigir uma.
   */
  reservations?: { confirmarDaVenda: (saleId: string) => Promise<unknown> }
  inventory: InventoryLike
  /**
   * r292 — opcional: quando presente, faturar distingue "produto nao cadastrado" de "sem saldo".
   *
   * O `balances` so tem chave para SKU que JA se movimentou. Um SKU errado e um SKU novo sem
   * estoque davam a MESMA resposta (`saldo_insuficiente`), entao quem digitou o codigo errado lia
   * "sem saldo" e ia conferir o estoque de um produto que nao existe.
   *
   * Opcional de proposito: quem monta sem catalogo (teste, uso programatico) mantem o
   * comportamento anterior em vez de quebrar.
   */
  catalog?: { has: (sku: string, tenantId: string) => Promise<boolean> }
  /**
   * Opcional: quando presente, faturar anuncia o evento para as automacoes.
   *
   * Recebe um resumo do que aconteceu, nao o payload cru: a automacao nao deve depender da forma do
   * pedido, so do fato de que a venda foi faturada.
   */
  onEvent?: (event: {
    sale_id: string
    tenant_id: string
    total_cents: number
    type: 'venda.faturada'
    /**
     * r135 do GOAL V2: o telefone do cliente vai no evento.
     *
     * **O dado sempre existiu na venda** (`criada.sale.contact_phone`) e o evento não o carregava — então
     * **quem consome o evento não podia ligar a venda a ninguém**. O CRM é o primeiro consumidor que precisa
     * disso, e o campo é opcional porque a venda avulsa (sem cliente identificado) é legítima.
     */
    contact_phone?: null | string
  }) => Promise<void>
  sales: SalesStoreLike
}

export type FaturarResult =
  | { error: string; livre_milli?: number; message?: string; necessario_milli?: number }
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
    const saldos = await deps.inventory.balances(normalized.sale.tenant_id)
    const falta = stockShortage({ ...normalized.sale, number: 0 }, saldos)

    if (falta) {
      /*
       * r292 — a recusa diz QUAL dos dois problemas é.
       *
       * `balances` só tem chave para SKU que já se movimentou. Até aqui, SKU errado e SKU novo sem
       * estoque davam a mesma resposta: `saldo_insuficiente`. Quem digitou o código errado ia
       * conferir um saldo de um produto que não existe.
       *
       * A distinção exige o catálogo; sem ele (teste, uso programático) mantemos o comportamento
       * anterior. E quando o produto EXISTE, a recusa nomeia o livre — como `reservation.ts` já
       * fazia e a venda não: `saldo_insuficiente` sozinho obriga quem lê a calcular quanto sobra.
       */
      const cadastrado = deps.catalog ? await deps.catalog.has(falta, normalized.sale.tenant_id) : true

      if (!cadastrado) {
        return { error: 'produto_nao_encontrado', message: falta }
      }

      const necessario = stockMovementsFor({ ...normalized.sale, number: 0 })
        .filter(movement => movement.product_sku === falta)
        .reduce((soma, movement) => soma + movement.quantity_milli, 0)

      return { error: 'saldo_insuficiente', message: falta, livre_milli: saldos[falta] ?? 0, necessario_milli: necessario }
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

    // r64 do GOAL V2: a venda CONSOME a reserva. Sem isto, a reserva vencia sozinha e a venda nunca
    // sabia que havia uma promessa — o produto ficava reservado e depois liberado sem que ninguém
    // tivesse faturado nada.
    //
    // Falhar aqui NÃO desfaz a venda: o fato principal já aconteceu (estoque baixou, conta a receber
    // nasceu). O que falha é o registro da reserva, e a reconciliação o encontra.
    if (deps.reservations) {
      try {
        await deps.reservations.confirmarDaVenda(criada.sale.id)
      } catch {
        // Engolido de propósito: ver o comentário acima.
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
          type: 'venda.faturada',
          // r135: o telefone vai junto. Sem ele o consumidor nao podia ligar a venda a um cliente — e foi
          // exatamente isso que deixou o CRM sem saber quem comprou.
          contact_phone: criada.sale.contact_phone ?? null
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

  /**
   * Devolução de venda faturada: devolve ao estoque e estorna o recebível.
   *
   * Não reescreve a venda — cancelar uma faturada é recusado pelo store, e com razão: a venda aconteceu.
   * Devolver é um fato posterior, registrado como dois lançamentos novos ligados à venda por `ref`.
   *
   * Mesma regra de falha do faturamento: erro no estorno não devolve erro ao operador depois que a
   * mercadoria já voltou ao estoque. Devolver erro aqui faria ele tentar de novo e devolver duas vezes.
   */
  ipcMain.handle(
    'hermes:sales:devolver',
    async (
      _event: IpcMainInvokeEvent,
      saleId: unknown
    ): Promise<{ error: string } | { finance: FinanceEntry | null; sale: Sale; stock: InventoryMovement[] }> => {
      // Sem tenant do renderer: o servidor usa o da instalacao.
      const vendas = await deps.sales.list()
      const venda = vendas.find(v => v.id === saleId)

      if (!venda) {
        return { error: 'venda_nao_encontrada' }
      }

      const estorno = estornoForDevolucao(venda)

      if ('error' in estorno) {
        return { error: estorno.error }
      }

      const stock: InventoryMovement[] = []

      for (const movimento of estorno.estoque) {
        const entrada = await deps.inventory.append(movimento)

        // `ref_duplicado` é a devolução já feita num retry: idempotência, não erro.
        if ('movement' in entrada) {
          stock.push((entrada as { movement: InventoryMovement }).movement)
        } else if (entrada.error !== 'ref_duplicado') {
          return { error: entrada.error }
        }
      }

      let finance: FinanceEntry | null = null

      if (estorno.financeiro) {
        const lancado = await deps.finance.append(estorno.financeiro)

        if ('entry' in lancado) {
          finance = lancado.entry
        } else if (lancado.error !== 'ref_duplicado') {
          return { error: lancado.error }
        }
      }

      return { finance, sale: venda, stock }
    }
  )
}

/** Saldo de um SKU, para a tela mostrar disponibilidade ao montar o pedido. */
export async function saldoDoSku(deps: Pick<SalesDeps, 'inventory'>, sku: string, tenantId?: string): Promise<number> {
  const lista = await deps.inventory.balances(tenantId)

  return typeof lista[sku] === 'number' ? lista[sku] : 0
}

/** Reexport para conveniência de teste: mesma regra, sem IPC. */
export { balanceFor }
