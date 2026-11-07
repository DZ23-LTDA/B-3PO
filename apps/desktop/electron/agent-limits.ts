// Limites de execução de agente (rodada 141).
//
// O QUE A AUDITORIA ACHOU
//
//   correlation_id  15 ocorrências — existe
//   approval        18 — existe
//   task_id          0
//   execution_id     0
//   parent_execution_id 0
//   concorrência     0
//   max_retries      0
//
// O GOAL diz, no item 22: "Limitar concorrência, profundidade, duração, retries, consumo, ferramentas.
// NÃO PERMITIR LOOPS INFINITOS."
//
// Sem `parent_execution_id` não há como medir profundidade; sem profundidade, um agente que delega para si
// mesmo (ou para outro que delega de volta) roda para sempre e **gasta o dinheiro do proprietário** até
// alguém desligar a máquina.
//
// POR QUE A PROTEÇÃO FICA AQUI E NÃO NO PROMPT
//
// Pedir ao modelo "não entre em loop" é uma sugestão. Um limite conferido antes de cada execução é uma regra.
// A diferença aparece exatamente no dia em que o modelo ignora a sugestão.

/** Por que uma execução não pode começar. Cada motivo é acionável por quem oper. */
export type MotivoBloqueio =
  | 'concorrencia_maxima'
  | 'duracao_maxima'
  | 'profundidade_maxima'
  | 'sem_credencial'

export interface LimitesAgente {
  /** Execuções simultâneas do mesmo bot. */
  concorrencia: number
  /** Tempo máximo de uma execução, em ms. */
  duracao_ms: number
  /** Quantas delegações encadeadas são permitidas. 0 = o bot não delega. */
  profundidade: number
  /** Tentativas por tarefa antes de desistir. */
  retries: number
}

/**
 * Padrões conservadores.
 *
 * Um único nível de delegação por padrão: o caso comum é "gerente pede para o especialista", e não "cadeia de
 * cinco agentes". Quem precisar de mais eleva o limite de propósito — e vê o número.
 */
export const LIMITES_PADRAO: LimitesAgente = {
  concorrencia: 3,
  duracao_ms: 5 * 60_000,
  profundidade: 1,
  retries: 2
}

export const STATUS_EXECUCAO = ['pendente', 'executando', 'concluida', 'falhou', 'cancelada'] as const

export type StatusExecucao = (typeof STATUS_EXECUCAO)[number]

/** Uma execução de agente, rastreável. */
export interface Execucao {
  /** Id desta execução. */
  execution_id: string
  /** A execução que pediu esta. `null` na raiz. É o que permite medir profundidade. */
  parent_execution_id: string | null
  /** Quem é o dono: o bot que executa. */
  owner: string
  /**
   * r23 do V5 — a sessão do Hermes que executa esta tarefa. `null` enquanto não há executor.
   *
   * É o vínculo que faltava para o G2: a execução nasce `pendente` e **nada a executa**. Este campo
   * é onde a sessão real é registrada quando existir. Opcional para que registros antigos continuem
   * carregando (a validação em `agent-execution-store` não o exige).
   */
  session_id?: string | null
  /** Quando começou. `null` enquanto pendente. */
  started_at: number | null
  status: StatusExecucao
  /** Tentativas já feitas desta tarefa. */
  tentativas: number
  /** Agrupa execuções da mesma tarefa do usuário. */
  task_id: string
}

/**
 * Profundidade de uma execução: quantos ancestrais ela tem.
 *
 * Percorre a cadeia de `parent_execution_id`. Um ciclo na cadeia (A pede B, B pede A) é tratado como
 * profundidade máxima — não como zero: um ciclo é justamente o caso que precisa parar.
 */
export function profundidadeDe(execucao: Execucao, todas: readonly Execucao[]): number {
  const porId = new Map(todas.map(e => [e.execution_id, e]))
  const visitados = new Set<string>()
  let atual = execucao.parent_execution_id
  let profundidade = 0

  while (atual) {
    if (visitados.has(atual)) return Number.MAX_SAFE_INTEGER

    visitados.add(atual)

    const pai = porId.get(atual)

    if (!pai) return profundidade + 1

    profundidade++

    if (profundidade > todas.length) return Number.MAX_SAFE_INTEGER

    atual = pai.parent_execution_id
  }

  return profundidade
}

