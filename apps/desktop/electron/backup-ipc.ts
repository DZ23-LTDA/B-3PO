// Backup e restore expostos ao renderer por IPC.
//
// PERMISSÃO
//
// `list` é `execute`, não `read`. Parece exagero — é só listar arquivos —, mas a lista revela **quais
// domínios existem e quando mudaram**, e o restore ao lado dela é o canal mais destrutivo do app: ele
// sobrescreve dados de negócio. Deixar a descoberta em `read` e a escrita em `execute` convidaria a um
// bot com nível de leitura a montar o alvo; manter as duas no mesmo nível é mais simples de raciocinar e
// não custa nada — quem opera backup é quem opera o sistema.
//
// Recurso `'backup'`, separado de todos os outros: restaurar um arquivo atravessa todos os domínios.

import type { IpcMainInvokeEvent } from 'electron'

import { listarBackups, restaurarBackup, type ArquivoComBackup, type ResultadoRestore } from './backup-restore'
import type { IpcRegistrar } from './ipc-types'
import { exigirAtor } from './permission-guard'
import type { Actor } from './rbac'

export interface BackupIpcDeps {
  actorOf: () => Promise<Actor | null>
  /** O diretório de dados (`<userData>/b3po`), onde os stores e `backups/` vivem. */
  dadosDir: string
}

type Denied = { error: 'sem_permissao'; reason: string }

const RECURSO = 'backup'

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor : ''
}

export function registerBackupIpc(ipcMain: IpcRegistrar, deps: BackupIpcDeps): void {
  ipcMain.handle(
    'hermes:backup:list',
    async (): Promise<Denied | { arquivos: ArquivoComBackup[] }> =>
      exigirAtor(deps.actorOf, 'execute', RECURSO, async () => ({ arquivos: await listarBackups(deps.dadosDir) }))
  )

  ipcMain.handle(
    'hermes:backup:restore',
    async (_event: IpcMainInvokeEvent, nomeArquivo: unknown, versaoArquivo: unknown): Promise<Denied | ResultadoRestore> =>
      exigirAtor(deps.actorOf, 'execute', RECURSO, async () =>
        restaurarBackup(deps.dadosDir, texto(nomeArquivo), texto(versaoArquivo))
      )
  )
}
