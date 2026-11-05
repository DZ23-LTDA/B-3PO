// Conversas do CRM no disco do usuário, dono do dado: o processo principal do Electron.
//
// Mesmo desenho dos contatos, do funil e das tarefas: um JSON sob `userData`, gravação atômica
// (`write` + `rename`), validação no processo principal e `{ error }` em vez de exceção.
//
// Por que existir antes do WhatsApp estar conectado: o adapter oficial da Cloud API
// (`plugins/platforms/whatsapp_cloud/adapter.py`) entrega mensagem, e o CRM precisa de um lugar para
// guardá-las e de uma tela para lê-las. Sem esse lugar, ter credencial não muda nada.
//
// `sent_at` é timestamp em ms, nunca data local: o fuso de quem recebeu não pode mudar a ordem.
// `message_id` é a chave de idempotência — o webhook da Meta reentrega, e reentrega não pode duplicar
// conversa nem mensagem.

import { WriteQueue } from './write-queue'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

export const CONVERSATION_STATUSES = ['aberta', 'aguardando', 'resolvida'] as const
export const MESSAGE_DIRECTIONS = ['entrada', 'saida'] as const

export type ConversationStatus = (typeof CONVERSATION_STATUSES)[number]
export type MessageDirection = (typeof MESSAGE_DIRECTIONS)[number]

export interface CrmMessage {
  /** `wa_id`/`message_id` do provedor. Vazio = mensagem digitada localmente. */
  external_id: string
  body: string
  direction: MessageDirection
  /** Quando aconteceu, em ms. */
  sent_at: number
}

export const NOTES_MAX = 2000
export const TAG_MAX_CHARS = 40
export const TAGS_MAX = 20

export interface CrmConversation {
  /** Telefone do contato (o índice do CRM), vazio quando não há contato vinculado. */
  contact_phone: string
  created_at: number
  id: string
  /** Última mensagem, para a lista não precisar abrir a conversa. */
  last_message_at: number | null
  last_message_preview: string
  messages: CrmMessage[]
  /** Nota interna da equipe. Nunca vai para o cliente, nunca e enviada ao WhatsApp. */
  notes: string
  /** Rótulo livre: nome do contato ou o número, quando não há contato. */
  /** Etiquetas livres da equipe. Servem para filtrar e agrupar; nao vao para o cliente. */
  tags: string[]
  title: string
  status: ConversationStatus
  /**
   * Empresa dona da conversa.
   *
   * O CRM nasceu sem tenant; `id` era a única identidade. Registros gravados antes disso são lidos como
   * `local` por `parseConversations`, então nada precisa ser migrado destrutivamente.
   */
  tenant_id: string
  unread: number
  updated_at: number
}

export interface ConversationsFile {
  schema_version: 1
  conversations: CrmConversation[]
}

function emptyConversations(): ConversationsFile {
  return { schema_version: 1, conversations: [] }
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function stamp(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback
}

function previewOf(body: string): string {
  const flat = body.replace(/\s+/g, ' ').trim()
  return flat.length <= 120 ? flat : `${flat.slice(0, 117)}...`
}

function normalizeMessage(raw: unknown): CrmMessage | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }
  const input = raw as Record<string, unknown>
  const body = text(input['body'])
  const direction = text(input['direction'])
  if (!body || !MESSAGE_DIRECTIONS.includes(direction as MessageDirection)) {
    return null
  }
  return {
    body,
    direction: direction as MessageDirection,
    external_id: text(input['external_id']),
    sent_at: stamp(input['sent_at'], Date.now()),
  }
}

/**
 * Etiquetas: apara, descarta vazio e nao-texto, remove duplicata (sem diferenciar maiuscula) e corta nos limites.
 * Duplicata e o erro que estraga filtro: "VIP" e "vip" na mesma conversa virariam duas opcoes na lista.
 */
function normalizeTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return []
  }

  const vistas = new Set<string>()
  const saida: string[] = []

  for (const entrada of raw) {
    if (typeof entrada !== 'string') {
      continue
    }
    const limpa = entrada.trim().slice(0, TAG_MAX_CHARS)
    if (limpa === '') {
      continue
    }
    const chave = limpa.toLowerCase()
    if (vistas.has(chave)) {
      continue
    }
    vistas.add(chave)
    saida.push(limpa)
    if (saida.length >= TAGS_MAX) {
      break
    }
  }

  return saida
}

export const DEFAULT_TENANT = 'local'

export function normalizeConversation(
  raw: unknown,
  now: number,
  tenantId: string = DEFAULT_TENANT
): { conversation: CrmConversation } | { error: string } {
  if (!raw || typeof raw !== 'object') {
    return { error: 'Conversa inválida.' }
  }
  const input = raw as Record<string, unknown>
  const title = text(input['title'])
  if (!title) {
    return { error: 'A conversa precisa de um título (nome ou telefone).' }
  }

  const statusRaw = text(input['status'])
  const status = CONVERSATION_STATUSES.includes(statusRaw as ConversationStatus)
    ? (statusRaw as ConversationStatus)
    : 'aberta'

  const messages: CrmMessage[] = []
  const seen = new Set<string>()
  const rawMessages = Array.isArray(input['messages']) ? input['messages'] : []
  for (const entry of rawMessages) {
    const message = normalizeMessage(entry)
    if (!message) {
      continue
    }
    // Idempotência: o webhook da Meta reentrega; a mesma mensagem não entra duas vezes.
    if (message.external_id) {
      if (seen.has(message.external_id)) {
        continue
      }
      seen.add(message.external_id)
    }
    messages.push(message)
  }
  messages.sort((left, right) => left.sent_at - right.sent_at)

  const last = messages.length > 0 ? messages[messages.length - 1] : null
  const createdAt = stamp(input['created_at'], now)

  return {
    conversation: {
      contact_phone: text(input['contact_phone']),
      created_at: createdAt,
      id: text(input['id']) || `conv_${createdAt}_${Math.floor(Math.random() * 1e6)}`,
      last_message_at: last ? last.sent_at : null,
      last_message_preview: last ? previewOf(last.body) : '',
      messages,
      notes: text(input['notes']).slice(0, NOTES_MAX),
      status,
      tags: normalizeTags(input['tags']),
      tenant_id: tenantId || DEFAULT_TENANT,
      title,
      unread: typeof input['unread'] === 'number' && input['unread'] > 0 ? Math.floor(input['unread']) : 0,
      updated_at: stamp(input['updated_at'], now),
    },
  }
}

export function parseConversations(raw: string): ConversationsFile {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return emptyConversations()
  }
  if (!data || typeof data !== 'object') {
    return emptyConversations()
  }
  const list = (data as Record<string, unknown>)['conversations']
  if (!Array.isArray(list)) {
    return emptyConversations()
  }
  const conversations: CrmConversation[] = []
  for (const entry of list) {
    // O tenant gravado manda; sem ele (arquivo anterior ao multiempresa) a conversa é do tenant local.
    // Ler não reescreve o arquivo: a conversa antiga só ganha o campo quando alguém a editar.
    const doArquivo = (entry as Record<string, unknown> | null)?.['tenant_id']
    const parsed = normalizeConversation(entry, Date.now(), typeof doArquivo === 'string' ? doArquivo : DEFAULT_TENANT)
    if ('conversation' in parsed) {
      conversations.push(parsed.conversation)
    }
  }
  return { conversations, schema_version: 1 }
}

/** Mais recente primeiro; sem mensagem vai para o fim, ordenado por criação. */
export function sortConversations(conversations: readonly CrmConversation[]): CrmConversation[] {
  return [...conversations].sort((left, right) => {
    const leftAt = left.last_message_at ?? left.created_at
    const rightAt = right.last_message_at ?? right.created_at
    return rightAt - leftAt
  })
}

