// Execuções de agente — persistência (rodada 143).
//
// O QUE FALTAVA
//
// A r141 definiu os limites e a r142 disse quem são os agentes. Faltava onde as execuções vivem: sem registro,
// `parent_execution_id` não existe em lugar nenhum e `profundidadeDe` mede uma lista que sempre volta vazia.
//
// O STORE É QUEM APLICA O LIMITE
//
// `iniciar()` consulta `bloqueioParaIniciar` e só grava se a resposta for `null`. O limite não é sugestão que o
// chamador pode esquecer: quem esquece, não inicia.
//
// EXECUÇÃO NÃO SE APAGA
//
// `cancelar` muda o status; não remove. A trilha é o que permite responder "quem pediu isso" depois — e a
// pergunta aparece justamente quando algo deu errado, que é quando a linha já teria sido apagada.

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

import {
  bloqueioParaIniciar,
  type Execucao,
  type LimitesAgente,
  type MotivoBloqueio,
  type StatusExecucao
} from './agent-limits'
import { serverTenant } from './server-tenant'

export interface ExecucaoGravada extends Execucao {
  /** Resultado textual, quando concluída. */
  resultado?: string
  tenant_id: string
}

export interface ExecucoesFile {
  execucoes: ExecucaoGravada[]
  schema_version: number
}

export function agentExecutionsPath(userData: string): string {
  return join(userData, 'b3po', 'agent-executions.json')
}

function vazio(): ExecucoesFile {
  return { execucoes: [], schema_version: 1 }
}

function ehValida(value: unknown): value is ExecucaoGravada {
  if (!value || typeof value !== 'object') return false

  const e = value as Partial<ExecucaoGravada>

  return (
    typeof e.execution_id === 'string' &&
    e.execution_id !== '' &&
    typeof e.task_id === 'string' &&
    typeof e.owner === 'string' &&
    typeof e.status === 'string'
  )
}

function ler(caminho: string): ExecucoesFile {
  if (!existsSync(caminho)) return vazio()

  try {
    const bruto = JSON.parse(readFileSync(caminho, 'utf8')) as Partial<ExecucoesFile>

    return {
      execucoes: Array.isArray(bruto.execucoes) ? bruto.execucoes.filter(ehValida) : [],
      schema_version: 1
    }
  } catch {
    return vazio()
  }
}

function gravar(caminho: string, dados: ExecucoesFile): void {
  mkdirSync(dirname(caminho), { recursive: true })

  const temporario = `${caminho}.tmp`

  writeFileSync(temporario, JSON.stringify(dados, null, 2), 'utf8')
  renameSync(temporario, caminho)
}

export interface IniciarInput {
  execution_id: string
  owner: string
  parent_execution_id?: string | null
  task_id: string
  /**
   * r40 do V5 — quantas tentativas desta tarefa já falharam.
   *
   * Antes era sempre 0 (hardcoded), e `bloqueioParaIniciar` checava
   * `tentativas > limites.retries` — uma comparação que **nunca** era verdadeira. O limite
   * `max_retries: 2` existia no config, era lido e nunca disparava.
   */
  tentativas?: number
}

export interface ExecucaoStore {
  /** Inicia uma execução, ou devolve o motivo do bloqueio. */
  iniciar(
    input: IniciarInput,
    opcoes: { agora?: number; credencial: boolean; limites?: LimitesAgente }
  ): { error?: MotivoBloqueio; execucao?: ExecucaoGravada }
  /**
   * r23 do V5 — registra a sessão do Hermes que executa esta tarefa.
   *
   * Só aceita execução que existe e que ainda **não** foi vinculada: trocar a sessão de uma execução
   * em andamento seria reescrever a história de onde o trabalho rodou.
   */
  vincularSessao(id: string, sessionId: string): { error?: string; ok?: boolean }
  /**
   * r39 do V5 — falha as execuções `pendente` que passaram do prazo sem sessão.
   *
   * Uma execução delegada nasce `pendente` e só vira `executando` quando uma sessão real é
   * vinculada. Se a sessão nunca chegar (o usuário fechou a tela, a criação falhou), ela ficaria
   * `pendente` **para sempre** — ocupando vaga de concorrência e aparecendo como trabalho em curso.
   *
   * `pendente` tem prazo. `executando` **não**: uma sessão ligada pode levar horas, e matá-la por
   * tempo transformaria trabalho legítimo em falha.
   *
   * Devolve os ids expirados — quem chamou precisa saber o que mudou.
   */
  /**
   * r40 do V5 — retoma uma execução que **falhou**, criando a próxima tentativa.
   *
   * Só `falhou` é retomável. `cancelada` é decisão de alguém, e `concluida` já terminou: recriar
   * qualquer das duas seria desfazer uma intenção, não repetir uma falha.
   *
   * A nova execução passa pelo `iniciar` — então limites de concorrência, profundidade e o próprio
   * `retries` valem para ela. `tentativas` é herdado + 1.
   */
  retomar(
    id: string,
    novoExecutionId: string,
    opcoes: { agora?: number; credencial: boolean; execution_id?: string; limites?: LimitesAgente }
  ): { error?: MotivoBloqueio | string; execucao?: ExecucaoGravada }
  expirarPendentes(agora: number, limiteMs: number): string[]
  finalizar(id: string, status: 'concluida' | 'falhou', resultado?: string): { error?: string; ok?: boolean }
  cancelar(id: string): { error?: string; ok?: boolean }
  listar(filtro?: { owner?: string; task_id?: string }): ExecucaoGravada[]
}

