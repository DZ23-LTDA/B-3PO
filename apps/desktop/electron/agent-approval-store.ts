// Aprovações — persistência e expiração (rodada 145).
//
// O QUE A r144 DEIXOU ABERTO
//
// A regra existia e não tinha onde viver: `bloqueioParaDecidir` era uma função pura e nenhuma solicitação era
// gravada. E `expirada` estava no tipo sem nada que expirasse.
//
// POR QUE EXPIRAR IMPORTA
//
// Um pedido de "conceder desconto para fechar este pedido" aprovado **três semanas depois** não é uma
// aprovação — é um acidente. O contexto sumiu, o cliente sumiu, e a decisão de hoje autoriza um ato de ontem.
// Expirar é o que impede a fila de virar um depósito de autorizações fora de contexto.
//
// QUEM EXPIRA
//
// Não há processo em segundo plano: a expiração é aplicada **na leitura**. Um agendador que não roda quando o
// app está fechado deixaria a fila mentindo justamente no dia em que o operador abre o app.

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

import {
  bloqueioParaDecidir,
  motivoValido,
  precisaAprovacao,
  type MotivoRecusa,
  type SolicitacaoAprovacao
} from './agent-approval'
import type { Nivel } from './agent-roster'
import { serverTenant } from './server-tenant'

/** Pedido não decidido em 24h perde validade. Curto de propósito: a ação é sobre um fato do momento. */
export const VALIDADE_MS = 24 * 60 * 60 * 1000

export interface AprovacoesFile {
  schema_version: number
  solicitacoes: SolicitacaoAprovacao[]
}

export function agentApprovalsPath(userData: string): string {
  return join(userData, 'b3po', 'agent-approvals.json')
}

function vazio(): AprovacoesFile {
  return { schema_version: 1, solicitacoes: [] }
}

function ehValida(value: unknown): value is SolicitacaoAprovacao {
  if (!value || typeof value !== 'object') return false

  const s = value as Partial<SolicitacaoAprovacao>

  return (
    typeof s.id === 'string' &&
    s.id !== '' &&
    typeof s.solicitado_por === 'string' &&
    typeof s.acao === 'string' &&
    typeof s.status === 'string'
  )
}

function ler(caminho: string): AprovacoesFile {
  if (!existsSync(caminho)) return vazio()

  try {
    const bruto = JSON.parse(readFileSync(caminho, 'utf8')) as Partial<AprovacoesFile>

    return {
      schema_version: 1,
      solicitacoes: Array.isArray(bruto.solicitacoes) ? bruto.solicitacoes.filter(ehValida) : []
    }
  } catch {
    return vazio()
  }
}

function gravar(caminho: string, dados: AprovacoesFile): void {
  mkdirSync(dirname(caminho), { recursive: true })

  const temporario = `${caminho}.tmp`

  writeFileSync(temporario, JSON.stringify(dados, null, 2), 'utf8')
  renameSync(temporario, caminho)
}

/** Aplica a expiração. Função pura: recebe a lista e devolve a lista com os vencidos marcados. */
export function aplicarExpiracao(
  solicitacoes: readonly SolicitacaoAprovacao[],
  agora: number,
  validade = VALIDADE_MS
): SolicitacaoAprovacao[] {
  return solicitacoes.map(s =>
    s.status === 'pendente' && agora - s.solicitado_em > validade ? { ...s, status: 'expirada' } : s
  )
}

export interface CriarInput {
  acao: string
  dominio: string
  execution_id: string
  motivo: string
  nivel_pedido: Nivel
  solicitado_por: string
  /** Nível que o agente tem hoje para esta ação. `null` quando não atua no domínio. */
  teto: Nivel | null
}

export interface ApprovalStore {
  aprovar(id: string, quemDecide: string, agora?: number): { error?: MotivoRecusa | 'nao_encontrada'; ok?: boolean }
  criar(input: CriarInput, agora?: number): { error?: string; solicitacao?: SolicitacaoAprovacao }
  listar(status?: string, agora?: number): SolicitacaoAprovacao[]
  recusar(id: string, quemDecide: string, agora?: number): { error?: MotivoRecusa | 'nao_encontrada'; ok?: boolean }
}

export function openApprovalStore(userData: string): ApprovalStore {
  const caminho = agentApprovalsPath(userData)

  // gora é injetado tambem na leitura: se a criacao aceita o relogio e a leitura nao, o teste nasce expirado
  // e o contrato fica inconsistente entre as duas operacoes do mesmo store.
  const doTenant = (dados: AprovacoesFile, agora: number): SolicitacaoAprovacao[] => {
    const tenant = serverTenant()

    return aplicarExpiracao(
      dados.solicitacoes.filter(s => s.tenant_id === tenant),
      agora
    )
  }

  const decidir = (
    id: string,
    quemDecide: string,
    status: 'aprovada' | 'recusada',
    agora: number
  ): { error?: MotivoRecusa | 'nao_encontrada'; ok?: boolean } => {
    const dados = ler(caminho)
    const alvo = dados.solicitacoes.find(s => s.id === id)

    if (!alvo) return { error: 'nao_encontrada' }

    // Reaplica a expiração no registro real antes de decidir: um pedido vencido não pode ser aprovado.
    const [atual] = aplicarExpiracao([alvo], agora)

    if (!atual) return { error: 'nao_encontrada' }

    const bloqueio = bloqueioParaDecidir(atual, quemDecide)

    if (bloqueio) return { error: bloqueio }

    alvo.status = status
    alvo.decidido_por = quemDecide
    alvo.decidido_em = agora

    gravar(caminho, dados)

    return { ok: true }
  }

  return {
    aprovar(id, quemDecide, agora = Date.now()) {
      return decidir(id, quemDecide, 'aprovada', agora)
    },

    criar(input, agora = Date.now()) {
      if (!input.solicitado_por?.trim()) return { error: 'autor_obrigatorio' }
      if (!input.acao?.trim()) return { error: 'acao_obrigatoria' }
      // Motivo curto não é revisável, e um aprovador que não entende o pedido aprova por cansaço.
      if (!motivoValido(input.motivo)) return { error: 'motivo_curto' }

      // Pedido que já cabe no teto não precisa de aprovação: criá-lo encheria a fila de ruído e ensinaria o
      // operador a aprovar sem ler.
      if (!precisaAprovacao(input.teto, input.nivel_pedido)) return { error: 'nao_precisa_aprovacao' }

      const tenant = serverTenant()
      const dados = ler(caminho)

      const solicitacao: SolicitacaoAprovacao = {
        acao: input.acao.trim(),
        decidido_em: null,
        decidido_por: null,
        dominio: input.dominio,
        execution_id: input.execution_id,
        id: `apr_${agora}_${Math.random().toString(36).slice(2, 8)}`,
        motivo: input.motivo.trim(),
        nivel_pedido: input.nivel_pedido,
        solicitado_em: agora,
        solicitado_por: input.solicitado_por.trim(),
        status: 'pendente',
        tenant_id: tenant
      }

      dados.solicitacoes.push(solicitacao)
      gravar(caminho, dados)

      return { solicitacao }
    },

    listar(status, agora = Date.now()) {
      const lista = doTenant(ler(caminho), agora)

      return (status ? lista.filter(s => s.status === status) : lista).sort(
        (a, b) => b.solicitado_em - a.solicitado_em
      )
    },

    recusar(id, quemDecide, agora = Date.now()) {
      return decidir(id, quemDecide, 'recusada', agora)
    }
  }
}
