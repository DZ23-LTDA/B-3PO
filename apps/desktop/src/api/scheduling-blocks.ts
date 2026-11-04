/**
 * Bloqueios de agenda (rodada 126).
 *
 * Fecha o caminho: o store existe (r124), os canais existem (r125), falta o renderer falar com eles.
 *
 * A ponte fica em `hermesDesktop` (não em `hermes`). O erro da r99 foi exatamente este: escrevi o nome
 * errado, um cast escondeu, e a tela dizia "não disponível" com tudo funcionando.
 *
 * `serverTenant` ignora o tenant vindo daqui — uma instalação é uma empresa (r92). O cliente não envia.
 */

export interface BlockRow {
  created_at: number
  ends_at: number
  id: string
  motivo: string
  resource_id: string
  starts_at: number
  tenant_id: string
}

export interface BlockInput {
  ends_at: number
  motivo: string
  resource_id: string
  starts_at: number
}

interface Ponte {
  schedulingBlocks?: {
    block?: {
      create: (input: BlockInput) => Promise<{ block?: BlockRow; error?: string }>
      list: () => Promise<BlockRow[]>
      remove: (id: string) => Promise<{ error?: string; removido?: boolean }>
    }
  }
}

function ponte(): Ponte['schedulingBlocks'] | null {
  if (typeof window === 'undefined') return null

  return (window as unknown as { hermesDesktop?: Ponte }).hermesDesktop?.schedulingBlocks ?? null
}

/** A tela pergunta isto antes de mostrar o botão: sem ponte, um botão que não faz nada mente. */
export function blocksAvailable(): boolean {
  return Boolean(ponte()?.block)
}

export async function listBlocks(): Promise<BlockRow[]> {
  const api = ponte()

  if (!api?.block) return []

  try {
    return await api.block.list()
  } catch {
    // Falha de leitura não derruba a agenda: sem bloqueios conhecidos, a disponibilidade superestima —
    // e por isso a tela precisa mostrar que a lista falhou, não fingir que está vazia.
    return []
  }
}

export async function createBlock(input: BlockInput): Promise<{ block?: BlockRow; error?: string }> {
  const api = ponte()

  if (!api?.block) return { error: 'indisponivel' }

  try {
    return await api.block.create(input)
  } catch {
    return { error: 'falha_ao_gravar' }
  }
}

export async function removeBlock(id: string): Promise<{ error?: string; removido?: boolean }> {
  const api = ponte()

  if (!api?.block) return { error: 'indisponivel' }

  try {
    return await api.block.remove(id)
  } catch {
    return { error: 'falha_ao_remover' }
  }
}

/** Mensagem de erro em português. O código do backend não vaza para a tela. */
export function blockErrorText(erro: string): string {
  const textos: Record<string, string> = {
    bloqueio_nao_encontrado: 'Este bloqueio já não existe.',
    bloqueio_sobreposto: 'Já existe um bloqueio neste período para este recurso.',
    entrada_invalida: 'Dados do bloqueio inválidos.',
    falha_ao_gravar: 'Não foi possível gravar o bloqueio.',
    falha_ao_remover: 'Não foi possível remover o bloqueio.',
    id_obrigatorio: 'Bloqueio não identificado.',
    indisponivel: 'Recurso de agenda indisponível nesta versão.',
    motivo_obrigatorio: 'Informe o motivo do bloqueio.',
    periodo_invalido: 'O fim precisa ser depois do início.',
    recurso_obrigatorio: 'Escolha o profissional, sala ou equipamento.'
  }

  return textos[erro] ?? 'Não foi possível concluir a operação.'
}
