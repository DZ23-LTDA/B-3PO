/**
 * Os dados da home (r1 do V4) — a regra que impede "zero enganoso".
 *
 * A DECISÃO DE PRODUTO QUE ESTE ARQUIVO IMPLEMENTA
 *
 * O mockup mostrava `142 tarefas`, `12 projetos`, `47 automações`, `6/6 agentes`, `78% / 62% / 91%`.
 * O dono decidiu em 07/11 que **todos aqueles números são ilustrativos** e que a home deve consumir
 * fontes reais, diferenciando *disponível*, *vazio*, *carregando*, *erro* e *indisponível* — e
 * **"não transformar falhas de API em zeros enganosos"**.
 *
 * É por isso que existem CINCO estados e não dois. "Lista vazia" e "não consegui ler" pedem telas
 * diferentes: a primeira oferece criar o primeiro item, a segunda oferece tentar de novo.
 *
 * A REGRA DOS INDICADORES
 *
 * Um indicador só é um número quando a fonte respondeu. Preferimos **`null`** (renderizado como
 * `—`) a `0`: `0 agentes` é uma afirmação sobre o produto, `—` é uma afirmação sobre a leitura.
 * Confundir as duas foi como `listarAgentes()` devolvia `[]` para erro de API.
 */

import type { AgenteDaLista } from '@/api/agents'
import type { ProjetoRow } from '@/api/projetos'

/** Os cinco estados que a tela precisa saber distinguir. */
export type EstadoDeSecao = 'carregando' | 'ok' | 'vazio' | 'erro' | 'indisponivel'

export interface Secao<T> {
  erro?: string
  estado: EstadoDeSecao
  itens: T[]
}

/**
 * Traduz o resultado de um carregamento para o estado da seção.
 *
 * `erroDeLeitura` é o resultado cru do `api/*`: `ok` com lista vazia vira `vazio`, que é um estado
 * **diferente** e tem outra tela.
 */
export function estadoDaSecao<T>(leitura: {
  erro?: string
  estado: 'erro' | 'indisponivel' | 'ok'
  itens: T[]
}): Secao<T> {
  if (leitura.estado === 'indisponivel') return { estado: 'indisponivel', itens: [] }

  if (leitura.estado === 'erro') return { erro: leitura.erro, estado: 'erro', itens: [] }

  if (leitura.itens.length === 0) return { estado: 'vazio', itens: [] }

  return { estado: 'ok', itens: leitura.itens }
}

/** A seção ainda não foi carregada. Não é vazio — é "não sei ainda". */
export function secaoCarregando<T>(): Secao<T> {
  return { estado: 'carregando', itens: [] }
}

/** Um indicador que pode não ter sido lido. `null` ⇒ a tela mostra `—`. */
export type Indicador = null | number

export interface IndicadoresDaHome {
  /** Quantos agentes o roster devolveu. `null` quando a leitura falhou ou a ponte não existe. */
  agentes: Indicador
  /** Projetos com status `ativo`. */
  projetosAtivos: Indicador
  /** Projetos com status `concluido`. */
  projetosConcluidos: Indicador
}

/**
 * Deriva os indicadores **apenas** de seções efetivamente lidas.
 *
 * Um projeto cancelado não é "ativo" nem "concluído"; ele existe e não entra em nenhuma das duas
 * contagens — que é o correto: um total que somasse cancelados esconderia trabalho abandonado.
 */
export function indicadores(secoes: {
  agentes: Secao<AgenteDaLista>
  projetos: Secao<ProjetoRow>
}): IndicadoresDaHome {
  /*
   * `ok` E `vazio` são os dois casos em que a fonte RESPONDEU — e só neles o número é uma afirmação
   * sobre o produto. `vazio` é o zero verdadeiro; `erro`, `indisponivel` e `carregando` são ausência
   * de informação e viram `null` (renderizado `—`).
   *
   * A primeira versão desta função contava só `ok` e devolvia `null` para lista vazia — o próprio
   * teste pegou, porque `0` e "não sei" não podem compartilhar a mesma cara.
   */
  const lido = (estado: EstadoDeSecao): boolean => estado === 'ok' || estado === 'vazio'

  const projetosLidos = lido(secoes.projetos.estado)

  return {
    agentes: lido(secoes.agentes.estado) ? secoes.agentes.itens.length : null,
    projetosAtivos: projetosLidos
      ? secoes.projetos.itens.filter(p => p.status === 'ativo').length
      : null,
    projetosConcluidos: projetosLidos
      ? secoes.projetos.itens.filter(p => p.status === 'concluido').length
      : null
  }
}

/**
 * A frase de uma seção vazia, por seção.
 *
 * Vazio precisa dizer **por que** está vazio e **o que fazer** — "Nenhum item" é um beco.
 */
export type VazioDeSecao = 'agentes' | 'projetos'

/** Ordena os projetos do mais recente para o mais antigo, sem mutar a origem. */
export function projetosPorRecencia(projetos: readonly ProjetoRow[], limite = 3): ProjetoRow[] {
  return [...projetos]
    .sort((a, b) => (b.updated_at || b.created_at) - (a.updated_at || a.created_at))
    .slice(0, limite)
}

/**
 * A inicial de um nome, para o avatar textual.
 *
 * Sem imagem de agente, a letra é o avatar — e ela precisa existir mesmo para nome vazio, em vez de
 * renderizar um círculo em branco.
 */
export function inicialDoNome(nome: string): string {
  const limpo = (nome ?? '').trim()

  return limpo ? limpo.slice(0, 1).toUpperCase() : '?'
}
