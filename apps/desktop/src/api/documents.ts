/**
 * Registro de documentos no renderer.
 *
 * O binário não passa por aqui: este cliente lê e escreve METADADOS. O arquivo fica onde está, e `ref`
 * é o caminho para ele.
 */

export const DOCUMENT_KINDS = ['contrato', 'nota_fiscal', 'comprovante', 'proposta', 'politica', 'outro'] as const
export const DOCUMENT_SCOPES = ['contato', 'empresa', 'venda', 'compra', 'ticket', 'rh', 'outro'] as const

export type DocumentKind = (typeof DOCUMENT_KINDS)[number]
export type DocumentScope = (typeof DOCUMENT_SCOPES)[number]

export interface DocumentRow {
  created_at: number
  custodian: string
  id: string
  kind: DocumentKind
  name: string
  notes: string
  ref: string
  scope: DocumentScope
  scope_id: string
  size_bytes: number
  tenant_id: string
  updated_at: number
}

export interface DocumentsTotals {
  bytes: number
  por_kind: Record<DocumentKind, number>
  total: number
}

interface Bridge {
  list: (payload?: string) => Promise<{ documents: DocumentRow[]; totals: DocumentsTotals }>
  remove: (id: string) => Promise<{ error: string } | { ok: true }>
  upsert: (payload: Record<string, unknown>) => Promise<{ document: DocumentRow } | { error: string }>
}

function bridge(): Bridge | null {
  return (globalThis as { hermesDesktop?: { documents?: Bridge } }).hermesDesktop?.documents ?? null
}

export function documentsAvailable(): boolean {
  return bridge() !== null
}

export async function listDocuments(tenantId?: string): Promise<{ documents: DocumentRow[]; totals: DocumentsTotals }> {
  const api = bridge()

  if (!api) return { documents: [], totals: { bytes: 0, por_kind: {} as DocumentsTotals['por_kind'], total: 0 } }

  return api.list(tenantId)
}

export async function saveDocument(input: Record<string, unknown>): Promise<{ error: string } | { ok: true }> {
  const api = bridge()

  if (!api) return { error: 'ponte_indisponivel' }

  const r = await api.upsert(input)

  return 'error' in r ? { error: r.error } : { ok: true }
}

export async function removeDocument(id: string): Promise<{ error: string } | { ok: true }> {
  const api = bridge()

  return api ? api.remove(id) : { error: 'ponte_indisponivel' }
}

const ERROS: Record<string, string> = {
  documento_invalido: 'Registro inválido.',
  documento_inexistente: 'Este documento não existe mais.',
  entidade_obrigatoria: 'Escolha a que este documento se refere.',
  nome_obrigatorio: 'Dê um nome ao documento.',
  origem_obrigatoria: 'Informe onde o arquivo está.',
  ponte_indisponivel: 'O registro não está disponível neste ambiente.'
}

/** Traduz o código do domínio. Código desconhecido aparece cru — esconder impediria o suporte. */
export function documentErrorText(code: string): string {
  return ERROS[code] ?? code
}

/** Bytes em unidade legível. `null`/0 devolve traço: tamanho desconhecido não é "0 B". */
export function sizeLabel(bytes: number): string {
  if (!bytes || bytes <= 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export const KIND_LABEL: Record<DocumentKind, string> = {
  comprovante: 'Comprovante',
  contrato: 'Contrato',
  nota_fiscal: 'Nota fiscal',
  outro: 'Outro',
  politica: 'Política',
  proposta: 'Proposta'
}

export const SCOPE_LABEL: Record<DocumentScope, string> = {
  compra: 'Compra',
  contato: 'Contato',
  empresa: 'Empresa',
  outro: 'Outro',
  rh: 'RH',
  ticket: 'Atendimento',
  venda: 'Venda'
}
