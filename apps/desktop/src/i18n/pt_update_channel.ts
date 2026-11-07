import type { UpdateChannelCopy } from './types_update_channel'

/** pt-BR do canal de atualização (estável x cada commit) e do aviso de rollback. */
export const ptUpdateChannel: UpdateChannelCopy = {
  title: 'Canal de atualização',
  description:
    'Instalações estáveis recebem só versões publicadas. A opção "cada commit" acompanha a branch principal conforme as mudanças chegam.',
  stable: 'Versões estáveis',
  main: 'Cada commit',
  stableConfirmTitle: 'Mudar para versões estáveis?',
  stableConfirmBody:
    'O B-3PO vai para a última versão publicada, que pode ser mais antiga que o código que você roda agora. Dados escritos por código mais novo podem não ser lidos corretamente, então faça backup antes.',
  stableConfirm: 'Mudar para estável',
  failed: 'Não foi possível mudar o canal de atualização',
  detailsLabel: 'Canal',
  branch: (b: string) => `Branch: ${b}`,
  change: 'Mudar',
  latestRelease: (v: string) => `Você está na última versão estável (${v}).`,
  rollbackTitle: (v: string) => `Voltar para a versão estável ${v}`,
  rollbackBody: (v: string) =>
    `Esta build é mais nova que a versão estável ${v}. Instalá-la move o B-3PO de volta para aquela versão.`,
  heldBody: (v: string) =>
    `Esta build é mais nova que a versão estável ${v}. Suas sessões já usam um runtime de gateway que a ${v} não abre, então o B-3PO fica nesta build até sair uma versão estável mais nova.`,
  rollbackAction: (v: string) => `Voltar para ${v}`,
  allChanges: 'Ver todas as mudanças'
}
