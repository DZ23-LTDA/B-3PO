import type { Translations } from './types'

/** pt-BR da lista de contas de um conector (adicionar, renomear, remover, status). */
export const ptConnectorAccounts: Translations['connectorsPage']['accounts'] = {
  heading: 'Contas',
  count: (count: number) => `${count} ${count === 1 ? 'conta' : 'contas'}`,
  addAnother: 'Adicionar outra conta',
  aliasLabel: 'Nome da conta',
  aliasHint: 'Letras minúsculas, números e hífens, até 32. Por exemplo trabalho ou casa.',
  aliasInvalid: 'Use letras minúsculas, números e hífens, começando com letra ou número.',
  aliasTaken: 'Esse nome já está em uso.',
  add: 'Conectar',
  rename: 'Renomear',
  renameLabel: (name: string) => `Novo nome para ${name}`,
  renameGone: 'Essa conta não está mais lá. Ela foi removida ou substituída por uma reconexão.',
  remove: 'Remover',
  removeTitle: (app: string, name: string) => `Remover a conta ${name} de ${app}?`,
  removeBody: 'O B-3PO deixa de agir como esta conta. Suas outras contas continuam conectadas.',
  // Uma única ocorrência de ${count}, como no inglês — o teste de cobertura compara a lista de placeholders.
  retiredCount: (count: number) => `${count} em desuso`,
  status: {
    expired: 'Acesso expirado',
    failed: 'Não foi possível conectar',
    inactive: 'Inativa',
    pending: 'Esperando login',
    retired: 'Substituída por uma reconexão',
    revoked: 'Acesso revogado'
  }
}
