// Cliente de agentes no renderer (rodada 147).
//
// A PONTE É `window.hermesDesktop`, NÃO `window.hermes`
//
// A r99 gastou uma rodada nisso e o typecheck passou porque havia um cast. Aqui não há cast: a forma é declarada
// e o teste de contrato confere contra o preload.
//
// FORMA PLANA
//
// Os métodos são `roster`, `executions`, `approvals`, `cancelExecution`, `decide` — direto no grupo `agents`,
// sem nível intermediário. A r127 mostrou o custo de declarar um nível que a ponte não expõe: `blocksAvailable()`
// perguntava por `block` e a tela renderizava nada, com tipo válido.

import type { Nivel } from '@/lib/agent-levels'

export interface AgenteDaLista {
  capacidades: { descricao: string; dominio: string; nivel: Nivel }[]
  id: string
  le: string[]
  limites: { concorrencia: number; duracao_ms: number; profundidade: number; retries: number } | null
  missao: string
  nome: string
  nuncaSozinho: string[]
}

export interface ExecucaoListada {
  execution_id: string
  owner: string
  parent_execution_id: string | null
  resultado?: string
  started_at: number | null
  status: string
  task_id: string
  tentativas: number
}

export interface AprovacaoListada {
  acao: string
  decidido_em: number | null
  decidido_por: string | null
  dominio: string
  execution_id: string
  id: string
  motivo: string
  nivel_pedido: Nivel
  solicitado_em: number
  solicitado_por: string
  status: string
}

interface Bridge {
  approvals: (status?: string) => Promise<AprovacaoListada[]>
  cancelExecution: (id: string) => Promise<{ error?: string; ok?: boolean }>
  decide: (payload: {
    decidir: 'aprovar' | 'recusar'
    id: string
    quem: string
  }) => Promise<{ error?: string; ok?: boolean }>
  executions: (filtro?: { owner?: string; task_id?: string }) => Promise<ExecucaoListada[]>
  roster: () => Promise<{ agentes: AgenteDaLista[] }>
}

function ponte(): Bridge | undefined {
  if (typeof window === 'undefined') return undefined

  const desktop = (window as unknown as { hermesDesktop?: { agents?: Bridge } }).hermesDesktop

  return desktop?.agents
}

/**
 * A ponte existe?
 *
 * A tela usa isso para se esconder quando não existe — em vez de mostrar botões mortos. Foi a decisão da r127 e
 * vale aqui: um botão que não faz nada é pior que um painel ausente.
 */
export function agentsAvailable(): boolean {
  const p = ponte()

  return Boolean(p && typeof p.roster === 'function' && typeof p.approvals === 'function')
}

/**
 * O estado de uma leitura, para a tela não confundir vazio com falha (r1 do V4).
 *
 * O DEFEITO QUE ISTO CORRIGE
 *
 * `listarAgentes()` devolvia `[]` nos DOIS casos — lista vazia e erro de API. Na home isso viraria
 * *"nenhum agente"* para quem tem agentes e cuja ponte falhou: um **zero enganoso**, que a decisão
 * de produto de 07/11 proíbe explicitamente. Estado diferente, tela diferente.
 */
export type EstadoDeLeitura = 'erro' | 'indisponivel' | 'ok'

export interface CargaDeAgentes {
  agentes: AgenteDaLista[]
  erro?: string
  estado: EstadoDeLeitura
}

/**
 * A leitura **honesta** do roster — distingue indisponível, falha e vazio.
 *
 * É a implementação primária: `listarAgentes()` virou um wrapper para não quebrar quem já chamava.
 */
export async function listarAgentesComEstado(): Promise<CargaDeAgentes> {
  const p = ponte()

  if (!p || typeof p.roster !== 'function') return { agentes: [], estado: 'indisponivel' }

  try {
    const r = await p.roster()

    return { agentes: r?.agentes ?? [], estado: 'ok' }
  } catch (erro) {
    return { agentes: [], erro: erro instanceof Error ? erro.message : String(erro), estado: 'erro' }
  }
}

/** O contrato antigo, preservado: quem só quer a lista continua funcionando. */
export async function listarAgentes(): Promise<AgenteDaLista[]> {
  return (await listarAgentesComEstado()).agentes
}

export async function listarExecucoes(filtro?: { owner?: string; task_id?: string }): Promise<ExecucaoListada[]> {
  try {
    return (await ponte()?.executions(filtro)) ?? []
  } catch {
    return []
  }
}

export async function cancelarExecucao(id: string): Promise<{ error?: string; ok?: boolean }> {
  try {
    return (await ponte()?.cancelExecution(id)) ?? { error: 'sem_ponte' }
  } catch {
    return { error: 'falha_ao_cancelar' }
  }
}

export async function listarAprovacoes(status?: string): Promise<AprovacaoListada[]> {
  try {
    return (await ponte()?.approvals(status)) ?? []
  } catch {
    return []
  }
}

export async function decidirAprovacao(payload: {
  decidir: 'aprovar' | 'recusar'
  id: string
  quem: string
}): Promise<{ error?: string; ok?: boolean }> {
  try {
    return (await ponte()?.decide(payload)) ?? { error: 'sem_ponte' }
  } catch {
    return { error: 'falha_ao_decidir' }
  }
}

/** Texto para a tela. Os erros do store já são motivos; aqui viram frase. */
export function erroDeAprovacao(erro: string): string {
  const textos: Record<string, string> = {
    falha_ao_decidir: 'Não foi possível registrar a decisão. Tente de novo.',
    ja_decidida: 'Esta solicitação já foi decidida ou venceu.',
    mesmo_autor: 'Quem pediu não pode aprovar o próprio pedido.',
    nao_encontrada: 'Solicitação não encontrada.',
    quem_obrigatorio: 'Informe quem está decidindo.',
    sem_ponte: 'Recurso indisponível nesta versão.'
  }

  return textos[erro] ?? 'Não foi possível concluir a ação.'
}