export function openExecutionStore(userData: string): ExecucaoStore {
  const caminho = agentExecutionsPath(userData)

  const visiveis = (): ExecucaoGravada[] => {
    const tenant = serverTenant()

    return ler(caminho).execucoes.filter(e => e.tenant_id === tenant)
  }

  return {
    cancelar(id) {
      const dados = ler(caminho)
      const alvo = dados.execucoes.find(e => e.execution_id === id)

      if (!alvo) return { error: 'execucao_nao_encontrada' }

      // Não apaga: muda o status. A trilha responde "quem pediu isso" quando algo dá errado.
      alvo.status = 'cancelada'
      gravar(caminho, dados)

      return { ok: true }
    },

    vincularSessao(id, sessionId) {
      const limpo = String(sessionId ?? '').trim()

      if (!limpo) return { error: 'sessao_obrigatoria' }

      const dados = ler(caminho)
      const alvo = dados.execucoes.find(e => e.execution_id === id)

      if (!alvo) return { error: 'execucao_inexistente' }

      // Trocar a sessão de uma execução já vinculada reescreveria onde o trabalho rodou.
      if (alvo.session_id) {
        return alvo.session_id === limpo ? { ok: true } : { error: 'ja_vinculada' }
      }

      alvo.session_id = limpo
      // Com sessão, o executor começou: o status deixa de ser `pendente`.
      if (alvo.status === 'pendente') alvo.status = 'executando'

      gravar(caminho, dados)

      return { ok: true }
    },

    finalizar(id, status, resultado) {
      const dados = ler(caminho)
      const alvo = dados.execucoes.find(e => e.execution_id === id)

      if (!alvo) return { error: 'execucao_nao_encontrada' }

      // Não sobrescreve um estado terminal: uma execução cancelada não vira "concluída" porque o processo
      // terminou depois do cancelamento.
      if (alvo.status === 'concluida' || alvo.status === 'cancelada') return { ok: true }

      alvo.status = status

      if (resultado !== undefined) alvo.resultado = resultado

      gravar(caminho, dados)

      return { ok: true }
    },

    retomar(id, novoExecutionId, opcoes) {
      const anterior = visiveis().find(e => e.execution_id === id)

      if (!anterior) return { error: 'execucao_nao_encontrada' }

      // Só falha se repete. Cancelar e concluir são fins, não tropeços.
      if (anterior.status !== 'falhou') return { error: 'nao_retomavel' }

      return this.iniciar(
        {
          execution_id: novoExecutionId,
          owner: anterior.owner,
          parent_execution_id: anterior.parent_execution_id,
          task_id: anterior.task_id,
          tentativas: anterior.tentativas + 1
        },
        { agora: opcoes.agora, credencial: opcoes.credencial, limites: opcoes.limites }
      )
    },
    expirarPendentes(agora, limiteMs) {
      if (!Number.isFinite(limiteMs) || limiteMs <= 0) return []

      const dados = ler(caminho)
      const expirados: string[] = []

      for (const e of dados.execucoes) {
        // So `pendente`: `executando` tem sessao viva e o prazo dela nao e este.
        if (e.status !== 'pendente') continue

        // Sem `started_at` nao ha como medir idade — nao inventa um tempo.
        const desde = e.started_at ?? null

        if (desde === null || agora - desde < limiteMs) continue

        e.status = 'falhou'
        e.resultado = 'sem_sessao_no_prazo'
        expirados.push(e.execution_id)
      }

      if (expirados.length > 0) gravar(caminho, dados)

      return expirados
    },
    iniciar(input, opcoes) {
      const agora = opcoes.agora ?? Date.now()
      const tenant = serverTenant()
      const dados = ler(caminho)
      const doTenant = dados.execucoes.filter(e => e.tenant_id === tenant)

      const candidata: Execucao = {
        execution_id: input.execution_id,
        owner: input.owner,
        parent_execution_id: input.parent_execution_id ?? null,
        // r23 do V5: nasce sem sessao. Quem vincula e `vincularSessao`.
        session_id: null,
        started_at: agora,
        /*
         * r5 do V5 (A-13) — nasce **pendente**, não `executando`.
         *
         * Medido na r1 do V5: `iniciar()` gravava `executando`, `finalizar()` só é chamado em teste, e
         * nenhum consumidor executa a tarefa. Resultado: a tela mostrava "executando" para trabalho que
         * nenhum processo havia começado — e nunca terminava.
         *
         * `pendente` é o valor honesto: a vaga está **reservada** (os limites contam, ver
         * `agent-limits.ts`), mas ninguém começou. A transição para `executando` pertence a quem de
         * fato executar — quando existir.
         */
        status: 'pendente',
        task_id: input.task_id,
        tentativas: Math.max(0, Math.trunc(input.tentativas ?? 0))
      }

      const motivo = bloqueioParaIniciar({
        agora,
        candidata,
        credencial: opcoes.credencial,
        limites: opcoes.limites,
        todas: [...doTenant, candidata]
      })

      if (motivo) return { error: motivo }

      const gravada: ExecucaoGravada = { ...candidata, tenant_id: tenant }

      dados.execucoes.push(gravada)
      gravar(caminho, dados)

      return { execucao: gravada }
    },

    listar(filtro) {
      return visiveis()
        .filter(e => !filtro?.owner || e.owner === filtro.owner)
        .filter(e => !filtro?.task_id || e.task_id === filtro.task_id)
        .sort((a, b) => (b.started_at ?? 0) - (a.started_at ?? 0))
    }
  }
}

/** Status que ainda ocupam vaga. Usado pela tela para não mostrar "livre" quando não está. */
export const STATUS_ATIVOS: readonly StatusExecucao[] = ['pendente', 'executando']
