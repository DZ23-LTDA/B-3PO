/**
 * Decide se o listener do CRM deve subir junto com o app.
 *
 * Existe como funcao separada porque a decisao tem tres condicoes que erram em silencio se ficarem soltas no `main.ts`:
 * 1. **opt-in explicito** (`HERMES_DESKTOP_WHATSAPP_INGEST=1`) — quem nao usa WhatsApp nao ganha porta aberta;
 * 2. **token presente** — sem `HERMES_DESKTOP_REMOTE_TOKEN` nao ha como autenticar o repasse, entao nao sobe;
 * 3. **segredo da Meta presente** — sem `WHATSAPP_CLOUD_APP_SECRET` a assinatura nao pode ser verificada.
 *
 * Faltando qualquer uma, devolve `null` e o app segue normal. O CRM sem webhook e um CRM que so mostra o que foi criado
 * na mao — nao e erro, e um produto menor, nao um produto quebrado.
 */

import type { ConversationSink } from './crm-whatsapp-ingest'
import { startWhatsAppListener, type ListenerHandle } from './crm-whatsapp-listener'

export interface BootOptions {
  appSecret: null | string | undefined
  enabled: boolean
  /** Porta que a ponte Python usa (`B3PO_CRM_INGEST_PORT`). 0 = sistema escolhe. */
  port?: number
  sink: ConversationSink
  token: null | string | undefined
}

export function ingestEnabled(env: Record<string, string | undefined>): boolean {
  return env.HERMES_DESKTOP_WHATSAPP_INGEST === '1'
}

export async function maybeStartWhatsAppIngest(options: BootOptions): Promise<ListenerHandle | null> {
  const { appSecret, enabled, port = 0, sink, token } = options

  if (!enabled || !token || !appSecret) {
    return null
  }

  // Sem porta configurada a ponte nao tem para onde postar: subir em porta aleatoria seria um listener inutil.
  if (!port || port <= 0 || port > 65535) {
    return null
  }

  return startWhatsAppListener({ appSecret, sink, token }, port)
}
