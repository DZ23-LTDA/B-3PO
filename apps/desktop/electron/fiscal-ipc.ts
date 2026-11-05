// Canais do documento fiscal.
//
// O provedor é resolvido UMA vez, na montagem, a partir do ambiente do processo. O renderer não escolhe
// emissor nem vê credencial: ele pede "emita a nota desta venda" e recebe o que o servidor conseguiu.
//
// `status` do provedor é exposto para a tela poder dizer a verdade: "homologação" quando não há emissor real,
// "não configurado" quando há emissor escolhido e falta a chave.
//
// r4 do GOAL V2: os quatro canais passam pela guarda. `emitir` produz documento com efeito legal e `cancelar`
// desfaz um documento já emitido — nenhum dos dois é operação de plataforma.

import type { IpcRegistrar } from './ipc-types'
import { exigirAtor } from './permission-guard'
import { resolverProvedor, variaveisFaltando, type FiscalDocumentKind } from './fiscal-provider'
import { FiscalStore, type FiscalRecord } from './fiscal-store'
import type { Actor } from './rbac'
import { serverTenant } from './server-tenant'

export interface FiscalDeps {
  provider?: ReturnType<typeof resolverProvedor>
  store: FiscalStore

  /**
   * Ator resolvido no processo principal. `null` recusa.
   *
   * Obrigatório de propósito: emitir nota fiscal não é leitura. Um ator opcional faria o canal parecer
   * protegido e continuar aberto.
   */
  actorOf: () => Promise<Actor | null>
}

export function registerFiscalIpc(ipcMain: IpcRegistrar, deps: FiscalDeps): void {
  const provider = deps.provider ?? resolverProvedor(process.env)

  ipcMain.handle(
    'hermes:fiscal:list',
    async (_event: unknown, tenantId: unknown): Promise<unknown> =>
      exigirAtor(deps.actorOf, 'read', 'fiscal', async () => ({
        documents: await deps.store.list(serverTenant(tenantId))
      }))
  )

  /** Estado do emissor, para a tela poder rotular "homologação" em vez de "autorizada". */
  ipcMain.handle('hermes:fiscal:status', async (): Promise<unknown> =>
    exigirAtor(deps.actorOf, 'read', 'fiscal', async () => ({
      faltando: variaveisFaltando(process.env),
      homologado: provider.homologado,
      id: provider.id,
      nome: provider.nome
    }))
  )

  /**
   * Emite a nota de uma venda.
   *
   * O `ref` vem da venda (`venda:<id>`), nunca do renderer: assim uma tela não pode pedir duas notas para a
   * mesma venda com refs diferentes.
   *
   * Ação `execute`: emitir é o ato com efeito legal. A guarda roda antes da validação do payload — sem
   * ator, a resposta é `sem_permissao` e nem se avalia se o pedido estava bem formado.
   */
  ipcMain.handle('hermes:fiscal:emitir', async (_event: unknown, payload: unknown): Promise<unknown> =>
    exigirAtor(deps.actorOf, 'execute', 'fiscal', async () => {
      if (!payload || typeof payload !== 'object') return { error: 'pedido_invalido' }

      const p = payload as Record<string, unknown>
      const saleId = typeof p['sale_id'] === 'string' ? p['sale_id'] : ''
      const kind = p['kind'] === 'nfce' || p['kind'] === 'nfse' ? p['kind'] : ('nfe' as FiscalDocumentKind)

      if (!saleId) return { error: 'venda_obrigatoria' }

      return deps.store.emitir(provider, {
        kind,
        // O payload fiscal completo (itens, valores, destinatário) é montado quando o adapter real existir.
        // O sandbox não precisa dele, e inventar campos agora criaria um contrato que o emissor real recusaria.
        payload: { sale_id: saleId },
        ref: `venda:${saleId}`,
        tenant_id: serverTenant(p['tenant_id'])
      })
    })
  )

  /**
   * Cancela um documento já emitido.
   *
   * Ação `execute` pela mesma razão: cancelamento também tem efeito legal, e é irreversível do ponto de
   * vista do fisco — a nota emitida e cancelada não volta a valer.
   */
  ipcMain.handle('hermes:fiscal:cancelar', async (_event: unknown, payload: unknown): Promise<unknown> =>
    exigirAtor(deps.actorOf, 'execute', 'fiscal', async () => {
      if (!payload || typeof payload !== 'object') return { error: 'pedido_invalido' }

      const p = payload as Record<string, unknown>
      const saleId = typeof p['sale_id'] === 'string' ? p['sale_id'] : ''
      const motivo = typeof p['motivo'] === 'string' ? p['motivo'] : ''

      if (!saleId) return { error: 'venda_obrigatoria' }
      if (!motivo.trim()) return { error: 'motivo_obrigatorio' }

      return deps.store.cancelar(provider, `venda:${saleId}`, motivo, serverTenant(p['tenant_id']))
    })
  )
}
