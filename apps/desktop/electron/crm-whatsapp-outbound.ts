/**
 * Monta o corpo de envio da WhatsApp Cloud API.
 *
 * Funcao pura de proposito: o envio real depende de credencial e de rede, mas a parte que erra de verdade — telefone
 * com mascara, texto vazio, texto acima do limite da Meta — pode e deve ser provada sem nenhuma conta.
 *
 * Limites da Meta que importam aqui: mensagem de texto vai ate 4096 caracteres; o destino e o numero em formato
 * internacional, SO digitos (o `+` e os espacos fazem a chamada falhar).
 */

/** Limite da Meta para o corpo de uma mensagem de texto. */
export const MAX_BODY = 4096

export interface SendTextPayload {
  messaging_product: 'whatsapp'
  recipient_type: 'individual'
  text: { body: string; preview_url: boolean }
  to: string
  type: 'text'
}

export type BuildResult = { error: string } | { payload: SendTextPayload; to: string }

const digitos = (valor: string): string => valor.replace(/\D/g, '')

/**
 * A Cloud API quer o numero so com digitos, incluindo o codigo do pais. Um `+55 11 99999-1111` vira `5511999991111`.
 * Numero curto demais nao vira tentativa de envio: falha aqui, com motivo, em vez de virar erro opaco da Meta.
 */
export function normalizeRecipient(raw: string): { error: string } | { to: string } {
  const to = digitos(raw ?? '')

  if (to.length < 8) {
    return { error: 'Telefone incompleto: informe DDI e DDD, so os digitos contam.' }
  }
  if (to.length > 15) {
    return { error: 'Telefone longo demais para o padrao internacional (maximo 15 digitos).' }
  }

  return { to }
}

/** Texto vazio ou so espaco nao e mensagem; cortar em silencio esconderia o problema de quem escreveu. */
export function buildTextPayload(phone: string, body: string): BuildResult {
  const destino = normalizeRecipient(phone)

  if ('error' in destino) {
    return destino
  }

  const texto = (body ?? '').trim()

  if (texto === '') {
    return { error: 'Mensagem vazia: escreva algo antes de enviar.' }
  }
  if (texto.length > MAX_BODY) {
    return { error: `Mensagem longa demais: ${texto.length} de ${MAX_BODY} caracteres.` }
  }

  return {
    payload: {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      text: { body: texto, preview_url: false },
      to: destino.to,
      type: 'text',
    },
    to: destino.to,
  }
}
