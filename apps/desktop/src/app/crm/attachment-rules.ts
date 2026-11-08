/**
 * Regras de anexo do CRM — o que pode entrar e o que precisa ser recusado antes de qualquer upload.
 *
 * Motivo de existir antes do upload: recusar cedo e com mensagem clara e mais barato que descobrir depois que o
 * arquivo nao cabe no limite do WhatsApp (16 MB) ou que o tipo nao e aceito. O usuario ve o motivo na hora.
 */

/** Limite do proprio WhatsApp Cloud para midia e 16 MB; usamos o mesmo teto para nao aceitar o que nao podera sair. */
export const MAX_ATTACHMENT_BYTES = 16 * 1024 * 1024

/**
 * Tipos aceitos no envio pelo WhatsApp: imagem, audio, video e documento.
 * Lista fechada de proposito — tipo fora dela precisa de decisao humana, nao de fallback silencioso.
 */
export const ALLOWED_MIME = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'audio/mpeg',
  'audio/ogg',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
  'video/mp4',
] as const

export type AttachmentRejection = 'mime_nao_permitido' | 'muito_grande' | 'vazio'

/**
 * Devolve o motivo da recusa, ou `null` quando o anexo pode seguir.
 *
 * Arquivo vazio e recusado porque anexo de 0 byte nao carrega informacao e costuma ser falha de gravacao no disco —
 * deixar passar transfere o erro para o cliente.
 */
export function attachmentRejection(anexo: {
  mime: string
  sizeBytes: number
}): AttachmentRejection | null {
  if (!Number.isFinite(anexo.sizeBytes) || anexo.sizeBytes <= 0) {
    return 'vazio'
  }

  if (anexo.sizeBytes > MAX_ATTACHMENT_BYTES) {
    return 'muito_grande'
  }

  const mime = anexo.mime.trim().toLowerCase()

  return (ALLOWED_MIME as readonly string[]).includes(mime) ? null : 'mime_nao_permitido'
}
