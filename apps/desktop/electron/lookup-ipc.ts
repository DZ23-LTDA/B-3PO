// Canais de consulta pública (CNPJ/CEP).
//
// Leitura pura: não grava nada. Uma resposta errada da API não vira registro — a tela preenche os campos e
// o operador confirma antes de salvar.

import { consultarCep, consultarCnpj } from './lookup'
import type { IpcRegistrar } from './ipc-types'

export function registerLookupIpc(ipcMain: IpcRegistrar): void {
  ipcMain.handle('hermes:lookup:cnpj', async (_event: unknown, cnpj: unknown) => consultarCnpj(cnpj))

  ipcMain.handle('hermes:lookup:cep', async (_event: unknown, cep: unknown) => consultarCep(cep))
}
