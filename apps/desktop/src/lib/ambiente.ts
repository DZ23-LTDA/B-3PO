// O AMBIENTE (r121 do GOAL V2).
//
// O QUE O §13:413-419 PEDE
//
// *"Não escolher a opção A/B sugerida pelo DeepSeek como arranjo definitivo. **Adotar navegação contextual por
// ambiente.** Ambientes principais: 1. EMPRESA — criar, administrar e operar negócios. 2. ENGENHARIA E CRIACAO
// — desenvolver SaaS, sites, apps, APIs, jogos, sistemas e produtos."*
//
// O QUE EXISTIA
//
// A r92 agrupou o menu em **7 grupos** — e isso é o **Modo Empresa**. O que **não existia** era o **ambiente**:
// o menu é **um só**, e um desenvolvedor vendo "Compras, Estoque, Financeiro" **não tem onde dizer que está
// construindo um site**.
//
// A DECISÃO — e ela é sobre o que **NÃO** muda
//
// **O ambiente filtra o MENU; ele não esconde CAPACIDADE.** Um módulo fora do ambiente ativo **continua
// existindo**: a rota responde, o canal responde, o dado está lá.
//
// **Trocar de ambiente não é trocar de produto** — é trocar **o que a barra lateral mostra**. E essa distinção
// é o que impede o seletor de virar uma segunda permissão disfarçada: **RBAC já existe (r66, r75), e um
// seletor de menu não é RBAC.**
//
// O QUE ESTE ARQUIVO **NÃO** FAZ
//
// **Não valida nada.** Filtrar menu não é autorizar: `permission-guard` continua sendo a única porta, e um item
// escondido **não fica mais seguro** — só menos visível.

/**
 * Os seis ambientes (r265 — a missão final).
 *
 * **A r121 definiu dois** (`empresa`, `engenharia`) e a missão final nomeia **seis**:
 * **Empresa, Engenharia, Automação, IA e Agentes, Estratégico, Administração.**
 *
 * **A ordem não é alfabética**: é a ordem em que a pessoa entra. **Empresa primeiro** porque é
 * o padrão de quem abre o produto para trabalhar; **Administração por último** porque é onde se
 * mexe na plataforma, não no negócio.
 *
 * **Os dois antigos continuam com o mesmo `id`** (`empresa`, `engenharia`): quem já tinha a
 * preferência salva **não perde nada**, e o `isAmbiente` reconhece os dois como sempre.
 */
export const AMBIENTES = [
  'empresa',
  'engenharia',
  'automacao',
  'ia',
  'estrategico',
  'administracao'
] as const

export type Ambiente = (typeof AMBIENTES)[number]

export function isAmbiente(valor: unknown): valor is Ambiente {
  return typeof valor === 'string' && (AMBIENTES as readonly string[]).includes(valor)
}

export const AMBIENTE_LABEL: Record<Ambiente, string> = {
  empresa: 'Empresa',
  engenharia: 'Engenharia',
  automacao: 'Automação',
  ia: 'IA e Agentes',
  estrategico: 'Estratégico',
  administracao: 'Administração'
}

/**
 * Os grupos de cada ambiente.
 *
 * **Os 7 grupos do §13:429-438 são o Modo Empresa** — e eles vieram do texto do GOAL, não de uma escolha.
 *
 * **O Modo Engenharia tem 4.** O §13:452-454 lista oito coisas (projetos, repositórios, issues, arquitetura,
 * código, testes, CI/CD, artefatos) — e elas **cabem em quatro grupos**, porque **três das oito são a mesma
 * tela vista de ângulos diferentes** (`/artifacts` mostra o que CI/CD produziu).
 *
 * **Um grupo por tela seria um menu de oito itens para uma pessoa que constrói uma coisa.**
 */
const GRUPOS_POR_AMBIENTE: Record<Ambiente, readonly string[]> = {
  empresa: ['Visão geral', 'Operação', 'Comércio', 'Trabalho', 'Crescimento', 'Inteligência', 'Configuração'],
    /*
     * r14 do V4 — a declaração passa a refletir o que RENDERIZA.
     *
     * Antes: `['Visão geral', 'Construção', 'Qualidade', 'Configuração']`. Os dois grupos do meio
     * nunca tiveram módulo na barra — `Construção` e `Qualidade` só existem como conceito em
     * `lib/engenharia.ts`, que o mapa de `/ambiente` mostra. Resultado medido: escolher Engenharia
     * mostrava **VISÃO GERAL + CONFIGURAÇÃO** e nada de engenharia.
     *
     * A correção SOMA, não troca:
     *
     *   - `Construção` e `Qualidade` ficam: são o destino dos módulos de engenharia de verdade
     *     (`/repos`, builds, testes) — hoje nenhum existe na barra, e um grupo sem módulo é
     *     filtrado, então não vira botão morto;
     *   - `Trabalho` e `Inteligência` entram: os módulos que JÁ existem e servem Engenharia
     *     (`Projetos`, `Trabalhos`, `Agentes`, `Automações`) moram nesses grupos, e agora também
     *     pertencem a Engenharia via `tambemEm` no plugin.
     *
     * Antes, sem a segunda metade, escolher Engenharia mostrava VISÃO GERAL + CONFIGURAÇÃO. Medido.
     */
    engenharia: ['Visão geral', 'Construção', 'Qualidade', 'Trabalho', 'Inteligência', 'Configuração'],
  /*
   * r265: os quatro ambientes que a missão final nomeia.
   *
   * **Cada um recebe os grupos que os módulos JÁ existentes usam** — não invento grupo para
   * depois procurar módulo. `Inteligência` é o grupo que o menu do produto dá a Agentes,
   * Automações, Sofia e Documentos; `Trabalho` é o de Projetos e Trabalhos; `Configuração` é
   * o de Estrutura e Privacidade.
   *
   * **O que NÃO tem grupo próprio não entra**: `Relatórios` e `Indicadores` da missão ainda
   * não existem como rota, e um grupo vazio na barra seria um botão que não leva a lugar
   * nenhum — o §5 da missão proíbe exatamente isso.
   */
  automacao: ['Visão geral', 'Inteligência', 'Trabalho'],
  ia: ['Visão geral', 'Inteligência'],
  estrategico: ['Visão geral', 'Inteligência'],
  administracao: ['Visão geral', 'Configuração', 'Trabalho']
}

