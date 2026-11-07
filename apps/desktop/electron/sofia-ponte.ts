// A ponte entre o plano de Sofia e a execução do Hermes (r20 do GOAL V2).
//
// Passo 4 dos cinco da spec. É o passo que **preenche o `parent_execution_id`** — o campo que existe no
// tipo `IniciarInput` / `ExecucaoGravada` desde que o `agent-execution-store` nasceu e que, medido na
// r16, **nada em todo o repositório preenchia**.
//
// O QUE ESTA PONTE É
//
// Ela traduz "tarefa do plano" em "execução do runtime". Não executa nada: chama `execucoes.iniciar`, que
// já sabe checar credencial, limite e concorrência. Sofia **não** duplica essas regras.
//
// A INVARIANTE QUE ESTA PONTE PROVA (spec §4, item 1)
//
// `execucao_id` **aponta**, não copia. O status da tarefa não carrega uma cópia do status da execução:
// `lerStatus` consulta o store de execuções **a cada chamada**. Se copiasse, os dois divergiriam no
// primeiro erro de rede — e a prestação de contas mentiria sobre o que aconteceu.
//
// O QUE ELA **NÃO** FAZ
//
//   - não escolhe agente: isso é decisão do plano (`tarefa.agente_id`)
//   - não verifica política: o canal já passou pelo `exigirAtor`
//   - não ordena tarefas: o grafo (passo 2) já responde `tarefasProntas`
//   - não executa o turno: quem executa é o Hermes

import type { ExecucaoStore, IniciarInput } from './agent-execution-store'

/** O que a ponte precisa do plano. Estrutural, para não acoplar ao store inteiro. */
export interface PlanoParaDelegar {
  /** O objetivo do plano, quando o store o tem. Entra no prompt da sessão. */
  objetivo?: string
  plano_id: string
  tarefas: {
    agente_id: null | string
    depende_de: string[]
    execucao_id: null | string
    status: string
    tarefa_id: string
    /** O título da tarefa, quando o store o tem. É o que a sessão recebe como pedido. */
    titulo?: string
  }[]
}

export interface SofiaPonteDeps {
  execucoes: ExecucaoStore
  /** Persiste `execucao_id` na tarefa. É o `atualizarTarefa` do `SofiaStore`. */
  gravarExecucao: (tarefaId: string, execucaoId: string) => Promise<unknown>
}

/**
 * O que a sessão do Hermes recebe como pedido.
 *
 * r24 do V5: a delegação **não** cria a sessão — o cliente canônico (`session.create`, RPC) é do
 * renderer, e reescrevê-lo no main duplicaria o que o goal manda reutilizar. O que a ponte faz é
 * devolver o pedido, para que quem cria a sessão não invente um texto próprio.
 *
 * `null` quando o plano não trouxe título: inventar um seria alucinar o pedido, e o G5 nomeia
 * exatamente isso.
 */
function promptDaTarefa(
  plano: PlanoParaDelegar,
  tarefa: { tarefa_id: string; titulo?: string }
): null | string {
  const titulo = (tarefa.titulo ?? '').trim()

  if (!titulo) return null

  const objetivo = (plano.objetivo ?? '').trim()

  return objetivo ? `${titulo}\n\nObjetivo do plano: ${objetivo}` : titulo
}

export type Delegacao =
  | { error: string }
  | {
      execucao_id: string
      parent_execution_id: null | string
      /** O pedido para a sessão. `null` quando o plano não trouxe título. */
      prompt: null | string
      tarefa_id: string
    }

/**
 * O `parent_execution_id` de uma tarefa: a execução da **primeira** dependência concluída.
 *
 * Por que a primeira e não todas: `parent_execution_id` é uma **árvore**, não um grafo. Um nó com duas
 * dependências não pode ter dois pais. Escolher o primeiro na ordem do `depende_de` é determinístico, e
 * o que se perde (a segunda aresta) já está preservado no próprio `depende_de` do plano.
 *
 * `null` quando a tarefa não depende de nada, ou quando nenhuma dependência rodou — nos dois casos ela é
 * raiz da sua subárvore.
 */
export function paiDaTarefa(tarefa: PlanoParaDelegar['tarefas'][number], plano: PlanoParaDelegar): null | string {
  for (const dep of tarefa.depende_de) {
    const anterior = plano.tarefas.find(t => t.tarefa_id === dep)

    if (anterior?.execucao_id) return anterior.execucao_id
  }

  return null
}

