/**
 * Listener local que fecha o laco do CRM: recebe o repasse do adapter oficial e grava no store.
 *
 * Escuta **somente em 127.0.0.1** — nunca 0.0.0.0. Um listener em 0.0.0.0 ficaria visivel na rede local, e o CRM
 * passaria a aceitar mensagem de qualquer maquina da mesma rede (mesmo com token, a superficie aumentaria sem
 * necessidade).
 *
 * Porta 0 = o sistema escolhe uma livre; devolvemos a porta real, para o adapter receber o numero efetivo em vez de
 * um fixo que pode estar ocupado.
 *
 * O corpo tem limite: payload com megabytes nao e mensagem do WhatsApp, e ler sem teto e convite a exaustao de memoria.
 */

import { createServer, type Server } from 'node:http'

import type { ConversationSink } from './crm-whatsapp-ingest'
import { handleWhatsAppIngest } from './crm-whatsapp-endpoint'

export const MAX_BODY_BYTES = 1024 * 1024

export interface ListenerOptions {
  appSecret: null | string
  /** Token esperado; o mesmo `HERMES_DESKTOP_REMOTE_TOKEN` do app. */
  token: null | string
  sink: ConversationSink
}

export interface ListenerHandle {
  close: () => Promise<void>
  port: number
}

function readBody(request: import('node:http').IncomingMessage): Promise<null | string> {
  return new Promise(resolve => {
    let total = 0
    const partes: Buffer[] = []
    let estourou = false

    request.on('data', (pedaco: Buffer) => {
      if (estourou) {
        return
      }

      total += pedaco.length
      if (total > MAX_BODY_BYTES) {
        estourou = true
        resolve(null)

        return
      }

      partes.push(pedaco)
    })

    request.on('end', () => {
      if (!estourou) {
        resolve(Buffer.concat(partes).toString('utf8'))
      }
    })

    request.on('error', () => resolve(null))
  })
}

export function startWhatsAppListener(options: ListenerOptions, port = 0): Promise<ListenerHandle> {
  const server: Server = createServer((request, response) => {
    void (async () => {
      const corpo = await readBody(request)
      const headers: Record<string, string | undefined> = {}

      for (const [chave, valor] of Object.entries(request.headers)) {
        headers[chave.toLowerCase()] = Array.isArray(valor) ? valor[0] : valor
      }

      if (corpo === null) {
        response.writeHead(413, { 'content-type': 'application/json' })
        response.end(JSON.stringify({ error: 'corpo_grande_demais' }))

        return
      }

      const resultado = await handleWhatsAppIngest({
        appSecret: options.appSecret,
        body: corpo,
        headers,
        expectedToken: options.token,
        method: request.method ?? '',
        sink: options.sink,
      })

      response.writeHead(resultado.status, { 'content-type': 'application/json' })
      response.end(JSON.stringify(resultado.body))
    })()
  })

  return new Promise((resolve, reject) => {
    server.once('error', reject)

    server.listen(port, '127.0.0.1', () => {
      const endereco = server.address()
      const real = typeof endereco === 'object' && endereco !== null ? endereco.port : port

      resolve({
        close: () =>
          new Promise<void>((done, falhou) => {
            server.close(erro => (erro ? falhou(erro) : done()))
          }),
        port: real,
      })
    })
  })
}
