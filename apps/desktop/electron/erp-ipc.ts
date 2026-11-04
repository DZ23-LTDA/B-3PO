// Montagem do IPC do Business Core (ERP), separada da montagem do CRM.
//
// Um domínio entra aqui quando tem store e testes — não antes. Cada um é ligado no seu próprio store,
// sobre os mesmos arquivos sob `userData`, e o renderer só alcança o que está registrado.

import type { IpcMain } from 'electron'

import { CatalogStore, catalogStorePath } from './catalog-store'
import { registerCatalogIpc } from './catalog-ipc'

/**
 * Monta os IPC do ERP. Hoje só o catálogo; estoque, vendas, financeiro e agenda entram aqui conforme
 * cada um ganha tela — registrá-los antes disso exporia canal sem consumidor.
 */
export function mountErpIpc(ipcMain: Pick<IpcMain, 'handle'>, userDataDir: string): void {
  registerCatalogIpc(ipcMain, new CatalogStore(catalogStorePath(userDataDir)))
}
