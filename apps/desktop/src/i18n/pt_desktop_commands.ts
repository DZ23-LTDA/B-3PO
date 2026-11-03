import type { DesktopCommandNotices } from './types_desktop_commands'

/** pt-BR dos comandos de barra do desktop: /rollback /agents /config /history /save /export /import /timestamps. */
export const ptDesktopCommands: DesktopCommandNotices = {
  error: message => `erro: ${message}`,
  rollbackUsage: 'uso: /rollback [list] | diff <n|hash> | <n|hash> [arquivo] [--all]',
  checkpointsDisabled: 'Checkpoints não estão ativos nesta sessão (defina checkpoints.enabled no config.yaml).',
  checkpointsEmpty: 'Ainda não há checkpoints para este diretório de trabalho.',
  checkpointsHeader: 'Checkpoints (mais recentes primeiro):',
  checkpointsHint:
    'Restaure com /rollback <n> [arquivo] (use --all para sobrescrever também suas próprias edições); veja antes com /rollback diff <n>.',
  noDiff: 'Nenhuma mudança desde aquele checkpoint.',
  rollbackFailed: error => `Falha no rollback: ${error}`,
  unknownError: 'erro desconhecido',
  restored: hash => (hash ? `Checkpoint ${hash} restaurado.` : 'Checkpoint restaurado.'),
  rewound: count => `Retrocedidas ${count} mensagem(ns) desta conversa.`,
  reopenForRewind: 'Reabra esta conversa para ver a conversa retrocedida.',
  agentsEmpty: 'Nenhum subagente ativo nem processo em segundo plano nesta conversa.',
  subagentsHeader: count => `Subagentes (${count}):`,
  subagentFallback: 'subagente',
  statusRunning: 'rodando',
  toolCalls: count => `${count} chamadas de ferramenta`,
  processesHeader: count => `Processos em segundo plano (${count}):`,
  configHeader: 'Configuração (exibição, aprovações, colagem e voz; o resto não aparece aqui):',
  configDefaults: '(padrões)',
  configFooter: 'Mude nas Configurações, ou edite o config.yaml com `hermes config edit` no host do gateway.',
  historyHeader: count => `Histórico da conversa (${count} mensagens):`,
  historyEmpty: 'Nenhuma mensagem ainda.',
  historyYou: 'Você',
  historyHermes: 'Hermes',
  saveUsage: 'uso: /save [json|md|html] [arquivo] [redact]',
  saveLegacyRefused:
    'Não salvo: este gateway não exporta cópia redigida, com nome ou fora de JSON. Atualize o gateway, ou rode /save sem opções para gravar o JSON bruto no host do gateway.',
  savedOnHost: path => `Salvo no host do gateway: ${path}`,
  unknownPath: '(caminho desconhecido)',
  saveUnsupported: 'erro: esta build do desktop não consegue salvar arquivos',
  saveDialogTitle: 'Salvar conversa',
  savedTo: path => `Conversa salva em ${path}`,
  saveCancelled: 'Não salvo (cancelado).',
  exportRemote:
    '/export empacota um perfil no host do gateway, que não é esta máquina. Rode `hermes profile export` naquele host.',
  importRemote:
    '/import instala um perfil no host do gateway, que não é esta máquina. Rode `hermes profile import <arquivo>` naquele host.',
  timestampsUsage: 'uso: /timestamps [on|off|status]',
  timestampsOn: 'Horários: ligados (só nesta janela; defina display.timestamps no config.yaml para manter)',
  timestampsOff: 'Horários: desligados (só nesta janela; defina display.timestamps no config.yaml para manter)'
}
