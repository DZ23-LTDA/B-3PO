import type { MemoryLayersTranslations } from './types_memory_layers'

/** pt-BR das camadas de memória (Configurações ▸ Memória e contexto). */
export const ptMemoryLayers: MemoryLayersTranslations = {
  activeProvider: 'Provedor de memória ativo',
  selectedProvider: 'Provedor de memória selecionado',
  selectedDesc: current => `Ainda não está ativo: as sessões seguem usando ${current} até esta escolha ser salva.`,
  builtinMemory: 'apenas a memória embutida',
  noProvider: 'Nenhum — apenas a memória embutida',
  noProviderDesc:
    'O B-3PO usa só a camada embutida abaixo. Escolha um provedor externo em Configurações ▸ Memória e contexto para somar uma.',
  providerDesc: name => `${name} soma a própria recuperação a cada sessão, além da camada embutida.`,
  providerNotReadyDesc: name =>
    `${name} é o provedor salvo, mas não soma nada até ficar pronto. A camada embutida funciona de qualquer forma.`,
  providerUnknownDesc: name => `${name} é o provedor salvo; o B-3PO não conseguiu ler se ele está pronto.`,
  statusUnavailable: 'Status da memória indisponível',
  statusUnavailableDesc: 'Não foi possível ler qual provedor de memória está ativo nem se ele está pronto.',
  retry: 'Tentar de novo',
  status: {
    ready: 'pronto',
    needs_config: 'precisa configurar',
    unavailable: 'indisponível',
    missing: 'não instalado'
  },
  builtinLayer: 'Camada embutida',
  onByDefault: 'Ligada por padrão',
  on: 'Ligada',
  off: 'Desligada',
  onlyFile: file => `somente ${file}`,
  builtinDesc:
    'MEMORY.md e USER.md são a memória do próprio B-3PO, separada de qualquer provedor externo. As duas entram nas sessões por padrão; os botões de memória e perfil de usuário em Configurações ▸ Memória e contexto desligam cada uma. Um provedor soma a esta camada; nunca a substitui.'
}
