/**
 * Endpoint LOCAL que recebe a mensagem ja autenticada pelo adapter oficial e a grava no CRM.
 *
 * Desenho (ver WHATSAPP-CRM-REPORT.md): a Meta fala apenas com o adapter python (URL publica, HMAC dele). O adapter
 * repassa para ca em **loopback**. Assim existe uma unica porta publica, e o desktop nao fica exposto.
 *
 * Duas provas independentes antes de qualquer gravacao:
 * 1. **token local** — loopback NAO e autorizacao: qualquer processo da maquina alcancaria a porta;
 * 2. **assinatura da Meta** — o repasse carrega o header original, entao a assinatura e revalidada aqui. Se o adapter
 *    for comprometido e mandar corpo forjado, esta camada ainda recusa.
 *
 * A funcao e pura em relacao a HTTP (recebe texto, devolve status+corpo): da para testar o contrato inteiro sem abrir
 * socket — e sem isso o endpoint so seria testavel com servidor de pe, que ninguem mantem.
 */

import type { IngestResult } from './crm-whatsapp-ingest'
import { ingestMetaWebhook, type ConversationSink } from './crm-whatsapp-ingest'

export interface EndpointRequest {
  appSecret: null | string
  body: string
  headers: Record<string, string | undefined>
  /** Token do desktop (`HERMES_DESKTOP_REMOTE_TOKEN`). Sem ele, nada passa. */
  expectedToken: null | string
  method: string
  now?: number
  sink: ConversationSink
}

export interface EndpointResponse {
  body: Record<string, unknown>
  status: number
}

const semVazamento = (motivo: string): EndpointResponse => ({ body: { error: motivo }, status: 401 })

export async function handleWhatsAppIngest(request: EndpointRequest): Promise<EndpointResponse> {
  const { appSecret, body, expectedToken, headers, method, now, sink } = request

  if (method.toUpperCase() !== 'POST') {
    return { body: { error: 'metodo_invalido' }, status: 405 }
  }

  // fail-closed: sem token configurado o endpoint nao atende ninguem
  if (!expectedToken) {
    return semVazamento('token_ausente')
  }

  const token = headers['x-b3po-token'] ?? headers['authorization']?.replace(/^Bearer\s+/i, '')

  if (token !== expectedToken) {
    return semVazamento('token_invalido')
  }

  const resultado: IngestResult = await ingestMetaWebhook({
    appSecret,
    now,
    rawBody: body,
    signature: headers['x-hub-signature-256'],
    sink,
  })

  if ('error' in resultado) {
    // assinatura/segredo errado e 401; payload ruim e 400 — o adapter precisa distinguir para nao repetir em loop
    const status = resultado.error.startsWith('assinatura') || resultado.error === 'segredo_ausente' ? 401 : 400

    return { body: { error: resultado.error }, status }
  }

  return { body: { ...resultado, ok: true }, status: 200 }
}
