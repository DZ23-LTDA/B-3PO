/**
 * O contexto que a Sofia recebe (r270) — **G5**.
 *
 * O QUE A MISSÃO PEDE
 *
 * *"Sofia deve receber contexto do ambiente, organização e projeto sem contornar RBAC."*
 *
 * **As três coisas não têm o mesmo dono:**
 *
 * | Peça | Autoridade | Onde está |
 * |---|---|---|
 * | **ambiente** | **esta janela** — é o recorte do menu, não muda dado nem permissão | `store/ambiente` (localStorage) |
 * | **projeto** | **esta janela** — o escopo de trabalho que a pessoa escolheu | `store/project-scope` (persistido) |
 * | **ator** | **o backend** — `hermes:admin:whoami` | `api/admin` |
 *
 * **Organização não existe como campo separado no renderer**: o `ActorRow` identifica a pessoa e
 * os escopos dela, e o `tenant_id` acompanha o plano no BACKEND (`PlanoComGrafo.tenant_id`). Criar
 * um `organizacao` no renderer seria inventar uma segunda fonte para um dado que o servidor já
 * tem — e as duas divergiriam. **O contexto daqui diz "onde estou e o que posso ver"; quem sabe
 * "de quem é este dado" continua sendo o backend.**
 *
 * POR QUE ISSO NÃO É UMA SEGUNDA PERMISSÃO (e o teste guarda)
 *
 * **O contexto é DESCRITIVO.** Ele não libera canal, não filtra resposta e não é lido por
 * `permission-guard`. O que ele faz é **dizer à Sofia em que recorte a pergunta foi feita** —
 * "no ambiente Empresa, no projeto X" — para a resposta não vir de outro contexto.
 *
 * **E o recorte é LIMITADO pelo que o ator pode ler.** Se o ator não tem `read`, o contexto não
 * carrega escopo nenhum: `acesso: 'negado'`. Não há caminho em que este arquivo **conceda**
 * alguma coisa — só caminhos em que ele **descreve menos**.
 */

import type { ActorRow } from '@/api/admin'

import { AMBIENTE_LABEL, type Ambiente } from './ambiente'
import { podeLer } from './nav-rbac'

/** O escopo de projeto "todos" — o mesmo valor de `ALL_PROJECTS` em `store/project-scope`. */
export const PROJETO_TODOS = '__all_projects__'

export interface ContextoDaSofia {
  /**
   * `autorizado` quando o ator pode ler; `negado` quando não pode; `desconhecido` quando a ponte
   * ainda não respondeu (o `whoami` devolve `null` nesse instante).
   */
  acesso: 'autorizado' | 'desconhecido' | 'negado'
  ambiente: Ambiente
  /** O rótulo humano do ambiente — é o que a Sofia usa para falar, não o id. */
  ambienteRotulo: string
  /** O projeto, ou `null` quando o escopo é "todos os projetos". */
  projeto: null | string
  /** Os escopos de DOMÍNIO do ator, já os únicos que ele pode ler. Vazio quando não há acesso. */
  escopos: string[]
}

/**
 * Monta o contexto. **Função pura**, para o teste poder exercitar o caso negado sem montar React.
 *
 * **A ordem das guardas importa**: o `null` do ator é "ainda não sei" (a ponte não respondeu) e o
 * ator sem `read` é "sei, e não pode". Os dois resultam em `escopos: []`, mas `acesso` os separa —
 * porque **"não sei" e "não pode" pedem reações diferentes** na tela: a primeira é espera, a
 * segunda é fim de linha.
 */
export function contextoDaSofia(input: {
  ambiente: Ambiente
  ator: ActorRow | null
  projeto: null | string
}): ContextoDaSofia {
  const { ambiente, ator, projeto } = input

  const base = {
    ambiente,
    ambienteRotulo: AMBIENTE_LABEL[ambiente],
    projeto: projeto === PROJETO_TODOS || !projeto ? null : projeto
  }

  if (!ator) {
    return { ...base, acesso: 'desconhecido', escopos: [] }
  }

  if (!podeLer(ator)) {
    return { ...base, acesso: 'negado', escopos: [] }
  }

  return { ...base, acesso: 'autorizado', escopos: [...(ator.scopes ?? [])] }
}

/**
 * A linha que a tela mostra — e que a Sofia recebe como contexto.
 *
 * **Uma frase, não um JSON**: um objeto despejado na tela não informa ninguém, e um objeto
 * despejado no prompt vira ruído. O que a Sofia precisa é "onde estou".
 */
export function descreverContexto(contexto: ContextoDaSofia): string {
  const onde = contexto.projeto ? `${contexto.ambienteRotulo} · projeto ${contexto.projeto}` : contexto.ambienteRotulo

  if (contexto.acesso === 'negado') return `${onde} · sem permissão de leitura`
  if (contexto.acesso === 'desconhecido') return `${onde} · identidade ainda não resolvida`

  // "0 escopos" é informação: quer dizer que o ator existe e lê, mas nenhum domínio está
  // liberado para ele — e sem isso a linha `|` ficaria idêntica à de quem tem escopos.
  return contexto.escopos.length > 0
    ? `${onde} · ${contexto.escopos.length} escopos`
    : `${onde} · nenhum escopo liberado`
}
