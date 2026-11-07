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
}

export interface ExecucaoStore {
  /** Inicia uma execução, ou devolve o motivo do bloqueio. */
  iniciar(
    input: IniciarInput,
    opcoes: { agora?: number; credencial: boolean; limites?: LimitesAgente }
  ): { error?: MotivoBloqueio; execucao?: ExecucaoGravada }
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

    iniciar(input, opcoes) {
      const agora = opcoes.agora ?? Date.now()
      const tenant = serverTenant()
      const dados = ler(caminho)
      const doTenant = dados.execucoes.filter(e => e.tenant_id === tenant)

      const candidata: Execucao = {
        execution_id: input.execution_id,
        owner: input.owner,
        parent_execution_id: input.parent_execution_id ?? null,
        started_at: agora,
        status: 'executando',
        task_id: input.task_id,
        tentativas: 0
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
