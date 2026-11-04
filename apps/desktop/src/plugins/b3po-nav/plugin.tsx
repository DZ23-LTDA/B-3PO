/**
 * Navegação dos módulos do B-3PO.
 *
 * POR QUE ESTE PLUGIN EXISTE
 *
 * As telas do produto (painel, CRM, produtos, estoque, vendas, financeiro, agenda, compras, empresa,
 * serviços, RH, atendimento, pós-venda, marketing, automações, documentos, privacidade) existem como
 * rotas e resolvem por URL — mas nenhuma delas tinha item no menu lateral.
 *
 * O menu não é montado a partir de `APP_ROUTES`: ele é populado por contribuições na área
 * `SIDEBAR_NAV_AREA` (`{ codicon, label, path }`). Medido antes desta rodada, havia **duas** no código
 * inteiro — o kanban e uma de teste. Resultado: o usuário só chegava aos módulos digitando a URL.
 *
 * Isso não aparecia em teste porque um teste de rota prova que a rota resolve, não que alguém consegue
 * chegar nela. A verificação que faltava era a do mecanismo: quem popula a navegação.
 *
 * ORDEM
 *
 * O painel vem primeiro (é a porta do produto), depois os módulos na ordem em que uma operação acontece:
 * quem entra → o que vende → o que tem → o que deve → quando atende → quem atende.
 *
 * ESTE PLUGIN NÃO CRIA TELA, NEM ROTA, NEM DADO. Ele só aponta para o que já existe.
 */

import { type HermesPlugin, SIDEBAR_NAV_AREA, type SidebarNavContribution } from '@hermes/plugin-sdk'

interface ItemDeMenu {
  codicon: string
  label: string
  path: string
}

/**
 * A ordem é a da operação, não a alfabética: quem abre o produto às 8h quer ver o painel, depois o
 * atendimento que chegou, depois o que vendeu.
 */
const MODULOS: readonly ItemDeMenu[] = [
  { codicon: 'dashboard', label: 'Painel', path: '/painel' },
  { codicon: 'comment-discussion', label: 'CRM', path: '/crm' },
  { codicon: 'inbox', label: 'Atendimento', path: '/atendimento' },
  { codicon: 'calendar', label: 'Agenda', path: '/agenda' },
  { codicon: 'package', label: 'Produtos', path: '/products' },
  { codicon: 'archive', label: 'Estoque', path: '/stock' },
  { codicon: 'cloud-download', label: 'Compras', path: '/compras' },
  { codicon: 'credit-card', label: 'Vendas', path: '/sales' },
  { codicon: 'pulse', label: 'Financeiro', path: '/finance' },
  { codicon: 'briefcase', label: 'Serviços', path: '/servicos' },
  { codicon: 'organization', label: 'RH', path: '/rh' },
  { codicon: 'megaphone', label: 'Marketing', path: '/marketing' },
  { codicon: 'shield', label: 'Pós-venda', path: '/posvenda' },
  { codicon: 'robot', label: 'Agentes', path: '/agentes' },
  { codicon: 'zap', label: 'Automações', path: '/automacoes' },
  { codicon: 'file', label: 'Documentos', path: '/documentos' },
  { codicon: 'law', label: 'Privacidade', path: '/privacidade' },
  { codicon: 'library', label: 'Empresa', path: '/empresa' }
]

const b3poNavPlugin: HermesPlugin = {
  id: 'b3po-nav',
  name: 'B-3PO — Módulos',
  description: 'Itens de menu para os módulos do produto: painel, CRM, operação, financeiro e privacidade.',
  // Ligado por padrão: são as telas do produto. Um menu que o usuário precisa ativar não é menu.
  defaultEnabled: true,
  register(ctx) {
    ctx.registerMany(
      MODULOS.map((item, indice) => ({
        area: SIDEBAR_NAV_AREA,
        data: { codicon: item.codicon, label: item.label, path: item.path } satisfies SidebarNavContribution,
        id: `nav-${item.path.replace('/', '')}`,
        order: 100 + indice
      }))
    )
  }
}

export default b3poNavPlugin
