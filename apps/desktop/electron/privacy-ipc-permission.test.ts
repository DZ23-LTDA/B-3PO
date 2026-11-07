// Guarda de permissão nos canais de privacidade (r3 do GOAL V2).
//
// POR QUE ESTE ARQUIVO EXISTE
//
// O inventário da r2 mediu 219 canais `ipcMain.handle` no processo principal e **1** com guarda. Destes,
// 30 são de domínio empresarial. `privacy-ipc.ts` tinha três canais abertos — e um deles é `anonymize`.
//
// A anonimização do titular (LGPD) **não tem desfazer**. Um canal que apaga dados pessoais sem exigir
// ator é a pior categoria de exposição: qualquer renderer alcança, e o efeito é permanente.
//
// O CONTRATO (o mesmo das rodadas 215–225)
//
//   1. `exigirAtor` no handler
//   2. `deps.actorOf` obrigatório na assinatura
//   3. testes que provam recusa **sem** ator e recusa **com** ator sem nível
//
// A recusa acontece ANTES do corpo: sem ator, nem se avalia se o payload estava bem formado.

import { describe, expect, it } from 'vitest'

import { registerPrivacyIpc, type PrivacyDeps } from './privacy-ipc'
import type { Actor } from './rbac'

type Handler = (event: unknown, arg: unknown) => Promise<unknown>

/** Registra os canais e devolve o mapa nome → handler, sem Electron de verdade. */
function montar(actor: Actor | null): Map<string, Handler> {
  const handlers = new Map<string, Handler>()

  const ipcMain = {
    handle: (channel: string, handler: Handler) => {
      handlers.set(channel, handler)
    }
  }

  const store = {
    contacts: { list: async () => [], remove: async () => undefined },
    conversations: { list: async () => [], remove: async () => undefined },
    opportunities: { list: async () => [], remove: async () => undefined },
    tasks: { list: async () => [], remove: async () => undefined }
  } as unknown as PrivacyDeps['store']

  registerPrivacyIpc(ipcMain as never, { actorOf: async () => actor, store })

  return handlers
}

const DONO: Actor = { id: 'ator-dono', kind: 'human', level: 'EXECUTE_ALLOWED', role: 'owner' }

function negado(resposta: unknown): boolean {
  return typeof resposta === 'object' && resposta !== null && (resposta as { error?: string }).error === 'sem_permissao'
}

describe('canais de privacidade exigem ator', () => {
  it('os três canais são registrados', () => {
    const h = montar(DONO)

    expect([...h.keys()].sort()).toEqual([
      'hermes:privacy:anonymize',
      'hermes:privacy:export',
      'hermes:privacy:preview'
    ])
  })

  it('sem ator, os três recusam com sem_permissao', async () => {
    const h = montar(null)

    for (const canal of ['hermes:privacy:export', 'hermes:privacy:preview', 'hermes:privacy:anonymize']) {
      const resposta = await h.get(canal)!(null, { confirmar: true, telefone: '5511999999999' })

      expect(negado(resposta), `${canal} deveria recusar sem ator`).toBe(true)
    }
  })

  it('sem ator, a recusa acontece ANTES de validar o payload', async () => {
    const h = montar(null)

    // payload deliberadamente inválido: se a validação rodasse primeiro, a resposta seria
    // `pedido_invalido` e não `sem_permissao`. A ordem importa: quem não tem permissão não
    // precisa saber se o pedido estava bem formado.
    const resposta = await h.get('hermes:privacy:anonymize')!(null, null)

    expect(negado(resposta)).toBe(true)
  })

  it('sem ator, anonymize NAO apaga nada', async () => {
    let apagou = 0

    const ipcMain = { handle: () => undefined }
    const store = {
      contacts: { list: async () => [{ phone: '5511999999999' }], remove: async () => void apagou++ },
      conversations: { list: async () => [], remove: async () => void apagou++ },
      opportunities: { list: async () => [], remove: async () => void apagou++ },
      tasks: { list: async () => [], remove: async () => void apagou++ }
    } as unknown as PrivacyDeps['store']

    const handlers = new Map<string, Handler>()
    const registrar = {
      handle: (canal: string, handler: Handler) => {
        handlers.set(canal, handler)
      }
    }

    registerPrivacyIpc(registrar as never, { actorOf: async () => null, store })
    void ipcMain

    await handlers.get('hermes:privacy:anonymize')!(null, { confirmar: true, telefone: '5511999999999' })

    expect(apagou).toBe(0)
  })

  it('com ator dono, a confirmacao continua obrigatoria', async () => {
    const h = montar(DONO)

    // Ator resolvido não substitui a confirmação: são duas proteções diferentes. A guarda diz
    // QUEM pode; a flag diz que a pessoa VIU o alcance.
    const resposta = await h.get('hermes:privacy:anonymize')!(null, { telefone: '5511999999999' })

    expect(resposta).toEqual({ error: 'confirmacao_obrigatoria' })
  })

  it('com ator dono, payload invalido continua recusado', async () => {
    const h = montar(DONO)

    expect(await h.get('hermes:privacy:anonymize')!(null, null)).toEqual({ error: 'pedido_invalido' })
  })
})
