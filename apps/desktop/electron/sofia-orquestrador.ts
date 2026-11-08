// O orquestrador de tarefas (Sofia) — r22 do GOAL V2, §12.
//
// O QUE O GRAFO DA r18 JÁ RESPONDE, E O QUE ELE NÃO RESPONDE
//
// `sofia-grafo.ts` responde **quais tarefas estão prontas** — dependências satisfeitas. É o `depende_de`
// e nada mais.
//
// O §12 do GOAL pede mais: *"Task Orchestrator controla filas, prioridade, dependência, retry, timeout,
// idempotência, cancelamento, recuperação e auditoria"*.
//
// Dependência: feito (r18). Idempotência: feita (o `ref`/`execucao_id` da r20 não duplica). Auditoria: o
// `permission-guard` já registra. **Faltam prioridade, retry, timeout e cancelamento** — e é deles que
// este arquivo trata.
//
// POR QUE FUNÇÃO PURA DE NOVO
//
// Pela mesma razão do grafo: **o caso ruim é o que importa**. Um retry mal calculado entra em laço
// infinito; um timeout mal medido cancela trabalho saudável. Testar isso com um relógio real seria lento
// e frágil. Aqui o tempo e o número de tentativas são **parâmetros**, e o teste os controla.
//
// A FILA É DERIVADA, NUNCA GRAVADA
//
// Assim como a ordem topológica. A fila é `(prontas) × (prioridade) × (limite de concorrência)`,
// calculada a cada leitura. Gravar a fila criaria uma segunda verdade que ninguém reordena quando uma
// tarefa muda de prioridade.

import { tarefasProntas, type NoDoGrafo } from './sofia-grafo'

/** Prioridade da tarefa. Quatro níveis, do mais urgente ao menos. */
export const PRIORIDADES = ['critica', 'alta', 'normal', 'baixa'] as const
export type Prioridade = (typeof PRIORIDADES)[number]

/** Peso de cada prioridade. Menor = sai primeiro. */
const PESO: Record<Prioridade, number> = { alta: 1, baixa: 3, critica: 0, normal: 2 }

export function pesoDaPrioridade(valor: unknown): number {
  return PRIORIDADES.includes(valor as Prioridade) ? PESO[valor as Prioridade] : PESO.normal
}

/** O que o orquestrador precisa saber de uma tarefa além do grafo. */
export interface TarefaOrquestravel extends NoDoGrafo {
  /** Tentativas já feitas. Ausente = 0. */
  tentativas?: number
  /** Quando a tarefa entrou na fila. Para o timeout. */
  iniciada_em?: null | number
  prioridade?: Prioridade
}

/**
 * Política de retry.
 *
 * Backoff **exponencial com teto**, e o teto é o ponto: sem ele, `2^tentativas` vira horas na décima
 * tentativa, e a tarefa parece travada para quem olha a tela.
 *
 * `maxTentativas` conta a **tentativa que falhou**: com 3, a tarefa roda no máximo 3 vezes.
 */
export interface PoliticaRetry {
  baseMs: number
  maxTentativas: number
  tetoMs: number
}

export const RETRY_PADRAO: PoliticaRetry = { baseMs: 1_000, maxTentativas: 3, tetoMs: 60_000 }

/**
 * Quanto esperar antes da próxima tentativa — ou `null` quando não deve haver outra.
 *
 * `tentativas` é o número **já feito**. Com `maxTentativas: 3`: `tentativas = 0` (nunca rodou) espera
 * `baseMs`; `tentativas = 2` (falhou duas vezes) espera `4 × baseMs`; `tentativas = 3` não espera —
 * desistiu.
 */
export function esperaAntesDeRetentar(tentativas: number, politica: PoliticaRetry = RETRY_PADRAO): null | number {
  if (!Number.isFinite(tentativas) || tentativas < 0) return null
  if (tentativas >= politica.maxTentativas) return null

  const espera = politica.baseMs * 2 ** tentativas

  return Math.min(espera, politica.tetoMs)
}

/** `true` quando ainda há tentativa disponível. */
export function podeRetentar(tentativas: number, politica: PoliticaRetry = RETRY_PADRAO): boolean {
  return esperaAntesDeRetentar(tentativas, politica) !== null
}

