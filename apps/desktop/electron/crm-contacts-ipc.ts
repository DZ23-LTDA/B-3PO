// Contatos do CRM expostos ao renderer por IPC.
//
// O renderer pede; o processo principal valida e grava (o store é dono do arquivo). Os handlers devolvem
// `{ contacts }` ou `{ error }` — nunca lançam para a janela, porque um erro de validação é resposta, não
// acidente.
//
// PERMISSÃO (r218)
//
// Contato é dado pessoal: nome, telefone, e-mail, empresa. É o canal onde a guarda tem o efeito mais direto —
// `remove` apaga, `list` expõe, `upsert` grava consentimento.
//
// `mountCrmContacts` recebe o ator e o repassa. Ele monta cinco canais; nesta rodada só contatos está
// protegido, e a divida registra os outros quatro.

import { registerCrmCompanyLogoIpc } from './crm-company-logo'
import type { IpcRegistrar } from './ipc-types'
import { installationActorOf } from './installation-actor'
import { exigirAtor } from './permission-guard'
import type { Actor } from './rbac'
import type { IpcMain, IpcMainInvokeEvent } from 'electron'

import { CrmContactStore, crmStorePath, type CrmContact } from './crm-contacts-store'
import { registerCrmPipelineIpc } from './crm-pipeline-ipc'
import { CrmPipelineStore, pipelineStorePath } from './crm-pipeline-store'
import { CrmConversationStore, conversationsStorePath } from './crm-conversations-store'
import { ingestEnabled, maybeStartWhatsAppIngest } from './crm-whatsapp-boot'
import { registerCrmConversationsIpc } from './crm-conversations-ipc'
import { registerCrmTasksIpc } from './crm-tasks-ipc'
import { CrmTaskStore, tasksStorePath } from './crm-tasks-store'

export type CrmContactsResult = { contacts: CrmContact[] } | { error: string }

export interface CrmContactsStore {
  list: () => Promise<CrmContact[]>
  remove: (phone: string) => Promise<{ contacts: CrmContact[] }>
  upsert: (input: unknown) => Promise<CrmContactsResult>
}

export interface CrmContactsIpcDeps {
  /** Ator resolvido no processo principal. `null` recusa. */
  actorOf: () => Promise<Actor | null>
}

type Denied = { error: 'sem_permissao'; reason: string }

export function registerCrmContactsIpc(
  ipcMain: IpcRegistrar,
  store: CrmContactsStore,
  deps: CrmContactsIpcDeps
): void {
  ipcMain.handle(
    'hermes:crm-contacts:list',
    async (): Promise<Denied | { contacts: CrmContact[] }> =>
      exigirAtor(deps.actorOf, 'read', 'crm-contact', async () => ({ contacts: await store.list() }))
  )

  ipcMain.handle(
    'hermes:crm-contacts:upsert',
    async (_event: IpcMainInvokeEvent, payload: unknown): Promise<Denied | CrmContactsResult> =>
      // Gravar consentimento e dado pessoal e escrita, nao leitura: `execute`.
      exigirAtor(deps.actorOf, 'execute', 'crm-contact', async () => store.upsert(payload))
  )

  ipcMain.handle(
    'hermes:crm-contacts:remove',
    async (_event: IpcMainInvokeEvent, phone: unknown): Promise<Denied | { contacts: CrmContact[] }> =>
      // Apagar contato e irreversivel (o armazenamento nao tem lixeira): exige nivel de execucao.
      exigirAtor(deps.actorOf, 'execute', 'crm-contact', async () =>
        store.remove(typeof phone === 'string' ? phone : '')
      )
  )
}

/** Monta o store do usuário e registra os handlers: `main.ts` só precisa de uma chamada. */
export function mountCrmContacts(ipcMain: IpcRegistrar, userDataDir: string): CrmConversationStore {
  // r218: o mount conhece o diretorio, entao resolve o ator aqui — main.ts fica no teto do ratchet e nao
  // pode crescer. O resolvedor e compartilhado com o ERP (`installation-actor.ts`).
  const deps: CrmContactsIpcDeps = { actorOf: installationActorOf(userDataDir) }

  registerCrmCompanyLogoIpc(ipcMain)
  registerCrmContactsIpc(ipcMain, new CrmContactStore(crmStorePath(userDataDir)), deps)
  registerCrmPipelineIpc(ipcMain, new CrmPipelineStore(pipelineStorePath(userDataDir)))
  registerCrmTasksIpc(ipcMain, new CrmTaskStore(tasksStorePath(userDataDir)))
  const conversas = new CrmConversationStore(conversationsStorePath(userDataDir))
  registerCrmConversationsIpc(ipcMain, conversas)

  // Webhook do WhatsApp: sobe apenas com opt-in explicito e credenciais presentes (crm-whatsapp-boot.ts).
  // Fica aqui, e nao no main.ts, porque main.ts esta no teto do ratchet de saude e nao pode crescer.
  void maybeStartWhatsAppIngest({
    appSecret: process.env.WHATSAPP_CLOUD_APP_SECRET,
    enabled: ingestEnabled(process.env),
    port: Number(process.env.B3PO_CRM_INGEST_PORT) || 0,
    sink: conversas,
    token: process.env.B3PO_CRM_INGEST_TOKEN,
  }).catch(() => {
    // abrir a porta e opcional: falhar aqui nao pode derrubar o app
  })

  // devolvido para o listener do webhook usar o MESMO store do IPC (uma instancia, um arquivo)
  return conversas
}
