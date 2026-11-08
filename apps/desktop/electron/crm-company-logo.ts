/**
 * Token do logo.dev para o logo da empresa no CRM.
 *
 * Fica no processo principal, não no renderer: o renderer recebe só o token publicável já resolvido, e o valor
 * vem de `B3PO_LOGO_DEV_TOKEN` (env) ou de um arquivo de configuração do usuário — nunca do repositório.
 * Sem token, o recurso fica desligado e nenhum domínio de cliente sai da máquina.
 */

export interface CompanyLogoConfig {
  /** `true` quando existe token: a tela pode oferecer o logo e avisar sobre o pedido externo. */
  enabled: boolean
  /** Token publicável (`pk_…`). Vazio quando desligado. */
  token: string
}

export const COMPANY_LOGO_CHANNEL = 'hermes:crm-company-logo:config'

export function readCompanyLogoConfig(env: NodeJS.ProcessEnv = process.env): CompanyLogoConfig {
  const token = (env['B3PO_LOGO_DEV_TOKEN'] ?? '').trim()

  return { enabled: Boolean(token), token }
}

/** Interface mínima do ipcMain — evita depender do tipo do Electron no teste. */
interface IpcMainLike {
  handle: (channel: string, listener: () => CompanyLogoConfig) => void
}

export function registerCrmCompanyLogoIpc(ipcMain: IpcMainLike): void {
  ipcMain.handle(COMPANY_LOGO_CHANNEL, () => readCompanyLogoConfig())
}
