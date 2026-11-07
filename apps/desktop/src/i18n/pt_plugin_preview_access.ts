import type { PluginPreviewAccessTranslations } from './types_plugin_preview_access'

/** pt-BR do consentimento de scripts de plugin no preview e da lista de permissões. */
export const ptPluginPreviewAccess: PluginPreviewAccessTranslations = {
  previewScriptPromptTitle: (plugin: string) => `Deixar ${plugin} rodar scripts nesta página?`,
  previewScriptPromptBody: (plugin: string, origin: string) =>
    `${plugin} quer rodar JavaScript no navegador de preview em ${origin}.`,
  previewScriptPromptRisk:
    'Scripts podem ler e alterar tudo naquele site, inclusive páginas de contas em que você está conectado ali.',
  previewScriptPromptRevokeHint: 'Vale só para este site. Você pode revogar em Capacidades ▸ Plugins.',
  previewScriptAllow: 'Permitir neste site',
  previewScriptDeny: 'Não permitir',
  previewScriptAccessLabel: 'Scripts de página',
  previewScriptAccessNone: 'Pergunta antes de rodar scripts numa página',
  previewScriptRevoke: (origin: string) => `Revogar o acesso a ${origin}`,
  previewScriptRevoked: (plugin: string, origin: string) => `${plugin} não pode mais rodar scripts em ${origin}.`,
  previewScriptRevokeUnsaved: (plugin: string, origin: string) =>
    `Não foi possível salvar essa mudança, então ela vale só até o B-3PO reiniciar. ${plugin} fica bloqueado em ${origin} por enquanto.`
}