export interface ConsultaLimite {
  /** Execução que se quer iniciar. */
  candidata: Execucao
  /** Se o bot tem credencial de provider configurada. */
  credencial: boolean
  limites?: LimitesAgente
  /** Todas as execuções conhecidas, para medir profundidade. */
  todas: readonly Execucao[]
  /** Agora (epoch ms) — injetado para o teste ser estável. */
  agora: number
}

/**
 * Decide se a execução pode começar.
 *
 * A ordem dos motivos importa para a mensagem: credencial primeiro (é o que o operador resolve mais rápido),
 * depois profundidade (o loop), depois concorrência, depois duração.
 *
 * `null` significa "pode". Devolver um motivo em vez de `false` é o que permite a tela dizer **o que fazer**.
 */
export function bloqueioParaIniciar(consulta: ConsultaLimite): MotivoBloqueio | null {
  const limites = consulta.limites ?? LIMITES_PADRAO

  if (!consulta.credencial) return 'sem_credencial'

  // Ciclo ou cadeia longa: o caso que o GOAL chama de loop infinito.
  if (profundidadeDe(consulta.candidata, consulta.todas) > limites.profundidade) return 'profundidade_maxima'

  if (consulta.candidata.tentativas > limites.retries) return 'profundidade_maxima'

  /*
   * r5 do V5 (A-13) — a vaga é ocupada por **`pendente` ou `executando`**.
   *
   * Antes, `iniciar()` gravava `executando` justamente para esta conta fechar. Mas aí o status mentia
   * na tela. Separando as duas coisas: a reserva (vaga) é imediata; a execução é de quem executa.
   *
   * Se só `executando` contasse, uma tarefa criada e ainda não iniciada não ocuparia vaga — e o
   * limite de concorrência deixaria passar N delegações simultâneas.
   */
  const ocupaVaga = (s: string): boolean => s === 'executando' || s === 'pendente'
  const simultaneas = consulta.todas.filter(
    e => ocupaVaga(e.status) && e.owner === consulta.candidata.owner
  ).length

  if (simultaneas >= limites.concorrencia) return 'concorrencia_maxima'

  // Execução que passou do tempo máximo continua "executando" até alguém a matar; ela conta como uma vaga
  // ocupada e o motivo mostra isso, em vez de o operador achar que há vaga livre.
  /*
   * A **duração** é outra pergunta: só `executando` tem relógio correndo. Uma tarefa `pendente` não
   * tem executor, então acusar timeout nela seria inventar um problema que não existe.
   */
  /*
   * r43 do V5 — a duração é por **tarefa**, não global.
   *
   * Antes: `consulta.todas.some(...)`. Uma execução `executando` travada em QUALQUER tarefa
   * bloqueava TODA delegação nova, de qualquer agente. Medido: a execução da r37 (vinculada a uma
   * sessão de teste) ficou `executando` e a delegação seguinte devolveu `duracao_maxima` — mesmo
   * sendo outra tarefa.
   *
   * O que a regra quer dizer é "esta tarefa já tem uma execução presa"; não é "o produto inteiro
   * está parado". Escopo por `task_id` mantém a intenção sem transformar um travamento local em
   * indisponibilidade global.
   */
  const estourou = consulta.todas.some(
    e =>
      e.status === 'executando' &&
      e.task_id === consulta.candidata.task_id &&
      e.started_at !== null &&
      consulta.agora - e.started_at > limites.duracao_ms
  )

  if (estourou) return 'duracao_maxima'

  return null
}

/** Texto para a tela. Sempre diz o que fazer, não só o que está errado. */
export function bloqueioTexto(motivo: MotivoBloqueio): string {
  const textos: Record<MotivoBloqueio, string> = {
    concorrencia_maxima: 'Este bot já está executando o máximo de tarefas ao mesmo tempo. Aguarde uma terminar.',
    duracao_maxima: 'Há uma execução acima do tempo máximo. Cancele-a antes de iniciar outra.',
    profundidade_maxima: 'Limite de delegação atingido: esta tarefa já foi delegada vezes demais.',
    sem_credencial: 'Nenhum provedor de IA configurado. Configure uma chave para o agente executar.'
  }

  return textos[motivo]
}
