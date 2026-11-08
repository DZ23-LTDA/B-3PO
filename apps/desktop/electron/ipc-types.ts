// O mínimo que um registrador de IPC precisa.
//
// Existia um problema silencioso antes deste arquivo: o registrador aceitava `Pick<IpcMain, 'handle'>`,
// e o tipo completo do Electron exige `(event: IpcMainInvokeEvent, ...)`. Os testes usavam um fake mais
// simples, e o `tsc` **não reclamava** porque `tsconfig.json` exclui `electron/` — o typecheck do
// processo principal nunca rodou.
//
// A correção é declarar a dependência real: o registrador só chama `handle(channel, listener)`. Não
// precisa do tipo do Electron, e assim tanto o `ipcMain` de verdade quanto o fake de teste servem.

export interface IpcRegistrar {
  handle: (channel: string, listener: (...args: unknown[]) => unknown) => void
}

/** Listener na forma que o fake de teste implementa: evento primeiro, resto variado. */
export type IpcListener = (event: unknown, ...args: unknown[]) => unknown