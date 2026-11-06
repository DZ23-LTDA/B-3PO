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

import { type ActorRow, whoami } from '@/api/admin'
import { modulosDoAmbiente } from '@/lib/ambiente'
import { menuDoAtor } from '@/lib/nav-rbac'
import { $ambiente } from '@/store/ambiente'

interface ItemDeMenu {
  codicon: string
  label: string
  path: string
  /**
   * O grupo do §13:429-438 (r122 do GOAL V2).
   *
   * **Obrigatório, e é o que o comentário fazia antes.** A r92 agrupou por ordem e comentário porque
   * `SidebarNavContribution` não tem campo de grupo — e continua não tendo. **O campo existe aqui**,
   * na lista do produto, e é consumido por `lib/ambiente.ts` para filtrar por ambiente.
   *
   * **O SDK não precisa saber**: a contribuição continua `{ codicon, label, path }`. O grupo é
   * informação **do produto sobre si mesmo**, não do contrato da sidebar.
   *
   * E ele resolve o que o comentário não resolvia: **um teste pode verificar** que todo módulo tem
   * grupo, que os grupos são os do ambiente, e que nenhum rótulo se repete.
   */
  grupo: string
}

/**
 * A ordem é a da pergunta do usuário, não a alfabética nem a do mapa de módulos.
 *
 * `Empresa` vem logo depois de `Painel`: é o cadastro que dá contexto a tudo o mais. Um produto que
 * abre no painel sem empresa cadastrada não sabe dizer a moeda, o fuso nem o imposto.
 */
