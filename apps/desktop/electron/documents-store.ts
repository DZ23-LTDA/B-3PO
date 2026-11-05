// Registro de documentos da empresa.
//
// O QUE ESTE DOMINIO GUARDA, E O QUE ELE NAO GUARDA
//
// Ele guarda METADADOS: o que o documento e, a que ele se refere, quando entrou, quem responde por
// ele. Nao guarda o binario.
//
// Guardar PDF assinado em JSON sob `userData` seria transformar um arquivo de 5 MB em 7 MB de base64,
// relido por inteiro a cada gravacao do dominio. O arquivo fica onde ja esta (anexo do atendimento,
// pasta da empresa, exportacao do contador) e este registro aponta para ele.
//
// Por isso `ref` e obrigatorio e `size_bytes` e o que o arquivo declarou — se o arquivo sumir, o
// registro continua contando a historia, que e o proposito de um registro.
//
// A VALIDACAO NAO E DUPLICADA
//
// Limite de tamanho e lista de MIME vem de `src/app/crm/attachment-rules.ts`, que ja e a fonte dessas
// duas regras no CRM. Um segundo par de constantes divergiria na primeira mudanca.

import { WriteQueue } from './write-queue'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

export const DOCUMENT_KINDS = [
  'contrato',
  'nota_fiscal',
  'comprovante',
  'proposta',
  'politica',
  'outro'
] as const

export type DocumentKind = (typeof DOCUMENT_KINDS)[number]

/** A que o documento se refere. `outro` aceita referencia livre. */
export const DOCUMENT_SCOPES = ['contato', 'empresa', 'venda', 'compra', 'ticket', 'rh', 'outro'] as const

export type DocumentScope = (typeof DOCUMENT_SCOPES)[number]

export interface DocumentRecord {
  created_at: number
  /** Quem responde pelo documento. Vazio = sem responsavel declarado. */
  custodian: string
  id: string
  kind: DocumentKind
  /** Nome do arquivo com extensao. E o que aparece na lista. */
  name: string
  notes: string
  /** Caminho ou URL de onde o arquivo esta. Obrigatorio: registro sem origem nao serve para nada. */
  ref: string
  scope: DocumentScope
  /** Id da entidade referenciada (contato, venda, ticket...). Vazio quando `scope` e `outro`. */
  scope_id: string
  /** Bytes declarados na entrada. Nao e lido do disco por este dominio. */
  size_bytes: number
  tenant_id: string
  updated_at: number
}

export interface DocumentsFile {
  documents: DocumentRecord[]
  schema_version: 1
}

export const NAME_MAX = 160
export const REF_MAX = 1024
export const NOTES_MAX = 2000

export const DEFAULT_TENANT = 'local'

export function documentsStorePath(userDataDir: string): string {
  return join(userDataDir, 'b3po', 'documents.json')
}

function texto(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function inteiro(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)

  return Number.isFinite(n) ? Math.round(n) : 0
}

function kindDe(value: unknown): DocumentKind {
  return DOCUMENT_KINDS.includes(value as DocumentKind) ? (value as DocumentKind) : 'outro'
}

function scopeDe(value: unknown): DocumentScope {
  return DOCUMENT_SCOPES.includes(value as DocumentScope) ? (value as DocumentScope) : 'outro'
}

/** Valor novo se vier preenchido; senao o que ja existia. Um lugar so para a regra de merge. */
function herdado(novo: unknown, anterior: string | undefined): string {
  const t = texto(novo)

  return t || anterior || ''
}

interface CamposObrigatorios {
  name: string
  ref: string
  scope: DocumentScope
  scope_id: string
}

/** As tres recusas do registro, numa funcao que so decide se pode entrar. */
function recusaDeCampos(campos: CamposObrigatorios): string | null {
  // Sem nome nao ha o que listar; sem origem nao ha o que abrir.
  if (!campos.name) return 'nome_obrigatorio'
  if (!campos.ref) return 'origem_obrigatoria'

  // `outro` e a unica categoria sem entidade; exigir id nas demais evita documento solto que ninguem
  // consegue relacionar depois.
  if (campos.scope !== 'outro' && !campos.scope_id) return 'entidade_obrigatoria'

  return null
}

