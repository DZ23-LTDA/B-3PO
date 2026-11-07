import { ptAuxTasks } from './pt_aux_tasks'
import { ptDelegationRouting } from './pt_delegation_routing'
import type { ModelSettingsTranslations } from './types_model_settings'

/**
 * pt-BR do painel de modelo.
 *
 * Sem este arquivo o painel inteiro caía no inglês (os outros seis locales já tinham o seu). Nomes de
 * provider, ids de modelo e `MoA`/`Mixture of Agents` ficam como referência técnica; o texto de interface
 * é traduzido.
 */
export const ptModelSettings: ModelSettingsTranslations = {
  setupProviderFallback: 'provedor',
  setUpProvider: name => `Configurar ${name}`,
  // Mesma ordem e mesma quantidade de placeholders do inglês ([count, count, names]) — o teste de
  // cobertura compara os nomes dentro do template, e trocar a ordem faria a tela renderizar errado.
  staleAuxBefore: (count, names) =>
    `${count} ${count === 1 ? 'tarefa auxiliar continua' : 'tarefas auxiliares continuam'} (${names}) em `,
  staleAuxAfter: ', não no seu modelo principal.',
  staleAuxOtherProviders: 'outros provedores',
  moaEnabled: 'Ativado',
  moaSetDefault: 'Definir como padrão',
  moaNewPresetPlaceholder: 'nova predefinição',
  moaAddPreset: 'Adicionar predefinição',
  customModel: 'Modelo personalizado…',
  customModelPlaceholder: 'Id do modelo',
  chooseFromList: 'Escolher da lista',
  moaDefault: 'Padrão:',
  moaReferenceToggle: (enabled, index) => `${enabled ? 'Desativar' : 'Ativar'} referência ${index}`,
  moaReferenceTitle: index => `Referência ${index}`,
  moaAddReference: 'Adicionar modelo de referência',
  loading: 'Carregando a configuração de modelos…',
  appliesDesc:
    'Vale para sessões novas. Use o seletor de modelo no compositor para trocar o modelo da conversa atual.',
  provider: 'Provedor',
  model: 'Modelo',
  applying: 'Aplicando…',
  mainAppliedTitle: 'Modelo principal atualizado',
  mainAppliedMessage: model => `Sessões novas vão usar ${model}.`,
  defaultsLabel: 'Padrões',
  reasoning: 'Raciocínio',
  reasoningOff: 'Desligado',
  speed: 'Velocidade',
  speedStandard: 'Padrão',
  defaultsFailed: 'Não foi possível salvar os padrões de modelo',
  loadFailed: 'Não foi possível carregar os modelos',
  restartRequired:
    'Este backend está rodando código antigo depois de uma atualização. Reinicie para carregar o código novo.',
  restartBackend: 'Reiniciar o backend',
  restartingBackend: 'Reiniciando o backend…',
  restartFailed: 'Não foi possível reiniciar o backend',
  auxiliaryTitle: 'Modelos auxiliares',
  resetAllToMain: 'Voltar tudo ao principal',
  staleAuxDismiss: 'Não mostrar de novo',
  auxiliaryDesc:
    'Tarefas auxiliares rodam no modelo principal por padrão. Atribua um modelo dedicado a qualquer tarefa para substituir isso.',
  setToMain: 'Usar o principal',
  change: 'Alterar',
  autoUseMain: 'automático · usar o modelo principal',
  inheritMainEffort: 'herdar · esforço do modelo principal',
  inheritsFrom: task => `herda de ${task}`,
  followTask: task => `Seguir ${task}`,
  providerDefault: '(padrão do provedor)',
  fallbackAdd: 'Adicionar fallback',
  fallbackEmpty: 'Sem modelos de fallback — o modelo padrão é usado, a menos que falhe.',
  notInCatalog: 'não está na lista de modelos deste provedor — as chamadas podem cair num modelo de reserva.',
  moaTitle: 'Mistura de agentes',
  moaPreset: 'Predefinição',
  moaDescription:
    'Configure predefinições nomeadas que aparecem como modelos no provedor Mistura de agentes. O agregador é o modelo que age — ele roda cada passo do laço de ferramentas, e quase todo o custo da execução é cobrado no provedor dele. As referências, por padrão, apenas aconselham uma vez por turno do usuário.',
  moaAggregator: 'Agregador',
  moaAggregatorBilled: 'modelo que age · cobrado pela execução',
  moaReferenceHint: 'aconselha uma vez por turno, por padrão',
  tasks: ptAuxTasks,
  subagents: {
    inherit: 'Herdar do agente principal',
    modelOnly: 'Modelo personalizado (usar as credenciais do agente pai)',
    providerLabel: 'Provedor do subagente',
    modelLabel: 'Modelo do subagente',
    direct: 'Substituir por endpoint direto',
    customProvider: 'Provedor personalizado…',
    customProviderLabel: 'Provedor personalizado do subagente',
    parentModel: 'Usar o modelo do agente pai',
    parentModelWarning:
      'O provedor escolhido precisa suportar o modelo do agente pai. Uma rota só por provedor pode falhar se o modelo for incompatível. Se esse provedor define um modelo padrão próprio, os subagentes usam esse.',
    directActive:
      'Há um endpoint direto ativo, e ele tem precedência sobre o provedor salvo. O endpoint e as credenciais são mantidos enquanto este modo estiver selecionado.',
    directClear:
      'Aplicar esta rota limpa o endpoint direto e a chave guardada dele. As demais configurações de requisição são mantidas.',
    catalogFailed:
      'Catálogo de modelos indisponível. Informe provedor e modelo manualmente, ou tente de novo.',
    draftHint: 'As mudanças ficam locais até serem aplicadas.',
    routing: ptDelegationRouting
  }
}