const MODULOS: readonly ItemDeMenu[] = [
    // OS GRUPOS DO §13 (r92 do GOAL V2).
    //
    // O §13:429-438 manda agrupar os modulos por FLUXO DE TRABALHO no Modo Empresa. Sem um campo
    // grupo no SDK, os comentarios fazem o papel: a ordem E o agrupamento, e o test prova que
    // nao ha buraco nem duplicata.
    //
    // E ele corrige uma ambiguidade que a r91 criou: label: 'Organização' aparecia DUAS vezes
    // (/empresa e /organizacao). O §13:444-445 proibe exatamente essa confusao.

    // 1. VISAO GERAL
    { codicon: 'dashboard', label: 'Painel', path: '/painel' , grupo: 'Visão geral' },
    // r92: 'Empresa' e o AMBIENTE do §13:417, e vem logo apos o Painel - e o contexto de tudo o
    // que segue. A CONFIGURACAO da organizacao e 'Estrutura', que fica no ultimo grupo (§13:437).
    { codicon: 'library', label: 'Empresa', path: '/empresa' , grupo: 'Visão geral' },
    // r98: a busca global (§13:450). Fica na visao geral porque e uma porta de entrada, como o Painel.
    { codicon: 'search', label: 'Busca', path: '/busca' , grupo: 'Visão geral' },

    // 2. OPERACAO - o que chega e quem atende
    //
    // overview, indicadores e tempo de resposta) e O MENU NAO TINHA ENTRADA. A tela foi criada
    //
    { codicon: 'inbox', label: 'Atendimento', path: '/atendimento' , grupo: 'Operação' },
    { codicon: 'calendar', label: 'Agenda', path: '/agenda' , grupo: 'Operação' },
    // r92: 'Serviços' e 'RH' sobem para Operacao. O §13:432 os poe aqui, e nao junto de 'Comercio':
    // o servico prestado e a equipe que presta sao operacao, nao venda de produto.
    { codicon: 'briefcase', label: 'Serviços', path: '/servicos' , grupo: 'Operação' },
    { codicon: 'organization', label: 'RH', path: '/rh' , grupo: 'Operação' },

    // 3. COMERCIO - o que eu vendo, tenho, compro e recebo
    { codicon: 'package', label: 'Produtos', path: '/products' , grupo: 'Comércio' },
    { codicon: 'archive', label: 'Estoque', path: '/stock' , grupo: 'Comércio' },
    { codicon: 'cloud-download', label: 'Compras', path: '/compras' , grupo: 'Comércio' },
    { codicon: 'credit-card', label: 'Vendas', path: '/sales' , grupo: 'Comércio' },
    // r60: a entrega e a ultima etapa do vertical - a venda registra, a entrega leva.
    { codicon: 'rocket', label: 'Entregas', path: '/entregas' , grupo: 'Comércio' },
    { codicon: 'pulse', label: 'Financeiro', path: '/finance' , grupo: 'Comércio' },

    // 4. TRABALHO - a secao que o §13 nao previu.
    //
    // O §13 foi escrito antes do §12, entao nao tem grupo para projeto e trabalho pontual. Eles nao
    // sao 'comercio' nem 'configuracao': sao o trabalho que atravessa os dois. A secao existe, e a
    // ausencia dela no texto do GOAL esta dita aqui em vez de escondida.
    { codicon: 'checklist', label: 'Projetos', path: '/projetos' , grupo: 'Trabalho' },
    { codicon: 'checklist', label: 'Trabalhos', path: '/trabalhos' , grupo: 'Trabalho' },

    // 5. CRESCIMENTO - como eu apareco e como o cliente fica
    { codicon: 'megaphone', label: 'Marketing', path: '/marketing' , grupo: 'Crescimento' },
    { codicon: 'shield', label: 'Pós-venda', path: '/posvenda' , grupo: 'Crescimento' },

    // 6. INTELIGENCIA E AUTOMACAO
    { codicon: 'robot', label: 'Agentes', path: '/agentes' , grupo: 'Inteligência' },
    { codicon: 'zap', label: 'Automações', path: '/automacoes' , grupo: 'Inteligência' },
    { codicon: 'lightbulb', label: 'Sofia', path: '/sofia' , grupo: 'Inteligência' },
    { codicon: 'file', label: 'Documentos', path: '/documentos' , grupo: 'Inteligência' },

    // 7. CONFIGURACAO DA ORGANIZACAO
    //
    // r92: /empresa volta a se chamar **Empresa** - e o AMBIENTE do §13:417, nao a configuracao.
    // /organizacao passa a se chamar **Estrutura** - nome preciso do que ela e (quem faz o que),
    // e sem colidir com nenhum outro rotulo.
    //
    // A ROTA de /empresa continua: trocar quebraria links e deeplinks, e o §13:456 manda mapear
    // consumidores antes de remover. O rotulo resolve sem remover nada.
    { codicon: 'organization', label: 'Estrutura', path: '/organizacao' , grupo: 'Configuração' },
    { codicon: 'law', grupo: 'Configuração', label: 'Privacidade', path: '/privacidade' }
  ]

/**
 * O menu como DADO, para que a regra do ambiente (`lib/ambiente.ts`) e os testes possam lê-lo.
 *
 * A contribuição da sidebar continua `{ codicon, label, path }` — o grupo é informação do produto
 * sobre si mesmo, e não vaza para o contrato do SDK.
 */
