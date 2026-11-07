import type { Translations } from './types'

/** pt-BR do seletor de modelo do compositor: busca, favoritos, limites de uso e custo. */
export const ptModelMenu: Translations['shell']['modelMenu'] = {
  pickDeferred: (model: string) => `${model} passa a valer na sua próxima mensagem`,
  search: 'Buscar modelos',
  noModels: 'Nenhum modelo encontrado',
  editModels: 'Editar modelos…',
  followDefault: 'Usar o padrão das Configurações',
  refreshModels: 'Atualizar modelos',
  favorites: 'Favoritos',
  addFavorite: 'Adicionar aos favoritos',
  removeFavorite: 'Remover dos favoritos',
  favoriteShortcut: '⇧ Clique',
  fast: 'Rápido',
  free: 'grátis',
  cacheRead: 'leitura em cache',
  priceTitle: (input: string, output: string, cache: string) =>
    `Entrada ${input}/Mtok · Saída ${output}/Mtok` + (cache ? ` · Leitura em cache ${cache}/Mtok` : ''),
  localSetup: {
    title: 'Rodar local · grátis, privado',
    text: (model: string, size: string) => `${model} cabe nesta máquina · ${size} de download`,
    action: 'Configurar'
  },
  limited: 'Limitado',
  limitedUntil: (time: string) => `Limitado até ${time}`,
  limitedTip: (provider: string, time: null | string) =>
    time
      ? `${provider} atingiu o limite de uso. Ele volta às ${time}; você já pode escolher um modelo para depois.`
      : `${provider} atingiu o limite de uso. Você já pode escolher um modelo para quando ele voltar.`,
  modelResets: (time: string) => `volta ${time}`,
  modelLimitedTip: (time: string) =>
    `Este modelo atingiu o próprio limite e volta às ${time}. Os outros modelos daqui continuam funcionando.`,
  usageLeft: (percent: number, time: null | string) =>
    time ? `${percent}% restante · volta ${time}` : `${percent}% restante`,
  poolAccounts: (count: number) => `${count} ${count === 1 ? 'conta' : 'contas'}`,
  poolLimited: (limited: number, total: number) => `${limited}/${total} contas limitadas`,
  poolAccount: (number: number) => `Conta ${number}`,
  poolUnknown: 'Uso indisponível',
  poolUnavailable: 'Entrar de novo',
  usageTip: (provider: string) => `${provider} está perto do limite de uso.`,
  usageWindow: (label: string, percent: number, time: null | string) =>
    time ? `${label}: ${percent}% restante, volta ${time}` : `${label}: ${percent}% restante`
}
