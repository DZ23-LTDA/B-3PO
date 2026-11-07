// Estoque exposto ao renderer por IPC.
//
// Mesmo desenho do catálogo: o processo principal valida e grava, erro volta como valor, e o saldo
// nunca é aceito do chamador — ele é derivado das movimentações no main.
//
// PERMISSÃO (r217)
//
// Segundo canal de domínio a passar pela guarda, o primeiro a usar `exigirAtor`. Estoque é dinheiro em
// prateleira: ler o saldo já revela o negócio, e dar baixa move patrimônio.
//
// `read` para list/balances; `execute` para append/inventario. O ator vem do processo principal.

import type { IpcRegistrar } from './ipc-types'
import { exigirAtor } from './permission-guard'
import type { Actor } from './rbac'
import { serverTenant } from './server-tenant'
import type { IpcMain, IpcMainInvokeEvent } from 'electron'

import type { InventoryMovement } from './inventory-store'
import { movimentosDoInventario, planejarInventario, type Contagem } from './inventory-count'

export type MovementResult = { balance: number; movement: InventoryMovement; movements: InventoryMovement[] } | { error: string }

export interface InventoryStoreLike {
  append: (input: unknown) => Promise<MovementResult>
  balances: (tenantId?: string) => Promise<Record<string, number>>
  list: (tenantId?: string) => Promise<InventoryMovement[]>
}

/** Opcional: anunciado quando o saldo CRUZA para zero — a transicao e o evento, nao o estado. */
export interface InventoryEventSink {
  stockRanOut: (info: { product_sku: string; tenant_id: string }) => Promise<void>
}

export interface InventoryIpcDeps {
  /** Ator resolvido no processo principal. `null` recusa. */
  actorOf: () => Promise<Actor | null>
}

type Denied = { error: 'sem_permissao'; reason: string }

export function registerInventoryIpc(
  ipcMain: IpcRegistrar,
  store: InventoryStoreLike,
  deps: InventoryIpcDeps,
  onEvent?: InventoryEventSink
): void {
  ipcMain.handle(
    'hermes:inventory:list',
    async (_event: IpcMainInvokeEvent, tenantId: unknown): Promise<Denied | { movements: InventoryMovement[] }> =>
      exigirAtor(deps.actorOf, 'read', 'inventory', async () => ({
        movements: await store.list(serverTenant(tenantId))
      }))
  )

  ipcMain.handle(
    'hermes:inventory:balances',
    async (_event: IpcMainInvokeEvent, tenantId: unknown): Promise<Denied | { balances: Record<string, number> }> =>
      exigirAtor(deps.actorOf, 'read', 'inventory', async () => ({
        balances: await store.balances(serverTenant(tenantId))
      }))
  )

  ipcMain.handle(
    'hermes:inventory:append',
    async (_event: IpcMainInvokeEvent, payload: unknown): Promise<Denied | MovementResult> =>
      exigirAtor(deps.actorOf, 'execute', 'inventory', async () => {
        const r = await store.append(payload)

        if ('error' in r || !onEvent) return r

        // Zerado e EVENTO so na transicao. Olhar balance === 0 a cada movimento dispararia de novo em
        // toda saida seguinte de um item ja zerado; e a passagem para zero que interessa.
        if (r.balance === 0 && r.movement.kind === 'saida') {
          try {
            await onEvent.stockRanOut({ product_sku: r.movement.product_sku, tenant_id: r.movement.tenant_id })
          } catch {
            // A automacao falhar nao desfaz a baixa de estoque.
          }
        }

        return r
      })
  )
  // Inventario: recebe as contagens fisicas, compara com o saldo e grava os ajustes como movimento.
  //
  // NAO sobrescreve saldo: o ledger e imutavel, e um ajuste que substitui o numero apagaria a historia que
  // explica a diferenca. Cada correcao e um movimento com `ref` deterministico, entao repetir o mesmo
  // inventario completa o que faltou em vez de duplicar.
  ipcMain.handle(
    'hermes:inventory:inventario',
    async (
      _event: IpcMainInvokeEvent,
      payload: unknown
    ): Promise<Denied | { ajustes: number; ignoradas: string[]; sem_diferenca: string[] } | { error: string }> =>
      exigirAtor(deps.actorOf, 'execute', 'inventory', async () => {
        const raw = (payload ?? {}) as Record<string, unknown>
        const inventarioId = String(raw['id'] ?? '').trim()
        const contagens = Array.isArray(raw['contagens']) ? (raw['contagens'] as Contagem[]) : []

        if (!inventarioId) return { error: 'inventario_id_required' }
        if (contagens.length === 0) return { error: 'contagens_required' }

        const plano = planejarInventario(contagens, await store.balances(serverTenant(raw['tenant_id'])))
        const movimentos = movimentosDoInventario(plano, inventarioId)

        for (const movimento of movimentos) {
          const r = await store.append(movimento)

          // Um SKU que falhar no meio nao desfaz os anteriores: o `ref` garante que repetir completa o resto.
          if ('error' in r) return { error: r.error }
        }

        return { ajustes: movimentos.length, ignoradas: plano.invalidas, sem_diferenca: plano.sem_diferenca }
      })
  )
}