export function normalizeDocument(raw: unknown, now: number, existing?: DocumentRecord): DocumentRecord | { error: string } {
  if (!raw || typeof raw !== 'object') return { error: 'documento_invalido' }

  const input = raw as Record<string, unknown>
  const campos: CamposObrigatorios = {
    name: herdado(input['name'], existing?.name),
    ref: herdado(input['ref'], existing?.ref),
    scope: scopeDe(input['scope'] ?? existing?.scope),
    scope_id: herdado(input['scope_id'], existing?.scope_id)
  }

  const recusa = recusaDeCampos(campos)

  if (recusa) return { error: recusa }

  return {
    created_at: existing?.created_at ?? now,
    custodian: herdado(input['custodian'], existing?.custodian),
    id: existing?.id ?? texto(input['id']),
    kind: kindDe(input['kind'] ?? existing?.kind),
    name: campos.name.slice(0, NAME_MAX),
    notes: herdado(input['notes'], existing?.notes).slice(0, NOTES_MAX),
    ref: campos.ref.slice(0, REF_MAX),
    scope: campos.scope,
    scope_id: campos.scope_id.slice(0, 120),
    size_bytes: Math.max(0, inteiro(input['size_bytes'] ?? existing?.size_bytes)),
    tenant_id: existing?.tenant_id ?? (texto(input['tenant_id']) || DEFAULT_TENANT),
    updated_at: now
  }
}

export function parseDocuments(raw: string): DocumentsFile {
  try {
    const parsed = JSON.parse(raw) as Partial<DocumentsFile>

    if (!parsed || !Array.isArray(parsed.documents)) return { documents: [], schema_version: 1 }

    return {
      documents: parsed.documents.filter(d => d && typeof d === 'object' && typeof d.id === 'string'),
      schema_version: 1
    }
  } catch {
    return { documents: [], schema_version: 1 }
  }
}

/** Totais para a tela: nunca inventa numero, e ausencia de dado aparece como zero explicito. */
export function documentTotals(documents: readonly DocumentRecord[]): {
  bytes: number
  por_kind: Record<DocumentKind, number>
  total: number
} {
  const porKind = Object.fromEntries(DOCUMENT_KINDS.map(k => [k, 0])) as Record<DocumentKind, number>

  let bytes = 0

  for (const d of documents) {
    porKind[d.kind] += 1
    bytes += d.size_bytes
  }

  return { bytes, por_kind: porKind, total: documents.length }
}

export class DocumentsStore {
  constructor(private readonly filePath: string) {}

  /** Fila de escrita (r238): read -> valida -> write nao era serializado. Ver write-queue.ts. */
  private readonly fila = new WriteQueue()

  private async read(): Promise<DocumentsFile> {
    try {
      return parseDocuments(await readFile(this.filePath, 'utf8'))
    } catch {
      return { documents: [], schema_version: 1 }
    }
  }

  private async write(file: DocumentsFile): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true })
    const temp = `${this.filePath}.tmp`

    await writeFile(temp, JSON.stringify(file, null, 2), 'utf8')
    await rename(temp, this.filePath)
  }

  async list(tenantId: string = DEFAULT_TENANT): Promise<DocumentRecord[]> {
    const file = await this.read()

    return file.documents
      .filter(d => d.tenant_id === tenantId)
      .sort((a, b) => b.updated_at - a.updated_at)
  }

  async totals(tenantId: string = DEFAULT_TENANT): Promise<ReturnType<typeof documentTotals>> {
    return documentTotals(await this.list(tenantId))
  }

  async upsert(input: unknown, now: number = Date.now()): Promise<{ document: DocumentRecord } | { error: string }> {
    return this.fila.serializar(() => this.upsertSerializado(input, now))
  }

  private async upsertSerializado(input: unknown, now: number = Date.now()): Promise<{ document: DocumentRecord } | { error: string }> {
    const file = await this.read()
    const inputId = texto((input as Record<string, unknown>)?.['id'])
    const existente = inputId ? file.documents.find(d => d.id === inputId) : undefined

    if (inputId && !existente) return { error: 'documento_inexistente' }

    const normalizado = normalizeDocument(input, now, existente)

    if ('error' in normalizado) return normalizado

    if (!existente) {
      normalizado.id = normalizado.id || `doc_${now}_${Math.random().toString(36).slice(2, 8)}`
      file.documents.push(normalizado)
    } else {
      const i = file.documents.findIndex(d => d.id === existente.id)

      file.documents[i] = normalizado
    }

    await this.write(file)

    return { document: normalizado }
  }

  async remove(id: string): Promise<{ ok: true } | { error: string }> {
    return this.fila.serializar(() => this.removeSerializado(id))
  }

  private async removeSerializado(id: string): Promise<{ ok: true } | { error: string }> {
    const file = await this.read()
    const antes = file.documents.length

    file.documents = file.documents.filter(d => d.id !== id)

    if (file.documents.length === antes) return { error: 'documento_inexistente' }

    await this.write(file)

    return { ok: true }
  }
}
