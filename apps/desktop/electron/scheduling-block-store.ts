// Bloqueios de agenda (rodada 124).
//
// O TIPO EXISTIA SOLTO
//
// A r121 criou `Bloqueio` dentro de `scheduling-availability.ts` — o suficiente para a disponibilidade somar
// bloqueios no cálculo, mas sem onde guardá-los. Um bloqueio que só existe em memória some quando o app
// fecha, e o horário do almoço do profissional volta a aparecer como livre.
//
// POR QUE BLOQUEIO NÃO É AGENDAMENTO
//
// Agendamento tem cliente, serviço e status (`marcado`, `concluido`, `faltou`). Bloqueio tem motivo e não
// tem cliente: é o recurso dizendo "não atendo". Guardar bloqueio na lista de agendamentos obrigaria a
// inventar um cliente vazio e um status que não existe, e os relatórios de atendimento passariam a contar
// almoço como compromisso.
//
// Arquivo próprio, mesma pasta, mesmo padrão atômico de escrita.

import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { mkdirSync } from 'node:fs'

import { serverTenant } from './server-tenant'

export const DEFAULT_TENANT = 'local'

export interface BloqueioRecord {
  created_at: number
  ends_at: number
  id: string
  motivo: string
  resource_id: string
  starts_at: number
  tenant_id: string
}

export interface BlocksFile {
  blocks: BloqueioRecord[]
  schema_version: number
}

export function schedulingBlocksPath(userData: string): string {
  return join(userData, 'b3po', 'scheduling-blocks.json')
}

function vazio(): BlocksFile {
  return { blocks: [], schema_version: 1 }
}

function ler(caminho: string): BlocksFile {
  if (!existsSync(caminho)) return vazio()

  try {
    const bruto = JSON.parse(readFileSync(caminho, 'utf8')) as Partial<BlocksFile>

    return {
      blocks: Array.isArray(bruto.blocks) ? bruto.blocks.filter(ehValido) : [],
      schema_version: 1
    }
  } catch {
    // Arquivo corrompido não derruba a agenda: o chamador vê lista vazia, e a próxima escrita recria.
    return vazio()
  }
}

function ehValido(value: unknown): value is BloqueioRecord {
  if (!value || typeof value !== 'object') return false

  const b = value as Partial<BloqueioRecord>

  return (
    typeof b.id === 'string' &&
    b.id !== '' &&
    typeof b.resource_id === 'string' &&
    typeof b.motivo === 'string' &&
    typeof b.starts_at === 'number' &&
    typeof b.ends_at === 'number' &&
    b.ends_at > b.starts_at
  )
}

function gravar(caminho: string, dados: BlocksFile): void {
  mkdirSync(dirname(caminho), { recursive: true })

  const temporario = `${caminho}.tmp`

  writeFileSync(temporario, JSON.stringify(dados, null, 2), 'utf8')
  renameSync(temporario, caminho)
}

export interface BloqueioInput {
  ends_at: number
  motivo: string
  resource_id: string
  starts_at: number
  /** Só aceito do servidor: o renderer nunca escolhe o tenant. */
  tenant_id?: string
}

export interface SchedulingBlockStore {
  criar(input: BloqueioInput, agora?: number): { block?: BloqueioRecord; error?: string }
  listar(tenantId?: string): BloqueioRecord[]
  remover(id: string): { error?: string; removido?: boolean }
}

export function openSchedulingBlocks(userData: string): SchedulingBlockStore {
  const caminho = schedulingBlocksPath(userData)

  return {
    criar(input, agora = Date.now()) {
      const resourceId = (input.resource_id ?? '').trim()
      const motivo = (input.motivo ?? '').trim()

      if (!resourceId) return { error: 'recurso_obrigatorio' }
      if (!motivo) return { error: 'motivo_obrigatorio' }
      if (!Number.isFinite(input.starts_at) || !Number.isFinite(input.ends_at)) return { error: 'periodo_invalido' }
      if (input.ends_at <= input.starts_at) return { error: 'periodo_invalido' }

      const tenant = serverTenant(input.tenant_id)
      const dados = ler(caminho)

      // Sobrepasse com bloqueio existente do mesmo recurso: dois bloqueios no mesmo intervalo não somam
      // nada e escondem erro de digitação.
      const colide = dados.blocks.some(
        b => b.tenant_id === tenant && b.resource_id === resourceId && input.starts_at < b.ends_at && b.starts_at < input.ends_at
      )

      if (colide) return { error: 'bloqueio_sobreposto' }

      const block: BloqueioRecord = {
        created_at: agora,
        ends_at: input.ends_at,
        id: `blk_${agora}_${Math.random().toString(36).slice(2, 8)}`,
        motivo,
        resource_id: resourceId,
        starts_at: input.starts_at,
        tenant_id: tenant
      }

      dados.blocks.push(block)
      gravar(caminho, dados)

      return { block }
    },

    listar(tenantId) {
      const tenant = serverTenant(tenantId)

      // `readAll` + filtro, nunca leitura filtrada: escrever depois com a lista filtrada apagaria os
      // bloqueios de outro tenant. E uma instalação é uma empresa, mas o filtro fica explícito.
      return ler(caminho)
        .blocks.filter(b => b.tenant_id === tenant)
        .sort((a, b) => a.starts_at - b.starts_at)
    },

    remover(id) {
      const dados = ler(caminho)
      const antes = dados.blocks.length

      dados.blocks = dados.blocks.filter(b => b.id !== id)

      if (dados.blocks.length === antes) return { error: 'bloqueio_nao_encontrado' }

      gravar(caminho, dados)

      return { removido: true }
    }
  }
}