export function gruposDoAmbiente(ambiente: Ambiente): readonly string[] {
  return GRUPOS_POR_AMBIENTE[ambiente]
}

export interface ModuloDoAmbiente {
  grupo: string
  label: string
  path: string
}

/**
 * Filtra os módulos pelo ambiente.
 *
 * **O "Visão geral" é comum aos dois** — Painel e Busca servem a qualquer ambiente, e esconder o Painel de quem
 * está no Modo Engenharia seria esconder **onde a pessoa está**.
 *
 * **O que sobra fora é dito, não sumido**: `foraDoAmbiente` devolve a lista, para a tela poder dizer *"há N
 * módulos no outro ambiente"* em vez de o menu simplesmente parecer menor.
 *
 * **Genérica desde a r267**: a função só lê `grupo`, então aceita qualquer item que o tenha — o
 * `ItemDeMenu` do plugin (com `codicon`) e o `ModuloDoAmbiente` (sem) passam os dois, e o tipo
 * de retorno preserva o do argumento. Antes ela exigia `ModuloDoAmbiente` e o plugin não
 * conseguia passar o seu próprio tipo sem um cast.
 */
export function modulosDoAmbiente<T extends { grupo: string; tambemEm?: readonly string[] }>(
  modulos: readonly T[],
  ambiente: Ambiente
): { dentro: T[]; fora: T[] } {
  const grupos = new Set(gruposDoAmbiente(ambiente))

  // "Visão geral" é sempre visível: é onde a pessoa se localiza.
  grupos.add('Visão geral')

  /*
   * r14 do V4 — um módulo pode pertencer a MAIS DE UM grupo.
   *
   * O problema que isto resolve: o modo Engenharia declara `Construção` e `Qualidade`, mas
   * `Projetos` estava só em `Trabalho` e `Agentes` só em `Inteligência`. Escolher Engenharia
   * mostrava VISÃO GERAL + CONFIGURAÇÃO e nada de engenharia.
   *
   * **A alternativa seria duplicar a entrada** — e o objetivo proíbe módulos duplicados. Um módulo
   * com dois pertencimentos é a verdade do produto: `Projetos` serve o fluxo `Trabalho` **e** o
   * fluxo `Construção`.
   */
  const pertence = (m: T): boolean =>
    grupos.has(m.grupo) || (m.tambemEm ?? []).some(g => grupos.has(g))

  return { dentro: modulos.filter(pertence), fora: modulos.filter(m => !pertence(m)) }
}

/**
 * A frase que a tela mostra quando há módulos escondidos.
 *
 * **Não é "N módulos ocultos"**: é a informação de que **existe outro ambiente**, e o nome dele — porque um
 * menu menor sem explicação parece um menu quebrado.
 */
export function foraDoAmbiente(modulos: readonly ModuloDoAmbiente[], ambiente: Ambiente): string {
  const { fora } = modulosDoAmbiente(modulos, ambiente)

  if (fora.length === 0) return ''

  /*
   * r103 — com SEIS ambientes, "o outro" deixou de existir.
   *
   * A frase nomeia os ambientes que REALMENTE têm os módulos escondidos. Dizer "do ambiente
   * Empresa" para quem está em `automacao` era o resto de um mundo de dois — a r271 já corrigiu
   * `alternarAmbiente` pelo mesmo motivo, e esta função ficou para trás.
   */
  const outros = AMBIENTES.filter(a => a !== ambiente && modulosDoAmbiente(modulos, a).dentro.length > 0).map(
    a => AMBIENTE_LABEL[a]
  )

  if (outros.length === 0) return `${fora.length} módulo(s) fora deste ambiente.`

  return `${fora.length} módulo(s) do ambiente ${outros.join(' / ')}.`
}

/**
 * O PRÓXIMO ambiente na ordem de `AMBIENTES` — para a tela oferecer a troca.
 *
 * **Não é "o outro"**: com dois ambientes os dois nomes coincidiam e o erro era invisível; com
 * seis, "o outro" não tem resposta. Quem quiser alternar de verdade usa `alternarAmbiente()` do
 * store, que cicla pelos seis.
 */
export function outroAmbiente(ambiente: Ambiente): Ambiente {
  const indice = AMBIENTES.indexOf(ambiente)

  return AMBIENTES[(indice + 1) % AMBIENTES.length]
}