/**
 * `true` quando a tarefa passou do tempo máximo em execução.
 *
 * `iniciada_em` ausente significa "nunca começou" — e uma tarefa que não começou **não pode estourar
 * timeout**. Devolver `true` ali cancelaria trabalho que nem rodou.
 */
export function estourouTimeout(tarefa: TarefaOrquestravel, agora: number, timeoutMs: number): boolean {
  if (tarefa.status !== 'executando') return false
  if (tarefa.iniciada_em === null || tarefa.iniciada_em === undefined) return false
  if (!Number.isFinite(tarefa.iniciada_em)) return false

  return agora - tarefa.iniciada_em > timeoutMs
}

/** Tarefas cujo timeout estourou — para o canal cancelar. */
export function tarefasEstouradas(tarefas: readonly TarefaOrquestravel[], agora: number, timeoutMs: number): string[] {
  return tarefas.filter(t => estourouTimeout(t, agora, timeoutMs)).map(t => t.tarefa_id)
}

/**
 * A fila de delegação, na ordem em que deve ser executada.
 *
 * Três filtros, na ordem que importa:
 *
 *   1. **Grafo** (`tarefasProntas`) — dependência manda. Prioridade nunca fura dependência: uma tarefa
 *      crítica que depende de uma normal espera a normal. Furar isso quebraria o plano.
 *   2. **Prioridade** — dentro do que o grafo liberou, a crítica sai primeiro.
 *   3. **Limite** — concorrência máxima.
 *
 * Empate de prioridade é resolvido pela **ordem do array**, como no grafo: determinístico.
 *
 * `limite` conta as que **já estão executando**, não só as da fila — senão o limite seria por chamada e
 * não por plano, e o runtime receberia `limite + executando` tarefas.
 */
export function filaDeDelegacao(
  tarefas: readonly TarefaOrquestravel[],
  opcoes: { limite?: number } = {}
): string[] {
  const executando = tarefas.filter(t => t.status === 'executando').length
  const limite = Math.max(0, (opcoes.limite ?? Number.POSITIVE_INFINITY) - executando)

  if (limite === 0) return []

  const prontas = new Set(tarefasProntas(tarefas))
  const candidatas = tarefas.filter(t => prontas.has(t.tarefa_id))

  // `sort` estável do JS preserva a ordem do array em empates — é o que torna a saída determinística.
  const ordenadas = [...candidatas].sort((a, b) => pesoDaPrioridade(a.prioridade) - pesoDaPrioridade(b.prioridade))

  return ordenadas.slice(0, limite).map(t => t.tarefa_id)
}

/**
 * O estado agregado de um plano, para a tela e para a prestação de contas.
 *
 * `bloqueadas` conta as que desistiram do retry **e** as que o produto marcou como bloqueadas: para quem
 * olha o total, as duas significam "não vai acontecer sozinho".
 */
export function resumoDoPlano(
  tarefas: readonly TarefaOrquestravel[],
  agora: number,
  opcoes: { politica?: PoliticaRetry; timeoutMs?: number } = {}
): {
  bloqueadas: number
  concluidas: number
  estourouTimeout: string[]
  executando: number
  falhadas: number
  pendentes: number
  prontas: string[]
  total: number
} {
  const politica = opcoes.politica ?? RETRY_PADRAO
  const timeoutMs = opcoes.timeoutMs ?? 600_000

  const falhadas = tarefas.filter(
    t => t.status === 'falhou' && !podeRetentar(t.tentativas ?? 0, politica)
  ).length

  return {
    bloqueadas: tarefas.filter(t => t.status === 'bloqueada').length + falhadas,
    concluidas: tarefas.filter(t => t.status === 'concluida').length,
    estourouTimeout: tarefasEstouradas(tarefas, agora, timeoutMs),
    executando: tarefas.filter(t => t.status === 'executando').length,
    falhadas,
    pendentes: tarefas.filter(t => t.status === 'pendente' || t.status === 'pronta').length,
    prontas: tarefasProntas(tarefas),
    total: tarefas.length
  }
}