export const MODULOS_DO_PRODUTO: readonly ItemDeMenu[] = MODULOS
const b3poNavPlugin: HermesPlugin = {
  id: 'b3po-nav',
  name: 'B-3PO — Módulos',
  description: 'Itens de menu para os módulos do produto: painel, empresa, operação, financeiro e privacidade.',
  // Ligado por padrão: são as telas do produto. Um menu que o usuário precisa ativar não é menu.
  defaultEnabled: true,
  register(ctx) {
    const registrar = (itens: readonly ItemDeMenu[]): (() => void) =>
      ctx.registerMany(
        itens.map((item, indice) => ({
          area: SIDEBAR_NAV_AREA,
          // r265: o grupo vai junto. O contrato do SDK ganhou group? (routes.ts), entao o
          // agrupamento que existia so em comentario agora chega a barra lateral.
          data: {
            codicon: item.codicon,
            label: item.label,
            path: item.path,
            ...(item.grupo ? { group: item.grupo } : {})
          } satisfies SidebarNavContribution,
          id: `nav-${item.path.replace('/', '')}`,
          order: 100 + indice
        }))
      )

    /**
     * r171 do GOAL V2: o menu segue o nível do ator — e `register` é SÍNCRONO.
     *
     * `register: (ctx) => void`: não há como esperar o `whoami()` aqui. Mas **`registerMany` devolve um disposer**,
     * e é isso que torna a montagem possível: **registra o menu inteiro agora** (a r170 diz que sem ator o menu
     * aparece inteiro), e **se o ator chegar sem `read`, desfaz e registra a lista vazia**.
     *
     * **A ordem importa**: primeiro tudo, depois o filtro. Se fosse ao contrário, uma ponte lenta deixaria a barra
     * vazia — e um menu vazio por erro de carregamento é menos seguro e menos diagnóstico que o menu completo.
     *
     * r267 — AS DUAS FONTES, NESTA ORDEM
     *
     *  1. **O AMBIENTE** (`store/ambiente`): recorta o menu pelo contexto escolhido. É navegação.
     *  2. **O RBAC** (`lib/nav-rbac`): esconde o que o ator não pode LER. É permissão.
     *
     * **Ambiente primeiro, permissão depois** — e a ordem não é arbitrária: o RBAC é a única
     * porta, então ele tem de ser o ÚLTIMO a falar. Filtrar por permissão e depois recortar
     * por ambiente daria o mesmo resultado hoje, mas inverteria a mensagem: um item escondido
     * pelo ambiente pareceria escondido por falta de permissão.
     *
     * **Trocar de ambiente não re-autoriza nada**: `setAmbiente` só muda o recorte; quem decide
     * o acesso continua sendo o `exigirAtor` de cada canal.
     */
    let desfazer = registrar(MODULOS)

    /**
     * O menu para o ambiente ativo, já filtrado pelo ator.
     *
     * **Sem ator, o recorte de ambiente continua e o RBAC não esconde nada.** A r170 diz que
     * sem ator o menu aparece inteiro — e "inteiro" aqui significa **inteiro dentro do
     * ambiente**: `menuDoAtor` devolve `[]` quando não há ator (`podeLer(null)` é falso), o
     * que é a regra certa para PERMISSÃO e a errada para um null que só quer dizer "a ponte
     * ainda não respondeu". Chamar `menuDoAtor(items, null)` logo no início esvaziava a
     * barra inteira — e foi o que aconteceu na primeira tentativa.
     */
    const montar = (ator: ActorRow | null): readonly ItemDeMenu[] => {
      const doAmbiente = modulosDoAmbiente(MODULOS, $ambiente.get()).dentro

      return ator ? menuDoAtor(doAmbiente, ator) : [...doAmbiente]
    }

    const remontar = (ator: ActorRow | null): void => {
      desfazer()
      desfazer = registrar(montar(ator))
    }

    let ator: ActorRow | null = null
    let primeiroAviso = true

    // O `subscribe` do nanostores chama o listener IMEDIATAMENTE com o valor atual — então a
    // primeira chamada não é uma troca de ambiente, é a leitura inicial. Ignorá-la evita
    // desregistrar/registrar a mesma lista duas vezes na montagem.
    const cancelarAssinatura = $ambiente.subscribe(() => {
      if (primeiroAviso) {
        primeiroAviso = false
        return
      }

      remontar(ator)
    })

    void whoami()
      .then(resposta => {
        ator = resposta
        remontar(ator)
      })
      .catch(() => {
        // Silencioso: sem ator, o menu do ambiente ja esta registrado — o estado seguro (r170).
      })

    ctx.onDispose(() => {
      cancelarAssinatura()
      desfazer()
    })
  }
}

export default b3poNavPlugin