export function conversationCounts(conversations: readonly CrmConversation[]): {
  aguardando: number
  abertas: number
  naoLidas: number
  resolvidas: number
} {
  let abertas = 0
  let aguardando = 0
  let resolvidas = 0
  let naoLidas = 0
  for (const conversation of conversations) {
    if (conversation.status === 'aberta') {
      abertas += 1
    } else if (conversation.status === 'aguardando') {
      aguardando += 1
    } else {
      resolvidas += 1
    }
    naoLidas += conversation.unread
  }
  return { abertas, aguardando, naoLidas, resolvidas }
}

export function conversationsStorePath(userDataDir: string): string {
  return join(userDataDir, 'crm-conversations.json')
}

export class CrmConversationStore {
  private readonly file: string

  /** Fila de escrita (r237): read -> valida -> write nao era serializado. Ver write-queue.ts. */
  private readonly fila = new WriteQueue()

  // Recebe o CAMINHO DO ARQUIVO, igual a CrmTaskStore/CrmPipelineStore: quem chama resolve o nome uma vez
  // (`conversationsStorePath`). Receber diretório aqui criava `<userData>/crm-conversations.json/crm-conversations.json`
  // — verificado no app empacotado, não no teste.
  constructor(file: string) {
    this.file = file
  }

  async list(tenantId: string = DEFAULT_TENANT): Promise<CrmConversation[]> {
    try {
      const raw = await readFile(this.file, 'utf8')
      const todas = parseConversations(raw).conversations

      return sortConversations(todas.filter(c => c.tenant_id === tenantId))
    } catch {
      return []
    }
  }

  async upsert(input: unknown, tenantId: string = DEFAULT_TENANT): Promise<{ conversation: CrmConversation } | { error: string }> {
    return this.fila.serializar(() => this.upsertSerializado(input, tenantId))
  }

  private async upsertSerializado(input: unknown, tenantId: string = DEFAULT_TENANT): Promise<{ conversation: CrmConversation } | { error: string }> {
    const normalized = normalizeConversation(input, Date.now(), tenantId)
    if ('error' in normalized) {
      return normalized
    }
    // Le TODAS: o `write` grava o arquivo inteiro, e gravar so a lista do tenant apagaria as conversas
    // das outras empresas. O indice exige id E tenant: conhecer o id nao basta para editar a alheia.
    const conversations = await this.readAll()
    const index = conversations.findIndex(
      entry => entry.id === normalized.conversation.id && entry.tenant_id === normalized.conversation.tenant_id
    )
    if (index === -1) {
      conversations.push(normalized.conversation)
    } else {
      // Preserva quando originalmente criada: `created_at` não muda ao editar.
      conversations[index] = {
        ...normalized.conversation,
        created_at: conversations[index].created_at,
        updated_at: Date.now(),
      }
    }
    await this.write(conversations)
    return { conversation: normalized.conversation }
  }

  async remove(id: string, tenantId: string = DEFAULT_TENANT): Promise<{ ok: true } | { error: string }> {
    return this.fila.serializar(() => this.removeSerializado(id, tenantId))
  }

  private async removeSerializado(id: string, tenantId: string = DEFAULT_TENANT): Promise<{ ok: true } | { error: string }> {
    // Le TODAS: `write` grava o arquivo inteiro. Filtrar por tenant aqui apagaria as outras empresas.
    const conversations = await this.readAll()
    const remaining = conversations.filter(entry => !(entry.id === id && entry.tenant_id === tenantId))
    if (remaining.length === conversations.length) {
      return { error: 'Conversa não encontrada.' }
    }
    await this.write(remaining)
    return { ok: true }
  }

  /** Todas as conversas do arquivo, sem filtro de tenant. Usado por quem grava o arquivo inteiro. */
  private async readAll(): Promise<CrmConversation[]> {
    try {
      return parseConversations(await readFile(this.file, 'utf8')).conversations
    } catch {
      return []
    }
  }

  private async write(conversations: CrmConversation[]): Promise<void> {
    const payload: ConversationsFile = { conversations: sortConversations(conversations), schema_version: 1 }
    await mkdir(dirname(this.file), { recursive: true })
    const temp = `${this.file}.tmp`
    await writeFile(temp, JSON.stringify(payload, null, 2), 'utf8')
    await rename(temp, this.file)
  }
}