/**
 * Uma tarefa pode ser delegada?
 *
 * Três recusas nomeadas, e cada uma diz o que fazer:
 *   `tarefa_inexistente` — id errado
 *   `ja_delegada`       — a tarefa já tem execução; delegar de novo duplicaria o trabalho
 *   `dependencias_pendentes` — o grafo não liberou; esperar, não forçar
 *   `sem_agente`        — o plano não escolheu quem executa
 */
export function motivoDeRecusa(tarefa: PlanoParaDelegar['tarefas'][number], plano: PlanoParaDelegar): null | string {
  if (tarefa.execucao_id) return 'ja_delegada'
  if (!tarefa.agente_id) return 'sem_agente'

  const pendentes = tarefa.depende_de.filter(dep => plano.tarefas.find(t => t.tarefa_id === dep)?.status !== 'concluida')

  if (pendentes.length > 0) return 'dependencias_pendentes'

  return null
}

/**
 * Delega uma tarefa ao runtime.
 *
 * O `execution_id` é **gerado por quem delega**, não pelo runtime: a tarefa precisa saber para onde aponta
 * antes de a execução existir, e o registro é feito pelo chamador (`gravarExecucao`).
 *
 * Se `iniciar` recusar (sem credencial, no limite, concorrência cheia), o erro **sobe como está** — Sofia
 * não transforma "sem credencial" em "plano falhou": são fatos diferentes e a tela precisa mostrar qual.
 */
export async function delegarTarefa(
  deps: SofiaPonteDeps,
  plano: PlanoParaDelegar,
  tarefaId: string,
  opcoes: { agora?: number; credencial: boolean; execution_id?: string }
): Promise<Delegacao> {
  const tarefa = plano.tarefas.find(t => t.tarefa_id === tarefaId)

  if (!tarefa) return { error: 'tarefa_inexistente' }

  const recusa = motivoDeRecusa(tarefa, plano)

  if (recusa) return { error: recusa }

  const parent = paiDaTarefa(tarefa, plano)
  const executionId = opcoes.execution_id ?? `exec-${plano.plano_id}-${tarefaId}`

  const input: IniciarInput = {
    execution_id: executionId,
    owner: tarefa.agente_id as string,
    parent_execution_id: parent,
    task_id: tarefaId
  }

  const r = deps.execucoes.iniciar(input, {
    agora: opcoes.agora,
    credencial: opcoes.credencial
  })

  if (r.error) return { error: r.error }

  await deps.gravarExecucao(tarefaId, executionId)

  return {
    execucao_id: executionId,
    parent_execution_id: parent,
    prompt: promptDaTarefa(plano, tarefa),
    tarefa_id: tarefaId
  }
}

/** O estado real de uma execução, lido agora. `null` quando não existe (ou já foi podada). */
export function lerExecucao(deps: SofiaPonteDeps, execucaoId: string): null | { resultado: string; status: string } {
  const encontrada = deps.execucoes.listar().find(e => e.execution_id === execucaoId)

  if (!encontrada) return null

  return { resultado: encontrada.resultado ?? '', status: encontrada.status }
}

/**
 * O status que a **tarefa** deve ter, derivado da execução.
 *
 * É a prova da invariante: a tarefa não guarda status de execução — esta função o calcula a cada leitura.
 * `null` quando a tarefa ainda não foi delegada (não há execução para consultar).
 *
 * O mapeamento é explícito porque os dois vocabulários são diferentes de propósito: a tarefa fala do
 * **plano** (`executando`, `concluida`), a execução fala do **runtime** (`rodando`, `concluida`, `falhou`,
 * `cancelada`).
 */
export function statusDerivadoDaExecucao(deps: SofiaPonteDeps, execucaoId: null | string): null | string {
  if (!execucaoId) return null

  const execucao = lerExecucao(deps, execucaoId)

  if (!execucao) return null

  switch (execucao.status) {
    case 'concluida':
      return 'concluida'
    case 'falhou':
      return 'falhou'
    case 'cancelada':
      return 'bloqueada'
    case 'rodando':
      return 'executando'
    default:
      return 'executando'
  }
}
