/**
 * Envio de texto pela WhatsApp Cloud API.
 *
 * O transporte entra por parametro (`fetch`) para que a forma da chamada — URL, cabecalhos, corpo, leitura da resposta e
 * o que fazer quando a Meta recusa — possa ser provada sem rede e sem credencial. O que NAO se prova aqui e que a Meta
 * aceita: isso exige conta real e esta registrado como pendencia, nao como feito.
 */

import { buildTextPayload } from './crm-whatsapp-outbound'

export const DEFAULT_API_VERSION = 'v21.0'

export type FetchLike = (
  url: string,
  init: { body: string; headers: Record<string, string>; method: string }
) => Promise<{ json: () => Promise<unknown>; ok: boolean; status: number }>

export interface SendOptions {
  apiVersion?: string
  body: string
  fetchImpl: FetchLike
  phone: string
  phoneNumberId: string
  token: string
}

export type SendResult = { error: string; retriable: boolean } | { messageId: string; ok: true }

/**
 * A Meta devolve `{messages:[{id}]}` no sucesso e `{error:{message,...}}` no fracasso. Corpo inesperado nao pode passar
 * como sucesso: sem `id` nao ha mensagem, e gravar no CRM uma mensagem que nao existe seria mentir para o usuario.
 */
export function readSendResponse(status: number, payload: unknown): SendResult {
  const dados = (payload ?? {}) as { error?: { message?: string }; messages?: Array<{ id?: string }> }
  const messageId = dados.messages?.[0]?.id

  if (status >= 200 && status < 300 && typeof messageId === 'string' && messageId !== '') {
    return { messageId, ok: true }
  }

  const motivo = dados.error?.message?.trim()

  // 4xx e erro de pedido (numero invalido, token ruim): repetir nao resolve. 429/5xx vale nova tentativa.
  const retriable = status === 429 || status >= 500

  return {
    error: motivo ? `Meta recusou (${status}): ${motivo}` : `Meta recusou o envio (HTTP ${status}).`,
    retriable,
  }
}

export async function sendText(options: SendOptions): Promise<SendResult> {
  const montado = buildTextPayload(options.phone, options.body)

  if ('error' in montado) {
    return { error: montado.error, retriable: false }
  }

  const versao = options.apiVersion?.trim() || DEFAULT_API_VERSION
  const url = `https://graph.facebook.com/${versao}/${options.phoneNumberId}/messages`

  let resposta: Awaited<ReturnType<FetchLike>>
  try {
    resposta = await options.fetchImpl(url, {
      body: JSON.stringify(montado.payload),
      headers: {
        Authorization: `Bearer ${options.token}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    })
  } catch (erro) {
    // Falha de rede e transitoria por natureza: o chamador pode tentar de novo, mas nunca em silencio.
    return { error: `Falha de rede ao enviar: ${erro instanceof Error ? erro.message : String(erro)}`, retriable: true }
  }

  let corpo: unknown = null
  try {
    corpo = await resposta.json()
  } catch {
    corpo = null
  }

  return readSendResponse(resposta.status, corpo)
}
