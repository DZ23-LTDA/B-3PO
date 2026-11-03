import type { PluginUpdateTranslations } from './types_plugin_update'

/** pt-BR de atualização de plugin: pastas liberadas, consentimento do novo pin e varredura de segurança. */
export const ptPluginUpdate: PluginUpdateTranslations = {
  folderAccess: {
    title: 'Acesso a pastas',
    hint: (name: string) => `${name} pode ler e alterar arquivos nestas pastas. Revogar vale na hora.`,
    revoke: 'Revogar',
    revokeLabel: (path: string) => `Revogar o acesso a ${path}`,
    revoked: (name: string, path: string) => `${name} não pode mais usar ${path}.`,
    revokeFailed: (name: string) => `Não foi possível revogar o acesso a pastas de ${name}`,
    pickerTitle: (name: string) => `Escolha uma pasta para ${name}`,
    pickerButton: 'Permitir acesso',
    refusedProtected: (name: string) =>
      `${name} não pode usar essa pasta: ela guarda configurações, chaves ou dados de plugins do B-3PO. Escolha uma pasta que não contenha isso.`,
    loadFailed: (name: string) => `Não foi possível carregar as pastas compartilhadas com ${name}.`
  },
  updateToPin: (sha: string) => `Atualizar para ${sha}`,
  updateFailed: (name: string) => `Não foi possível atualizar ${name}`,
  updated: (name: string) => `${name} atualizado para o pin atual do catálogo. Reinicie o gateway para aplicar.`,
  updateConsentTitle: (name: string) => `${name} pede mais`,
  updateConsentBody: (name: string, sha: string) =>
    `O novo pin de catálogo de ${name} (${sha}) adiciona superfícies que a versão instalada não tem. Aplique só se confiar nelas:`,
  updateConsentConfirm: 'Aplicar atualização',
  updateScanTitle: (name: string) => `A varredura de segurança marcou ${name}`,
  updateScanBody: (name: string, count: number) =>
    `A atualização de ${name} recebeu veredito de atenção (${count} ${count === 1 ? 'achado' : 'achados'}). Toda atualização é varrida. Aplique só se confiar na origem:`,
  updateScanMore: (count: number) => `+ ${count} mais`,
  updateScanConfirm: 'Atualizar mesmo assim',
  updateScanBlocked: (name: string) =>
    `A varredura de segurança bloqueou a atualização de ${name} (veredito perigoso). Não é possível ignorar.`,
  updatedGit: (name: string) => `${name} atualizado para o último commit.`
}
