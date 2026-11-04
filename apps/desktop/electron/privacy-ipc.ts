// Canais do pedido do titular (LGPD).
//
// Sem estes canais, `exportarTitular` e `aplicarAnonimizacao` existem e ninguém alcança — o padrão das
// rodadas 45, 52, 62 e 70: backend pronto e nenhuma porta.
//
// DOIS CANAIS, DOIS RISCOS DIFERENTES
//
// `export` é leitura: pode ser chamado livremente. `anonymize` reescreve registros e não tem desfazer —
// por isso exige que o chamador confirme o alcance que viu. A confirmação não é burocracia: é o que
// separa "ver quantos registros existem" de "apagar sem saber quantos eram".

import type { IpcRegistrar } from './ipc-types'
import { aplicarAnonimizacao, exportarTitular, preverEliminacao, type PrivacyWriteDeps } from './privacy'

export interface PrivacyDeps {
  store: PrivacyWriteDeps
}

export function registerPrivacyIpc(ipcMain: IpcRegistrar, deps: PrivacyDeps): void {
  ipcMain.handle('hermes:privacy:export', async (_event: unknown, telefone: unknown) => exportarTitular(telefone, deps.store))

  ipcMain.handle('hermes:privacy:preview', async (_event: unknown, telefone: unknown) => preverEliminacao(telefone, deps.store))

  /**
   * Executa o pedido. Exige `{ telefone, confirmar: true }`.
   *
   * A flag existe para que a tela não possa chamar por acidente: um botão sem confirmação explícita
   * apagaria o titular num clique errado, e não há lixeira.
   */
  ipcMain.handle('hermes:privacy:anonymize', async (_event: unknown, payload: unknown) => {
    if (!payload || typeof payload !== 'object') return { error: 'pedido_invalido' }

    const p = payload as Record<string, unknown>

    if (p['confirmar'] !== true) return { error: 'confirmacao_obrigatoria' }

    return aplicarAnonimizacao(p['telefone'], deps.store)
  })
}
