// Os canais da logística (r58 do GOAL V2).
//
// A entrega tem regra (r56) e disco (r57). Este é o caminho até quem usa.
//
// POR QUE `read` E `execute` SÃO SEPARADOS
//
// Consultar a fila de entregas é `read`: saber o que falta sair não é agir. Criar e transitar são
// `execute`. Separar os dois é o que permite um perfil **só de consulta** — o dono vê a operação sem poder
// mexer nela.
//
// O QUE VEM DO RESOLVEDOR, E NÃO DO PAYLOAD
//
// `recebedor` é **quem recebeu a mercadoria**. Se viesse do renderer, bastaria escrever qualquer nome para
// o comprovante registrar alguém que nunca esteve lá — e o comprovante existe exatamente para ser prova
// quando o cliente diz que não recebeu.

import type { DeliveryStore } from './delivery-store'
import type { Entrega } from './delivery'
import type { IpcRegistrar } from './ipc-types'
import { exigirAtor } from './permission-guard'
import type { Actor } from './rbac'
import { serverTenant } from './server-tenant'

export interface DeliveryIpcDeps {
  /** Ator resolvido no processo principal. `null` recusa — logística não é pública. */
  actorOf: () => Promise<Actor | null>
  store: DeliveryStore
}

type Recusa = { error: 'sem_permissao'; reason: string }

export function registerDeliveryIpc(ipcMain: IpcRegistrar, deps: DeliveryIpcDeps): void {
  /** A lista completa do tenant. */
  ipcMain.handle(
    'hermes:logistica:entregas',
    async (_event: unknown, tenantId: unknown): Promise<Recusa | { entregas: Entrega[] }> =>
      exigirAtor(deps.actorOf, 'read', 'logistica', async () => ({
        entregas: await deps.store.listar(serverTenant(tenantId))
      }))
  )

  /**
   * A ligação com a venda: *"esta venda já saiu?"*
   *
   * Devolve `entrega: null` em vez de `{ error }` quando não há — "não tem entrega" é uma resposta, não
   * uma falha, e tratá-la como erro obrigaria a tela a distinguir dois erros que significam o contrário.
   */
  ipcMain.handle(
    'hermes:logistica:porPedido',
    async (_event: unknown, orderId: unknown): Promise<Recusa | { entrega: Entrega | null }> =>
      exigirAtor(deps.actorOf, 'read', 'logistica', async () => ({
        entrega: await deps.store.porPedido(typeof orderId === 'string' ? orderId : '')
      }))
  )

  ipcMain.handle(
    'hermes:logistica:criar',
    async (_event: unknown, payload: unknown): Promise<Recusa | { error: string } | { entrega: Entrega; entregas: Entrega[] }> =>
      exigirAtor(deps.actorOf, 'execute', 'logistica', async () => {
        const raw = (payload ?? {}) as Record<string, unknown>

        return deps.store.criar(raw, serverTenant(raw['tenant_id']))
      })
  )

  /**
   * Muda o status.
   *
   * O `recebedor` é resolvido AQUI: o payload pode trazer `recebedor` (o nome de quem recebeu na porta), e
   * é ele que vale — a pessoa que recebeu pode não ser quem opera o sistema. Mas o **entregador** de
   * `em_rota` cai no ator quando o payload não diz: quem despacha é quem está logado.
   */
  ipcMain.handle(
    'hermes:logistica:transitar',
    async (_event: unknown, payload: unknown): Promise<Recusa | { error: string } | { entrega: Entrega; entregas: Entrega[] }> =>
      exigirAtor(deps.actorOf, 'execute', 'logistica', async () => {
        const raw = { ...((payload ?? {}) as Record<string, unknown>) }
        const ator = await deps.actorOf()
        const recebedor = typeof raw['recebedor'] === 'string' ? raw['recebedor'].trim() : ''

        // Sem `recebedor` no payload, o ator assume — mas só para `em_rota`, onde ele é o despachante. Para
        // `entregue`, o comprovante precisa de QUEM RECEBEU, e assumir o operador registraria a pessoa
        // errada como prova.
        if (!recebedor && raw['status'] === 'em_rota') raw['recebedor'] = ator?.id ?? ''

        return deps.store.transitar(raw)
      })
  )
}
