// O catalogo concreto de ferramentas: cada uma chama o store canonico do dominio.
//
// Nao ha store novo aqui. Se uma ferramenta precisasse de dado que o dominio nao guarda, a resposta
// certa seria completar o dominio, nao criar um segundo lugar para o mesmo dado.

import type { AgentTool } from './agent-tools'
import type { CatalogStoreLike } from './catalog-ipc'
import type { FinanceStoreLike } from './finance-ipc'
import type { FiscalProvider } from './fiscal-provider'
import type { FiscalStore } from './fiscal-store'
import type { InventoryStoreLike } from './inventory-ipc'
import type { SalesStoreLike } from './sales-ipc'
import type { ServiceDeskLike } from './service-desk-ipc'

export interface DomainStores {
  catalog?: CatalogStoreLike
  desk?: ServiceDeskLike
  finance?: FinanceStoreLike
  /** Emissor + registro. Sem iscal, o agente nao enxerga nota fiscal. */
  fiscal?: { provider: FiscalProvider; store: FiscalStore }
  inventory?: InventoryStoreLike
  sales?: SalesStoreLike
}

export function buildDomainTools(stores: DomainStores): AgentTool[] {
  const tools: AgentTool[] = []

  if (stores.catalog) {
    const catalog = stores.catalog

    tools.push({
      action: 'read',
      description: 'Lista os produtos ativos do catalogo, com preco e saldo cadastrado.',
      domain: 'catalog',
      name: 'catalog.list',
      run: async () => catalog.list()
    })
  }

  if (stores.inventory) {
    const inventory = stores.inventory

    tools.push({
      action: 'read',
      description: 'Saldos por SKU. O saldo e derivado das movimentacoes, nunca digitado.',
      domain: 'inventory',
      name: 'inventory.balances',
      run: async () => inventory.balances()
    })

    tools.push({
      action: 'prepare',
      description: 'Registra entrada, saida ou ajuste de estoque. Exige motivo e referencia unica.',
      domain: 'inventory',
      name: 'inventory.append',
      run: async args => inventory.append(args)
    })
  }

  if (stores.sales) {
    const sales = stores.sales

    tools.push({
      action: 'prepare',
      description: 'Cria um orcamento ou pedido. O total e derivado dos itens, nunca informado.',
      domain: 'sales',
      name: 'sales.create',
      run: async args => sales.create(args)
    })

    tools.push({
      action: 'read',
      description: 'Lista as vendas do tenant com status e total.',
      domain: 'sales',
      name: 'sales.list',
      run: async () => sales.list()
    })
  }

  if (stores.finance) {
    const finance = stores.finance

    tools.push({
      action: 'read',
      description: 'Totais em aberto, pagos e vencidos. Valores sempre derivados dos lancamentos.',
      domain: 'finance',
      name: 'finance.totals',
      run: async () => finance.totals()
    })

    tools.push({
      action: 'prepare',
      description: 'Lanca uma conta a pagar ou a receber. Pagar de verdade nao passa por aqui.',
      domain: 'finance',
      name: 'finance.append',
      run: async args => finance.append(args)
    })
  }

  if (stores.desk) {
    const desk = stores.desk

    tools.push({
      action: 'read',
      description: 'Fila de atendimento, com atraso e sinalizacao de revisao ja calculados.',
      domain: 'desk',
      name: 'desk.tickets',
      run: async () => desk.list()
    })
  }

  if (stores.fiscal) {
    const fiscal = stores.fiscal

    tools.push({
      action: 'read',
      description: 'Documentos fiscais ja emitidos, com situacao, chave e URL do DANFE.',
      domain: 'fiscal',
      name: 'fiscal.documents',
      run: async () => fiscal.store.list()
    })

    tools.push({
      action: 'read',
      description: 'Qual emissor esta ativo e se ele tem autoridade fiscal. Use antes de prometer nota ao cliente.',
      domain: 'fiscal',
      name: 'fiscal.status',
      run: async () => ({
        homologado: fiscal.provider.homologado,
        id: fiscal.provider.id,
        nome: fiscal.provider.nome
      })
    })

    tools.push({
      action: 'execute',
      description: 'Emite a nota fiscal de uma venda faturada. Quando o emissor e de homologacao, o documento NAO tem validade fiscal - confira fiscal.status antes de dizer ao cliente que a nota saiu.',
      domain: 'fiscal',
      name: 'fiscal.emitir',
      run: async args => {
        const saleId = typeof args['sale_id'] === 'string' ? args['sale_id'] : ''

        if (!saleId) return { error: 'venda_obrigatoria' }

        const kind = args['kind'] === 'nfce' || args['kind'] === 'nfse' ? args['kind'] : 'nfe'

        return fiscal.store.emitir(fiscal.provider, {
          kind,
          payload: { sale_id: saleId },
          ref: 'venda:' + saleId,
          tenant_id: 'local'
        })
      }
    })
  }

  return tools
}