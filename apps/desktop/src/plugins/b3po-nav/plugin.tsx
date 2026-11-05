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
 * ORDEM (r15 do GOAL V2)
 *
 * O proprietário reportou: **"a criação da empresa está misturada com os demais"**. Ele estava certo.
 * `Empresa` (o cadastro: CNPJ, fuso, moeda, impostos) estava na 17ª e última posição, logo depois de
 * `Privacidade` e `Documentos` — três coisas sem nenhuma relação.
 *
 * A ordem agora segue a pergunta que o usuário faz, não o mapa de módulos:
 *
 *   1. **Onde eu estou** — Painel
 *   2. **Quem eu sou** — Empresa. É o cadastro que dá sentido a tudo abaixo: sem empresa, fuso, moeda
 *      e imposto, nenhum dos módulos seguintes tem contexto. Por isso vem ANTES deles.
 *   3. **O que acontece hoje** — Atendimento, Agenda (a operação que chega sozinha)
 *   4. **O que eu vendo e tenho** — Produtos, Estoque, Compras, Vendas, Serviços
 *   5. **O que eu devo e recebo** — Financeiro
 *   6. **Quem faz e como eu apareço** — RH, Marketing, Pós-venda
 *   7. **O que automatiza** — Agentes, Automações
 *   8. **O que registra e protege** — Documentos, Privacidade
 *
 * POR QUE NÃO EM SEÇÕES VISUAIS
 *
 * `SidebarNavContribution` é `{ codicon, label, path, tier? }` — **não tem campo de grupo**. Um
 * separador visual exigiria mudar o SDK da sidebar (novo campo, novo render, migração dos outros dois
 * consumidores: kanban e o de teste).
 *
 * **A ordem resolve o pedido sem essa mudança**, e é o que o proprietário descreveu: o problema era
 * `Empresa` estar *entre* coisas que não são ela — não que faltasse uma linha divisória.
 *
 * Se o agrupamento visual for pedido depois, o lugar é o SDK, não este arquivo.
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
 * A ordem é a da pergunta do usuário, não a alfabética nem a do mapa de módulos.
 *
 * `Empresa` vem logo depois de `Painel`: é o cadastro que dá contexto a tudo o mais. Um produto que
 * abre no painel sem empresa cadastrada não sabe dizer a moeda, o fuso nem o imposto.
 */
const MODULOS: readonly ItemDeMenu[] = [
  // 1. Onde eu estou
  { codicon: 'dashboard', label: 'Painel', path: '/painel' },

  // 2. Quem eu sou — antes dos módulos, porque é o contexto deles (r15)
  // r24 do GOAL V2 / §13: o rótulo passa a ser **Organização**. O §13 cria um ambiente chamado
  // EMPRESA, e manter esta tela rotulada como "Empresa" seria exatamente a confusão que ele proíbe.
  //
  // A ROTA continua `/empresa`: trocá-la quebraria links, deeplinks e o `plugin.test.ts` — o §13 manda
  // mapear consumidores antes de remover, e o rótulo resolve sem remover nada.
  { codicon: 'library', label: 'Organização', path: '/empresa' },

  // 3. O que chega sozinho
  { codicon: 'inbox', label: 'Atendimento', path: '/atendimento' },
  { codicon: 'calendar', label: 'Agenda', path: '/agenda' },

  // 4. O que eu vendo e tenho
  { codicon: 'package', label: 'Produtos', path: '/products' },
  { codicon: 'archive', label: 'Estoque', path: '/stock' },
  { codicon: 'cloud-download', label: 'Compras', path: '/compras' },
  { codicon: 'credit-card', label: 'Vendas', path: '/sales' },
  { codicon: 'briefcase', label: 'Serviços', path: '/servicos' },

  // 5. O que eu devo e recebo
  { codicon: 'pulse', label: 'Financeiro', path: '/finance' },

  // 6. Quem faz e como eu apareço
  { codicon: 'organization', label: 'RH', path: '/rh' },
  { codicon: 'megaphone', label: 'Marketing', path: '/marketing' },
  { codicon: 'shield', label: 'Pós-venda', path: '/posvenda' },

  // 7. O que automatiza
  { codicon: 'robot', label: 'Agentes', path: '/agentes' },
  { codicon: 'zap', label: 'Automações', path: '/automacoes' },
  { codicon: 'lightbulb', label: 'Sofia', path: '/sofia' },

  // 8. O que registra e protege
  { codicon: 'file', label: 'Documentos', path: '/documentos' },
  { codicon: 'law', label: 'Privacidade', path: '/privacidade' }
]

const b3poNavPlugin: HermesPlugin = {
  id: 'b3po-nav',
  name: 'B-3PO — Módulos',
  description: 'Itens de menu para os módulos do produto: painel, empresa, operação, financeiro e privacidade.',
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
