import { enDelegationRouting } from './en_delegation_routing'
import type { DelegationRoutingTranslations } from './types_delegation_routing'

/**
 * pt-BR do roteamento de subagentes.
 *
 * Override parcial **declarado**: o cabeçalho, os modos, o diálogo de rota e os estados de bloqueio estão em
 * português; o restante (descrições longas e mensagens de erro raras) herda o inglês por spread. Preferi isso a
 * inventar tradução apressada de texto que quase ninguém lê — e o que falta está listado no relatório.
 */
export const ptDelegationRouting: DelegationRoutingTranslations = {
  ...enDelegationRouting,
  title: 'Roteamento',
  settingsTitle: 'Padrões dos subagentes',
  intro: 'Como cada subagente recebe o modelo dele.',
  modes: {
    default: { label: 'Padrão', description: 'Todo subagente roda no modelo de subagente definido abaixo.' },
    model_map: {
      label: 'Rotas de modelo',
      description: 'Nomeie alguns modelos. O agente escolhe um para cada subagente.'
    },
    profile_routes: {
      label: 'Rotas por perfil',
      description: 'Subagentes rodam como um dos seus perfis, com modelo, skills e chaves próprios.'
    }
  },
  inUse: 'Em uso',
  plugin: 'Plugin',
  installPlugin: 'Instalar plugin',
  enablePlugin: 'Ativar',
  enableFailed: 'Não foi possível ativar o Advanced Delegation',
  modeFailed: 'Não foi possível mudar o roteamento de subagentes',
  loadFailed: 'Não foi possível carregar o roteamento de subagentes',
  blockedPill: 'Não está rodando',
  blockedDetail: 'Este modo está salvo, então o B-3PO recusa cada subagente em vez de usar Padrão sem avisar.',
  blockedMissing: 'Subagentes não iniciam até o Advanced Delegation ser instalado.',
  blockedDisabled: 'Subagentes não iniciam até o Advanced Delegation ser ativado neste perfil.',
  blockedNotLoaded: 'Subagentes não iniciam até o B-3PO carregar o Advanced Delegation. Reinicie para concluir.',
  modelRoutesTitle: 'Rotas de modelo',
  modelRoutesEmpty: 'Sem rotas ainda. Até você adicionar uma, os subagentes usam o modelo do agente principal.',
  addRoute: 'Adicionar rota',
  editRoute: 'Editar',
  makeDefault: 'Tornar padrão',
  deleteRoute: 'Excluir',
  defaultBadge: 'Padrão',
  deleteConfirmTitle: name => `Excluir a rota “${name}”?`,
  deleteConfirmBody: 'Os subagentes não poderão mais escolhê-la.',
  deleteConfirmAction: 'Excluir rota',
  saveFailed: 'Não foi possível salvar as rotas',
  dialogNew: 'Nova rota de modelo',
  dialogEdit: 'Editar rota de modelo',
  dialogDesc: 'O agente lê o nome e a descrição para decidir qual rota um subagente usa.',
  nameLabel: 'Nome',
  namePlaceholder: 'ex.: rápido',
  nameHint: 'Curto, sem espaços. O agente escolhe as rotas por este nome.',
  descriptionLabel: 'Quando usar',
  descriptionPlaceholder: 'ex.: Barato e rápido: consultas, resumos, edições simples.',
  descriptionHint: 'Uma linha que o agente lê antes de escolher.',
  providerLabel: 'Provedor',
  providerPlaceholder: 'Escolha um provedor',
  modelLabel: 'Modelo',
  effortLabel: 'Esforço de raciocínio',
  effortInherit: 'Padrão do subagente',
  tierLabel: 'Velocidade',
  tierNormal: 'Normal',
  tierFast: 'Rápida',
  tierUltrafast: 'Ultra-rápida',
  tierHint: 'Somente em modelos que oferecem isso.',
  optional: 'opcional',
  errors: { required: 'Obrigatório', spaces: 'Sem espaços', duplicate: 'Outra rota já usa este nome' },
  saveRoute: 'Salvar rota',
  createRoute: 'Adicionar rota',
  profileRoutesTitle: 'Perfis em que os subagentes podem rodar',
  profileRoutesHint: 'Cada perfil marcado traz o próprio modelo, skills, persona e chaves.',
  profileDefault: 'Padrão',
  profileEmpty: 'Nenhum outro perfil ainda. Crie um na barra de perfis.'
}
