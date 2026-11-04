// Canais do documento fiscal.
//
// O provedor é resolvido UMA vez, na montagem, a partir do ambiente do processo. O renderer não escolhe
// emissor nem vê credencial: ele pede "emita a nota desta venda" e recebe o que o servidor conseguiu.
//
// `status` do provedor é exposto para a tela poder dizer a verdade: "homologação" quando não há emissor real,
// "não configurado" quando há emissor escolhido e falta a chave.

import type { IpcRegistrar } from './ipc-types'
import { resolverProvedor, variaveisFaltando, type FiscalDocumentKind } from './fiscal-provider'
import { FiscalStore, type FiscalRecord } from './fiscal-store'
import { serverTenant } from './server-tenant'

export interface FiscalDeps {
  provider?: ReturnType<typeof resolverProvedor>
  store: FiscalStore
}

export function registerFiscalIpc(ipcMain: IpcRegistrar, deps: FiscalDeps): void {
  const provider = deps.provider ?? resolverProvedor(process.env)

  ipcMain.handle('hermes:fiscal:list', async (_event: unknown, tenantId: unknown): Promise<{ documents: FiscalRecord[] }> => ({
    documents: await deps.store.list(serverTenant(tenantId))
  }))

  /** Estado do emissor, para a tela poder rotular "homologação" em vez de "autorizada". */
  ipcMain.handle('hermes:fiscal:status', async () => ({
    faltando: variaveisFaltando(process.env),
    homologado: provider.homologado,
    id: provider.id,
    nome: provider.nome
  }))

  /**
   * Emite a nota de uma venda.
   *
   * O `ref` vem da venda (`venda:<id>`), nunca do renderer: assim uma tela não pode pedir duas notas para a
   * mesma venda com refs diferentes.
   */
  ipcMain.handle('hermes:fiscal:emitir', async (_event: unknown, payload: unknown) => {
    if (!payload || typeof payload !== 'object') return { error: 'pedido_invalido' }

    const p = payload as Record<string, unknown>
    const saleId = typeof p['sale_id'] === 'string' ? p['sale_id'] : ''
    const kind = p['kind'] === 'nfce' || p['kind'] === 'nfse' ? p['kind'] : ('nfe' as FiscalDocumentKind)

    if (!saleId) return { error: 'venda_obrigatoria' }

    const r = await deps.store.emitir(provider, {
      kind,
      // O payload fiscal completo (itens, valores, destinatário) é montado quando o adapter real existir.
      // O sandbox não precisa dele, e inventar campos agora criaria um contrato que o emissor real recusaria.
      payload: { sale_id: saleId },
      ref: `venda:${saleId}`,
      tenant_id: serverTenant(p['tenant_id'])
    })

    return r
  })

  ipcMain.handle('hermes:fiscal:cancelar', async (_event: unknown, payload: unknown) => {
    if (!payload || typeof payload !== 'object') return { error: 'pedido_invalido' }

    const p = payload as Record<string, unknown>
    const saleId = typeof p['sale_id'] === 'string' ? p['sale_id'] : ''
    const motivo = typeof p['motivo'] === 'string' ? p['motivo'] : ''

    if (!saleId) return { error: 'venda_obrigatoria' }
    if (!motivo.trim()) return { error: 'motivo_obrigatorio' }

    return deps.store.cancelar(provider, `venda:${saleId}`, motivo, serverTenant(p['tenant_id']))
  })
}
