/**
 * pt-BR — Português do Brasil.
 *
 * O catálogo é um override parcial sobre o inglês (`defineLocale` → `mergeTranslations`): toda chave
 * que não está aqui cai no inglês, então nada quebra e a cobertura cresce por seção.
 *
 * Regra de tradução: textos apresentados ao usuário são traduzidos; **referências técnicas de
 * runtime continuam em inglês** — "B-3PO", "gateway", nomes de comando (`hermes`), nomes de
 * provider e caminhos. Placeholders e funções mantêm a mesma assinatura do original.
 */
import { defineLocale, type TranslationOverrides } from './define-locale'
import { defineFieldCopy } from '@/app/settings/field-copy'
import { ptBoot } from './pt_boot'
import { ptCatalog } from './pt_catalog'
import { ptClarify } from './pt_clarify'
import { ptConnectorAccounts } from './pt_connector_accounts'
import { ptConnectorCard } from './pt_connector_card'
import { ptConnectors } from './pt_connectors'
import { ptCronControl } from './pt_cron_control'
import { ptErrorCodes } from './pt_error_codes'
import { ptErrorLayers } from './pt_error_layers'
import { ptFirstRun } from './pt_first_run'
import { ptGatewayHost } from './pt_gateway_host'
import { ptKeybinds } from './pt_keybinds'
import { ptLocalModels } from './pt_local_models'
import { ptModelMenu } from './pt_model_menu'
import { ptNotices } from './pt_notices'
import { ptOnboarding } from './pt_onboarding'
import { ptPreviewWeb } from './pt_preview_web'
import { ptProjects } from './pt_projects'
import { ptNotifications } from './pt_notifications'
import { ptPluginUpdate } from './pt_plugin_update'
import { ptMemoryLayers } from './pt_memory_layers'
import { ptModelSettings } from './pt_model_settings'
import { ptPluginPreviewAccess } from './pt_plugin_preview_access'
import { ptSharedMetrics } from './pt_shared_metrics'
import { ptThemePicker } from './pt_theme_picker'
import { ptUpdateChannel } from './pt_update_channel'
import { ptModelOptions } from './pt_model_options'

export const ptOverrides: TranslationOverrides = {
  connectors: ptConnectorCard,
  connectorsPage: ptConnectors,
  catalog: ptCatalog,
  onboarding: ptOnboarding,
  firstRun: ptFirstRun,
  ...ptNotices,
  sharedMetrics: ptSharedMetrics,
  cron: { control: ptCronControl },
  ...ptBoot,
  skills: { plugins: { ...ptPluginPreviewAccess, ...ptPluginUpdate } },
  preview: { web: ptPreviewWeb },
  commandCenter: { settings: 'Configurações' },
  common: {
    apply: 'Aplicar',
    back: 'Voltar',
    save: 'Salvar',
    saving: 'Salvando…',
    cancel: 'Cancelar',
    change: 'Alterar',
    choose: 'Escolher',
    clear: 'Limpar',
    close: 'Fechar',
    collapse: 'Recolher',
    confirm: 'Confirmar',
    connect: 'Conectar',
    connecting: 'Conectando',
    continue: 'Continuar',
    bots: 'Bots',
    copied: 'Copiado',
    copy: 'Copiar',
    copyFailed: 'Falha ao copiar',
    delete: 'Excluir',
    docs: 'Documentação',
    done: 'Concluído',
    error: 'Erro',
    expand: 'Expandir',
    failed: 'Falhou',
    formatJson: 'Formatar JSON',
    free: 'Grátis',
    loading: 'Carregando…',
    notSet: 'Não definido',
    refresh: 'Atualizar',
    remove: 'Remover',
    replace: 'Substituir',
    retry: 'Tentar de novo',
    run: 'Executar',
    send: 'Enviar',
    set: 'Definir',
    skip: 'Pular',
    update: 'Atualizar',
    tryHint: term => `Tente “${term}”`,
    on: 'Ligado',
    off: 'Desligado'
  },

  install: {
    stageStates: {
      pending: 'Pendente',
      running: 'Instalando',
      succeeded: 'Concluído',
      skipped: 'Ignorado',
      failed: 'Falhou'
    },
    oneTimeTitle: 'O B-3PO precisa de uma instalação única',
    unsupportedDesc: platform =>
      `A instalação automática no primeiro uso ainda não está disponível em ${platform}. Abra o Terminal, rode o comando abaixo e reabra este aplicativo. As próximas aberturas pulam esta etapa.`,
    installCommand: 'Comando de instalação',
    copyCommand: 'Copiar comando',
    viewDocs: 'Ver documentação de instalação',
    installTo: 'Vai instalar em',
    retryAfterRun: 'Já rodei, tentar de novo',
    setupChoiceTitle: 'Configurar o B-3PO',
    setupChoiceDesc:
      'Conecte este aplicativo a um runtime B-3PO que você já usa, ou instale localmente neste computador.',
    setupChoiceDescLocal: 'Instale o B-3PO neste computador, ou conecte a um runtime que você já usa.',
    connectExistingTitle: 'Conectar a um runtime B-3PO existente',
    connectExistingShort: 'Conectar existente',
    connectExistingDesc:
      'Use um backend remoto com token de sessão ou login pelo navegador. Nenhuma instalação local será iniciada.',
    installLocalTitle: 'Instalar o B-3PO localmente',
    installLocalDesc:
      'Baixa o runtime do B-3PO, cria o ambiente Python dele e roda o backend neste computador.',
    useLocalTitle: 'Usar o B-3PO neste computador',
    useLocalDesc:
      'Já existe um runtime B-3PO instalado aqui — inicie com um clique. Nada será baixado.',
    bundledLocalDesc:
      'Use o runtime incluído neste aplicativo — o backend empacotado é a instalação local.',
    localStartUnavailable: 'Não foi possível iniciar a instalação local. Reinicie o B-3PO e tente de novo.',
    remoteSetupTitle: 'Conectar a um runtime B-3PO existente',
    remoteSetupDesc:
      'Informe a URL do gateway. O B-3PO detecta se ele precisa de token ou de login pelo navegador.',
    remoteUrlTitle: 'URL do gateway',
    remoteUrlDesc: 'Use a URL base do runtime B-3PO, incluindo https:// quando for remoto.',
    remoteUrlPlaceholder: 'https://gateway.example.com/hermes',
    probing: 'Detectando a autenticação do gateway...',
    probeError:
      'O B-3PO não alcança esse endereço. Confira a URL e se o outro computador está rodando o B-3PO — as opções de login aparecem quando ele responder.',
    probeErrorDetails: 'Detalhes',
    identityProvider: 'seu provedor de identidade',
    authTitle: 'Autenticação',
    authNeedsOauth: provider => `Entre com ${provider} antes de testar este gateway.`,
    authSignedIn: 'Login pelo navegador concluído.',
    connected: 'Conectado',
    signIn: 'Entrar',
    signInWith: provider => `Entrar com ${provider}`,
    enterUrlFirst: 'Informe a URL do gateway primeiro.',
    signInIncomplete: 'A janela de login fechou antes de a autenticação terminar.',
    tokenTitle: 'Token de sessão',
    tokenDesc: 'Cole o token de sessão do arquivo .env do gateway remoto.',
    pasteSessionToken: 'Colar token de sessão',
    incompleteSignInTest: 'Entre antes de testar este gateway com OAuth.',
    incompleteTokenTest: 'Informe um token de sessão antes de testar este gateway.',
    testConnection: 'Testar conexão',
    testSucceeded: (baseUrl, version) => `Conectado a ${baseUrl}${version ? ` (${version})` : ''}.`,
    applyRemote: 'Aplicar e reconectar',
    backToSetup: 'Voltar',
    failedTitle: 'A instalação falhou',
    settingUpTitle: 'Preparando o B-3PO',
    finishingTitle: 'Finalizando',
    failedDesc:
      'Uma das etapas de configuração não terminou. Isso acontece quando outra cópia do Hermes está aberta, a conexão caiu ou o antivírus bloqueou o instalador. Feche as outras janelas do Hermes e escolha Recarregar e tentar de novo. Se falhar de novo, abra os logs e envie ao suporte.',
    activeDesc:
      'Esta configuração é única. O instalador do Hermes está baixando dependências e preparando a máquina. As próximas aberturas pulam esta etapa.',
    progress: (completed, total) => `${completed} de ${total} etapas concluídas`,
    currentStage: stage => ` — agora: ${stage}`,
    fetchingManifest: 'Buscando o manifesto do instalador...',
    error: 'Erro',
    hideOutput: 'Ocultar saída do instalador',
    showOutput: 'Mostrar saída do instalador',
    lines: count => `${count} linha${count === 1 ? '' : 's'}`,
    noOutput: 'Nenhuma saída ainda.',
    cancelling: 'Cancelando...',
    cancelInstall: 'Cancelar instalação'
  },
  /** Painel Atalhos de teclado (nomes das acoes + rotulos do painel). */
  keybinds: ptKeybinds,
  language: {
    label: 'Idioma',
    description: 'Escolha o idioma da interface do aplicativo.',
    saving: 'Salvando idioma…',
    saveError: 'Falha ao atualizar o idioma',
    switchTo: 'Trocar idioma',
    searchPlaceholder: 'Pesquisar idiomas…',
    noResults: 'Nenhum idioma encontrado'
  },
  errors: {
    genericFailure: 'Algo deu errado',
    boundaryTitle: 'Algo quebrou na interface',
    boundaryDesc: 'A tela encontrou um erro inesperado. Suas conversas e configurações estão seguras.',
    boundaryDetails: 'Detalhes',
    sendDiagnostics: 'Enviar diagnóstico',
    reloadWindow: 'Recarregar janela',
    openLogs: 'Abrir logs'
  },
  ui: {
    search: {
      clear: 'Limpar pesquisa'
    },
    logs: {
      bottom: 'Fim do log',
      search: 'Pesquisar nos logs…',
      top: 'Início do log'
    },
    pagination: {
      label: 'paginação',
      previous: 'Anterior',
      previousAria: 'Ir para a página anterior',
      next: 'Próxima',
      nextAria: 'Ir para a próxima página'
    },
    sidebar: {
      title: 'Barra lateral',
      description: 'Exibe a barra lateral no modo compacto.',
      toggle: open => `${open ? 'Mostrar' : 'Ocultar'} barra lateral`
    }
  },
  modelPicker: {
    title: 'Trocar de modelo',
    current: 'atual:',
    unknown: '(desconhecido)',
    search: 'Filtrar provedores e modelos…',
    noModels: 'Nenhum modelo encontrado.',
    addProvider: 'Adicionar provedor',
    loadFailed: 'Não foi possível carregar os modelos',
    downloading: 'Baixando',
    localDownloadsHeading: 'Local',
    noAuthenticatedProviders: 'Nenhum provedor autenticado.',
    pro: 'Pro',
    proNeedsSubscription: 'Modelos Pro exigem assinatura paga da Nous.',
    free: 'Grátis',
    freeTier: 'Plano gratuito',
    priceTitle: 'Preço de entrada / saída por milhão de tokens',
    wasPrice: 'era',
    customModel: 'Modelo personalizado',
    addCustomModelAction: 'Adicionar modelo personalizado…',
    customModelPlaceholder: 'Digite um id de modelo, ex.: openai/gpt-5',
    today: 'Hoje',
    week: 'Semana',
    month: 'Mês',
    topTier: 'Modelos grandes (mensal)',
    included: 'Todos os modelos abaixo estão incluídos',
    pausedRenewal: 'pausado: renovação não paga',
    pausedOther: 'pausado',
    includedUsedUp: 'Uso incluído esgotado',
    limitReached: name => `${name.charAt(0).toUpperCase()}${name.slice(1)}: limite atingido`,
    limitNames: { day: 'diário', month: 'mensal', top_tier: 'mensal de modelos grandes', week: 'semanal' },
    limitThenCredits: 'modelos pagos agora usam seus créditos (pague conforme o uso)',
    limitThenCreditsLarge: 'Modelos grandes agora usam seus créditos (pague conforme o uso)',
    limitThenWait: 'só modelos grátis até lá',
    limitThenWaitLarge: 'Modelos grandes pausados até lá',
    percentUsed: percent => `${percent} usado`,
    resetsIn: duration => `reinicia em ${duration}`,
    usageLevels: { free: 'Grátis', top_tier: 'Grande' },
    sectionRecommended: 'Recomendado'
  },
  statusStack: {
    stop: 'Parar',
    running: 'Em execução',
    dismiss: 'Dispensar'
  },
  assistant: {
    clarify: ptClarify,
    themePicker: ptThemePicker,
    thread: {
      noEmoji: 'Nenhum emoji encontrado.',
      moreEmoji: 'Mais emojis',
      reactedByHermes: 'Reagido pelo B-3PO',
      ...ptErrorLayers,
      errorCodes: ptErrorCodes,
      stop: 'Parar'
    }
  },
  // Barra de status: o bloco do en.ts é `shell.statusbar` e não estava coberto aqui, então a barra
  // inteira aparecia em inglês ("Backend ready", "Gateway", "ready"). Traduzido o que o usuário vê.
  shell: {
    modelOptions: ptModelOptions,
    minimizeWindow: 'Minimizar janela',
    closeWindow: 'Fechar janela',
    windowControls: 'Controles da janela',
    modelMenu: ptModelMenu,
    approvalMode: {
      title: 'Modo de aprovação',
      manual: 'Manual',
      manualDescription: 'Perguntar antes de ações que exigem aprovação',
      smart: 'Inteligente',
      smartDescription: 'Avaliar as ações e perguntar quando necessário',
      off: 'Desligado',
      offDescription: 'Executar sem pedir aprovação'
    },
    statusbar: {
      unknown: 'desconhecido',
      restart: 'reiniciar',
      update: 'atualizar',
      updateInProgress: 'Atualização em andamento',
      releaseAvailable: tag => `A versão ${tag} está disponível.`,
      desktopVersion: version => `B-3PO Desktop v${version}`,
      backendVersion: version => `Servidor v${version}`,
      backendLabel: version => `servidor v${version}`,
      clientLabel: version => (version === 'dev' ? 'cliente dev' : `cliente v${version}`),
      connectionSsh: host => `SSH: ${host}`,
      connectionRemote: host => `Remoto: ${host}`,
      connectionCloud: host => `Nuvem: ${host}`,
      gateway: 'Gateway',
      backend: 'Servidor',
      messagingStopped: 'mensageria parada',
      gatewayReady: 'pronto',
      gatewayNeedsSetup: 'precisa configurar',
      gatewayUnavailable: 'inferência indisponível',
      gatewayChecking: 'verificando',
      gatewayConnecting: 'conectando',
      gatewayOffline: 'fora do ar',
      gatewayRestarting: 'reiniciando…',
      gatewayTitle: 'Gateway',
      showTerminal: 'Mostrar terminal',
      hideTerminal: 'Ocultar terminal',
      openCommandCenter: 'Abrir central de comandos',
      closeCommandCenter: 'Fechar central de comandos',
      customizeTitle: 'Mostrar na barra de status',
      hideStatusbar: 'Ocultar barra de status',
      resetStatusbar: 'Restaurar padrões',
      toggleApprovalMode: 'Aprovações',
      toggleBackendVersion: 'Versão do servidor',
      toggleCommandCenter: 'Central de comandos',
      toggleContextUsage: 'Medidor de contexto',
      toggleRunningTimer: 'Tempo do turno',
      toggleSessionTimer: 'Tempo da sessão',
      toggleTerminal: 'Terminal',
      toggleTokensPerSecond: 'Tokens por segundo',
      toggleVersion: 'Versão e atualizações',
      toggleWorkspace: 'Workspace',
      agents: 'Agentes',
      openAgents: 'Abrir agentes',
      closeAgents: 'Fechar agentes',
      failed: count => `${count} com falha`
    }
  },
  composer: {
    startVoice: 'Iniciar conversa por voz',
    openDirective: 'Abrir',
    queueMessage: 'Enfileirar mensagem',
    steer: 'Conduzir a execução atual',
    redirect: 'Redirecionar a execução atual',
    stop: 'Parar',
    send: 'Enviar',
    speaking: 'Falando',
    transcribing: 'Transcrevendo',
    thinking: 'Pensando',
    muted: 'Sem áudio',
    listening: 'Ouvindo',
    muteMic: 'Silenciar microfone',
    unmuteMic: 'Ativar microfone',
    stopListening: 'Parar de ouvir e enviar',
    stopShort: 'Parar',
    endConversation: 'Encerrar conversa por voz',
    endShort: 'Encerrar',
    stopDictation: 'Parar ditado',
    transcribingDictation: 'Transcrevendo ditado',
    voiceControls: 'Voz',
    voiceEngine: 'Motor de conversa por voz',
    commandDescs: {
      '/help': 'Mostrar os comandos de barra do desktop',
      '/clear': 'iniciar uma nova sessão',
      '/resume': 'Retomar uma sessão salva',
      '/details': 'controlar o nível de detalhe do transcrito',
      '/copy': 'copiar a seleção ou a última mensagem do assistente',
      '/quit': 'sair do B-3PO',
      '/start': 'Confirmar pings de início da plataforma sem responder',
      '/new': 'Iniciar uma nova conversa no desktop',
      '/topic': 'Ativar ou inspecionar sessões por tópico no Telegram',
      '/save': 'Salvar o transcrito atual em JSON',
      '/retry': 'Repetir a última mensagem (reenviar ao agente)',
      '/prompt': 'Compor o próximo prompt no $EDITOR (markdown) e enviar',
      '/undo': 'Voltar N turnos do usuário e repromptar (padrão 1)',
      '/title': 'Renomear a sessão atual',
      '/handoff': 'Entregar esta sessão a uma plataforma de mensagens',
      '/branch': 'Ramificar a última mensagem em uma nova conversa',
      '/worktree': 'Mostrar, listar, criar ou limpar worktrees git isolados',
      '/compress': 'Comprimir o contexto desta conversa',
      '/rollback': 'Listar ou restaurar checkpoints do sistema de arquivos (as restaurações mantêm suas edições; --all sobrescreve)',
      '/export': 'Exportar um perfil (configuração, skills, tema) em um arquivo compartilhável',
      '/import': 'Importar um arquivo de perfil compartilhado como novo perfil',
      '/stop': 'Parar o turno ativo e os processos em segundo plano',
      '/pause': 'Pausar trabalho novo globalmente (parada de emergência); \'/pause off\' retoma',
      '/bg': 'Rodar um prompt em uma sessão separada em segundo plano',
      '/btw': 'Fazer uma pergunta paralela sobre esta conversa sem interrompê-la',
      '/agents': 'Mostrar agentes ativos e tarefas em execução',
      '/journey': 'Abrir o grafo de memória — skills e memórias ao longo do tempo',
      '/queue': 'Enfileirar um prompt para o próximo turno, ou listar/editar/remover/mover/limpar a fila',
      '/steer': 'Injetar uma mensagem após a próxima chamada de ferramenta sem interromper',
      '/goal': 'Definir um objetivo permanente que o B-3PO persegue entre turnos até concluir',
      '/heartbeat': 'Definir um prompt recorrente que reentra nesta sessão quando ela fica ociosa',
      '/refine': 'Revisar esta conversa agora e salvar aprendizados em memória/skills',
      '/review': 'Criar um subagente independente para revisar o trabalho discutido (PR, código, docs)',
      '/loop': 'Repetir um prompt em um intervalo recorrente nesta sessão',
      '/plan': 'Escrever um plano de implementação em markdown em .hermes/plans/ sem executar nada',
      '/moa': 'Rodar um prompt pelo preset padrão de Mixture of Agents e depois restaurar seu modelo',
      '/subgoal': 'Adicionar ou gerenciar critérios extras no objetivo ativo',
      '/status': 'Mostrar o status da sessão atual',
      '/egress': 'Mostrar o status do proxy de saída do Docker',
      '/context': 'Ver a janela de contexto em detalhe: uso, categorias, compressão e vazão',
      '/whoami': 'Mostrar seu acesso aos comandos de barra (admin / usuário)',
      '/profile': 'Trocar o perfil ativo do B-3PO',
      '/codex-runtime': 'Alternar o runtime app-server do Codex para modelos OpenAI/Codex',
      '/personality': 'Definir uma personalidade predefinida',
      '/battery': 'Alternar um indicador de bateria com cores na barra de status',
      '/timestamps': 'Alternar horários [HH:MM] nas mensagens e no /history',
      '/diff': 'Mostrar as mudanças git no diretório de trabalho',
      '/focus': 'Alternar a visão focada — mostra só seu prompt e a resposta final',
      '/yolo': 'Alternar o YOLO — aprovar automaticamente comandos perigosos',
      '/approvals': 'Mostrar ou definir o modo permanente de aprovação de comandos perigosos',
      '/reasoning': 'Esforço de raciocínio ou exibição [<nível> [--global]|show|hide|full|clamp]',
      '/skin': 'Trocar o tema do desktop ou ir para o próximo',
      '/wake': 'Controlar o detector de palavra de ativação [on|off|status]',
      '/tools': 'Gerenciar ferramentas: /tools [list|disable|enable] [nome...]',
      '/memory': 'Revisar gravações de memória pendentes / alternar o portão de aprovação',
      '/bundles': 'Listar pacotes de skills (atalhos /<nome> para várias skills)',
      '/pet': 'Alternar ou adotar um mascote (/pet, /pet list, /pet boba)',
      '/hatch': 'Gerar um novo mascote (abre o gerador)',
      '/learn': 'Aprender uma skill reutilizável a partir do que você descrever (pastas, URLs, esta conversa, notas)',
      '/init': 'Gerar ou atualizar o AGENTS.md do projeto a partir de uma varredura do repositório',
      '/suggestions': 'Revisar automações sugeridas (aceitar/descartar)',
      '/blueprint': 'Montar uma automação a partir de um modelo de blueprint',
      '/browser': 'Gerenciar o navegador do agente [connect|disconnect|status]',
      '/palette': 'Abrir a paleta de comandos fuzzy (também Ctrl+P)',
      '/usage': 'Mostrar uso de tokens e limites; `reset` resgata um limite do Codex guardado',
      '/subscription': 'Ver seu plano e alterá-lo no navegador',
      '/topup': 'Ver seu saldo e gerenciar cobrança no portal',
      '/platform': 'Pausar, retomar ou listar uma plataforma do gateway com falha',
      '/version': 'Mostrar a versão do B-3PO',
      '/debug': 'Enviar relatório de depuração (info do sistema + logs) e obter links compartilháveis',
      '/model': 'Trocar o modelo desta sessão',
    },
    message: 'Mensagem',
    placeholderStarting: 'Iniciando o B-3PO...',
    placeholderReconnecting: 'Reconectando ao B-3PO…',
    placeholderFollowUp: 'Envie um complemento',
    newSessionPlaceholders: [
      'O que vamos construir?',
      'Dê uma tarefa ao B-3PO',
      'No que você está pensando?',
      'Descreva o que precisa',
      'O que vamos resolver?',
      'Pergunte qualquer coisa',
      'Comece com um objetivo'
    ],
    followUpPlaceholders: [
      'Envie um complemento',
      'Adicione mais contexto',
      'Refine o pedido',
      'E agora?',
      'Continue',
      'Vá mais fundo'
    ]
  },
  sidebar: {
    dateDivider: {
      today: 'Mais cedo hoje',
      yesterday: 'Ontem',
      thisWeek: 'Mais cedo esta semana',
      lastWeek: 'Semana passada',
      thisMonth: 'Mais cedo este mês'
    },
    statusDivider: {
      working: 'Trabalhando',
      done: 'Concluído'
    },
    markAllRead: 'Marcar tudo como lido',
    nav: {
      'new-session': 'Nova conversa',
      capabilities: 'Capacidades',
      messaging: 'Mensageria',
      crm: 'CRM',
      artifacts: 'Artefatos',
      cron: 'Tarefas agendadas'
    },
    searchAria: 'Pesquisar conversas',
    searchPlaceholder: 'Pesquisar conversas…',
    clearSearch: 'Limpar pesquisa',
    noMatch: query => `Nenhuma conversa corresponde a “${query}”.`,
    results: 'Resultados',
    pinned: 'Fixadas',
    sessions: 'Conversas',
    terminal: 'Terminal',
    files: 'Arquivos',
    review: 'Revisão',
    logs: 'Logs',
    cronJobs: 'Tarefas agendadas',
    groupAriaGrouped: 'Mostrar as conversas em uma única lista',
    groupAriaUngrouped: 'Agrupar conversas por workspace',
    showProjects: 'Mostrar projetos',
    showSessions: 'Mostrar conversas',
    groupTitleGrouped: 'Desagrupar conversas',
    groupTitleUngrouped: 'Agrupar por workspace',
    allPinned: 'Tudo aqui está fixado. Desafixe uma conversa para vê-la nas recentes.',
    shiftClickHint: 'Shift+clique em uma conversa para fixar',
    noWorkspace: 'Sem workspace',
    projectEmpty: 'Nenhuma conversa ainda',
    projectLoadFailed: 'Não foi possível carregar as conversas',
    noSessions: 'Nenhuma conversa ainda',
    noFilterMatches: 'Nenhuma conversa corresponde a estes filtros',
    loading: 'Carregando…',
    loadMore: 'Carregar mais',
    loadCount: step => `Carregar mais ${step}`,
    messageCount: count => `${count} ${count === 1 ? 'mensagem' : 'mensagens'}`,
    toolCallCount: count => `${count} ${count === 1 ? 'chamada de ferramenta' : 'chamadas de ferramenta'}`,
    projects: ptProjects,
    profileRail: 'Trilho de perfis',
    filter: {
      grouping: 'Agrupamento',
      ordering: 'Ordenação',
      show: 'Mostrar',
      filters: 'Filtros',
      status: 'Status',
      pullRequest: 'Pull request',
      profile: 'Perfil',
      project: 'Projeto',
      archived: 'Arquivadas',
      resetToDefaults: 'Restaurar padrões',
      expandAll: 'Expandir tudo',
      collapseAll: 'Recolher tudo',
      updated: 'Atualizado',
      created: 'Criado',
      tokens: 'Tokens',
      cost: 'Custo',
      needsInput: 'Precisa de você',
      working: 'Trabalhando',
      unread: 'Não lida',
      draft: 'Rascunho',
      idle: 'Ociosa',
      open: 'Aberto',
      merged: 'Mesclado',
      closed: 'Fechado',
      noPR: 'Sem PR'
    }
  },
  crmOverview: {
    contacts: 'Contatos',
    lateTasks: 'Tarefas atrasadas',
    openOpportunities: 'Oportunidades abertas',
    openTasks: 'Tarefas abertas',
    openValue: 'Valor em aberto',
    title: 'CRM em números',
    wonValue: 'Ganho'
  },
  settings: {
    providers: {
      connectAccount: 'Conectar uma conta',
      haveApiKey: 'Prefere usar uma chave de API?',
      intro:
        'Entre com uma assinatura — sem copiar chave de API. O B-3PO conduz o login no navegador por você, bem aqui.',
      connected: 'Conectado',
      collapse: 'Recolher',
      connectAnother: 'Conectar outro provedor',
      otherProviders: 'Outros provedores',
      disconnect: 'Desconectar',
      disconnectInTerminal: 'Desconectar (roda o comando de remoção no terminal)',
      removeConfirm: provider => `Remover ${provider}?`,
      removeExternalGeneric: provider => `${provider} é gerenciado pela CLI dele — remova por lá.`,
      removeKeyManaged: provider => `${provider} é configurado por chave de API. Remova em Chaves de API.`,
      removeTerminalConfirm: (provider, command) =>
        `Desconectar ${provider}? Isso roda "${command}" no terminal para limpar a credencial.`,
      removeTerminalRunning: provider => `Desconectando ${provider} no terminal…`,
      removedTitle: 'Conta removida',
      removedMessage: provider => `${provider} foi removido.`,
      failedRemove: provider => `Não foi possível remover ${provider}`,
      noProviderKeys: 'Nenhuma chave de API de provedor disponível.',
      searchKeys: 'Buscar provedores…',
      noKeysMatch: 'Nenhum provedor corresponde à busca.',
      localEndpoint: {
        title: 'Endpoint local / personalizado',
        description: 'Aponte o B-3PO para qualquer endpoint compatível com OpenAI (Zyphra, vLLM, llama.cpp, Ollama etc).'
      },
      loading: 'Carregando provedores...'
    },
    billing: {
      state: {
        notice: {
          loggedOut: {
            title: 'Conecte sua conta Nous',
            message: 'Entre com sua conta Nous para ver seu saldo, plano e uso aqui.',
            action: 'Entrar'
          }
        }
      }
    },
    pluginPages: {
      blurb:
        'Opções que os plugins instalados adicionam. Cada plugin ganha a própria página, e alguns adicionam sub-páginas dentro dela.'
    },
    profileScope: { appliesTo: 'Aplica-se a' },
    localModels: ptLocalModels,
    notifications: ptNotifications,
    about: { channel: ptUpdateChannel },
    memoryLayers: ptMemoryLayers,
    model: ptModelSettings,
    /**
     * Cópia dos campos de configuração. O inglês vem do `FIELD_LABELS`/`FIELD_DESCRIPTIONS` do módulo de
     * Configurações; aqui ficam as traduções que o painel realmente mostra. Cobre primeiro o painel Modelo —
     * as demais seções entram na mesma forma, uma por vez, sem deixar chave órfã.
     */
    fieldLabels: defineFieldCopy({
      model: 'Modelo padrão',
      toolsets: 'Conjuntos de ferramentas ativos',
      timezone: 'Fuso horário',
      fileReadMaxChars: 'Limite de leitura de arquivo',
      commandAllowlist: 'Lista de comandos permitidos',
      modelContextLength: 'Janela de contexto do modelo principal (substituir)',
      fallbackProviders: 'Modelos de fallback',
      display: {
        personality: 'Personalidade',
        showReasoning: 'Blocos de raciocínio'
      },
      desktop: {
        repoScanEnabled: 'Descoberta automática de repositórios',
        repoScanRoots: 'Pastas de descoberta de repositórios',
        repoScanExcludePaths: 'Pastas de repositório excluídas'
      },
      agent: {
        maxTurns: 'Máximo de passos do agente',
        imageInputMode: 'Anexos de imagem',
        apiMaxRetries: 'Tentativas de API',
        serviceTier: 'Camada de serviço',
        toolUseEnforcement: 'Obrigar uso de ferramentas'
      },
      terminal: {
        cwd: 'Diretório de trabalho',
        backend: 'Backend de execução',
        timeout: 'Tempo limite de comando',
        persistentShell: 'Shell persistente',
        envPassthrough: 'Repasse de variáveis de ambiente',
        dockerImage: 'Imagem Docker',
        singularityImage: 'Imagem Singularity',
        modalImage: 'Imagem Modal',
        daytonaImage: 'Imagem Daytona'
      },
      memory: {
        memoryEnabled: 'Memória persistente',
        userProfileEnabled: 'Perfil do usuário',
        memoryCharLimit: 'Orçamento da memória',
        userCharLimit: 'Orçamento do perfil',
        provider: 'Provedor de memória'
      },
      context: {
        engine: 'Motor de contexto'
      },
      compression: {
        enabled: 'Compactação automática',
        threshold: 'Limite de compactação',
        codexGpt55Autoraise: 'Aumento automático de compactação do Codex',
        targetRatio: 'Alvo da compactação',
        protectLastN: 'Mensagens recentes protegidas'
      },
      delegation: {
        model: 'Modelo dos subagentes',
        provider: 'Provedor dos subagentes',
        maxIterations: 'Limite de turnos do subagente',
        maxConcurrentChildren: 'Subagentes em paralelo',
        childTimeoutSeconds: 'Tempo limite do subagente',
        reasoningEffort: 'Esforço de raciocínio do subagente'
      },
      voice: {
        maxRecordingSeconds: 'Duração máxima da gravação',
        autoTts: 'Ler respostas em voz alta',
        voiceChatMode: 'Modo de conversa por voz',
        gptLive: {
          voice: 'Voz do GPT-Live',
          instructions: 'Persona do GPT-Live'
        }
      },
      approvals: {
        mode: 'Modo de aprovação',
        timeout: 'Tempo limite da aprovação',
        mcpReloadConfirm: 'Confirmar recarregamento de MCP'
      },
      security: {
        redactSecrets: 'Ocultar segredos',
        allowPrivateUrls: 'Permitir URLs privadas'
      },
      checkpoints: {
        enabled: 'Pontos de restauração',
        maxSnapshots: 'Limite de pontos de restauração'
      },
      toolOutput: {
        maxBytes: 'Limite de saída do terminal',
        maxLines: 'Limite de páginas de arquivo',
        maxLineLength: 'Limite de comprimento de linha'
      },
      codeExecution: {
        mode: 'Modo de execução de código'
      },
      browser: {
        allowPrivateUrls: 'URLs privadas no navegador',
        autoLocalForPrivateUrls: 'Navegador local para URLs privadas',
        useRealProfile: 'Usar meu perfil real do navegador'
      },
      stt: {
        enabled: 'Fala para texto',
        echoTranscripts: 'Repetir transcrições',
        provider: 'Provedor de fala para texto',
        streaming: 'Transcrição ao vivo',
        local: {
          model: 'Modelo local de transcrição',
          language: 'Idioma da transcrição'
        },
        openai: {
          model: 'Modelo STT da OpenAI',
          streamingModel: 'Modelo de transcrição ao vivo da OpenAI'
        },
        groq: { model: 'Modelo STT da Groq' },
        mistral: { model: 'Modelo STT da Mistral' },
        xai: { model: 'Modelo STT da xAI' },
        deepinfra: { model: 'Modelo STT da DeepInfra' },
        elevenlabs: {
          modelId: 'Modelo STT da ElevenLabs',
          languageCode: 'Idioma na ElevenLabs',
          tagAudioEvents: 'Marcar eventos de áudio',
          diarize: 'Separação de falantes'
        }
      },
      tts: {
        provider: 'Provedor de texto para fala',
        edge: { voice: 'Voz do Edge' },
        openai: {
          model: 'Modelo TTS da OpenAI',
          voice: 'Voz da OpenAI'
        },
        elevenlabs: {
          voiceId: 'Voz da ElevenLabs',
          modelId: 'Modelo da ElevenLabs'
        },
        xai: {
          voiceId: 'Voz da xAI (Grok)',
          language: 'Idioma na xAI',
          speed: 'Velocidade de reprodução na xAI',
          autoSpeechTags: 'Tags de fala automáticas na xAI',
          optimizeStreamingLatency: 'Otimização de latência de streaming na xAI',
          sampleRate: 'Taxa de amostragem na xAI',
          bitRate: 'Bitrate na xAI'
        },
        minimax: {
          model: 'Modelo TTS da MiniMax',
          voiceId: 'Voz da MiniMax'
        },
        mistral: {
          model: 'Modelo TTS da Mistral',
          voiceId: 'Voz da Mistral'
        },
        gemini: {
          model: 'Modelo TTS do Gemini',
          voice: 'Voz do Gemini'
        },
        neutts: {
          model: 'Modelo NeuTTS',
          device: 'Dispositivo do NeuTTS'
        },
        kittentts: {
          model: 'Modelo KittenTTS',
          voice: 'Voz do KittenTTS'
        },
        piper: { voice: 'Voz do Piper' },
        deepinfra: {
          model: 'Modelo TTS da DeepInfra',
          voice: 'Voz da DeepInfra'
        }
      },
      auxiliary: {
        compression: {
          timeout: 'Tempo limite do modelo de compactação (s)'
        }
      },
      updates: {
        nonInteractiveLocalChanges: 'Alterações locais em atualizações pelo app'
      }

    }),
    fieldDescriptions: defineFieldCopy({
      model: 'Usado em conversas novas, a menos que você escolha outro modelo no compositor.',
      timezone: 'Identificador de fuso IANA. Em branco usa o fuso do sistema.',
      fileReadMaxChars: 'Máximo de caracteres que o B-3PO pode ler de um arquivo por pedido.',
      modelContextLength:
        'Substitui a janela de contexto detectada do modelo PRINCIPAL do chat (em tokens). Deixe 0 para usar o valor detectado do modelo escolhido. Não afeta modelos auxiliares/MoA.',
      fallbackProviders: 'Entradas provedor:modelo de reserva, tentadas quando o modelo padrão falha.',
      display: {
        personality: 'Estilo padrão do assistente em sessões novas.',
        showReasoning: 'Mostra as seções de raciocínio quando o backend as fornece.'
      },

      desktop: {
        repoScanEnabled: 'Varre pastas locais em busca de repositórios Git para mostrar em Projetos.',
        repoScanRoots: 'Pastas a varrer. Vazio = varre o diretório pessoal.',
        repoScanExcludePaths: 'Pastas e seus descendentes ignorados na descoberta de repositórios.'
      },
      agent: {
        imageInputMode: 'Controla como os anexos de imagem são enviados ao modelo.',
        maxTurns: 'Limite de turnos com ferramentas antes de o B-3PO parar uma execução.'
      },
      terminal: {
        cwd: 'Pasta padrão de projetos para ferramentas e terminal.',
        persistentShell:
          'Backend SSH: mantém as variáveis exportadas entre comandos. Desligado, cada comando começa do ambiente de login; o diretório de trabalho sempre continua.',
        envPassthrough: 'Variáveis de ambiente repassadas para a execução das ferramentas.',
        dockerImage: 'Imagem do contêiner usada quando o backend é Docker.',
        singularityImage: 'Imagem usada quando o backend é Singularity.',
        modalImage: 'Imagem usada quando o backend é Modal.',
        daytonaImage: 'Imagem usada quando o backend é Daytona.'
      },
      memory: {
        memoryEnabled: 'Guarda memórias duráveis que ajudam conversas futuras.',
        userProfileEnabled: 'Mantém um perfil compacto das preferências do usuário.',
      },
      context: {
        engine: 'Estratégia para lidar com conversas longas perto do limite de contexto.'
      },
      compression: {
        enabled: 'Resume o contexto mais antigo quando as conversas crescem.',
        codexGpt55Autoraise: 'Sobe a compactação para 85% nos modelos ChatGPT Codex OAuth suportados.'
      },
      voice: {
        autoTts: 'Fala automaticamente as respostas do assistente.',
        voiceChatMode:
          'encadeado: fala para texto → B-3PO → texto para fala com os provedores abaixo. gpt-live: um modelo de voz full-duplex da OpenAI (gpt-live-1) escuta e fala, e repassa cada pedido real ao B-3PO — qualquer modelo escolhido responde com o conjunto completo de ferramentas. Exige uma chave de API da OpenAI; a camada de voz cobra US$ 0,05 por minuto.',
        gptLive: {
          voice: 'Voz do modo GPT-Live. IDs de voz personalizados são aceitos.',
          instructions:
            'Frases extras para a persona da voz ao vivo (tom, ritmo, idioma). O B-3PO mantém o próprio prompt de sistema.'
        }
      },
      approvals: {
        mode: 'Como o B-3PO trata comandos que exigem aprovação explícita.',
        timeout: 'Quanto tempo os pedidos de aprovação esperam antes de expirar.'
      },
      security: {
        redactSecrets: 'Esconde segredos detectados do conteúdo visível ao modelo quando possível.'
      },
      checkpoints: {
        enabled: 'Cria pontos de restauração antes de editar arquivos.'
      },
      codeExecution: {
        mode: 'Quão estritamente a execução de código fica restrita ao projeto atual.'
      },
      browser: {
        useRealProfile:
          'A navegação local usa seus logins reais. O B-3PO copia o perfil do navegador padrão (cookies, logins, preferências) para um instantâneo gerenciado e o controla com o Chromium empacotado — seu perfil em uso nunca é aberto direto, e a cópia é atualizada a cada execução. Também deixa o agente abrir uma sessão local com o perfil real quando pedido, mesmo com um backend de navegador na nuvem configurado. Só navegadores Chromium (Chrome, Edge, Brave, Brave Origin, Chromium) são suportados; um padrão não-Chromium falha com mensagem clara. Desligado por padrão.'
      },
      auxiliary: {
        compression: {
          timeout: 'Segundos de espera pelo modelo auxiliar de compactação por chamada (padrão 120). Aumente para modelos locais lentos.'
        }
      },
      tts: {
        xai: {
          voiceId: 'ID de voz da xAI (ex.: eve) ou um ID de voz personalizado.',
          language: 'Código do idioma falado (ex.: en, pt-BR) ou "auto" para detecção automática.',
          speed: 'Velocidade de reprodução. 0,7 = mais lento, 1,0 = normal, 1,5 = mais rápido.',
          autoSpeechTags: 'Deixa um LLM inserir tags expressivas de áudio ([laughing], [sighs]) no roteiro antes da síntese.',
          optimizeStreamingLatency: 'Troca entre latência e qualidade. 0 = melhor qualidade, 2 = menor latência.',
          sampleRate: 'Taxa de amostragem do áudio em Hz. Mais alta = melhor qualidade e arquivos maiores.',
          bitRate: 'Bitrate do MP3 em bps. Só vale quando o codec é mp3.'
        },
        neutts: {
          device: 'Dispositivo de inferência local do NeuTTS.'
        }
      },
      stt: {
        enabled: 'Liga a transcrição de fala local ou via provedor.',
        echoTranscripts: 'Posta no chat a transcrição 🎙️ crua das mensagens de voz.',
        streaming: 'Mostra o texto enquanto você fala (OpenAI, xAI, ElevenLabs). Cai para a gravação se algo falhar.',
        elevenlabs: {
          languageCode: 'Código de idioma ISO-639-3 opcional. Em branco deixa a ElevenLabs detectar.'
        }
      }

    }),
    crmPipeline: {
      contactRemoved: 'contato excluído',
      stageInitial: 'Estágio inicial',
      lostReason: 'Por que foi perdida?',
      stages: {
        novo: 'Novo lead',
        contato: 'Contato iniciado',
        qualificacao: 'Qualificação',
        proposta: 'Proposta',
        negociacao: 'Negociação',
        ganho: 'Ganho',
        perdido: 'Perdido',
      },
      filterAllStages: 'Todas as etapas',
      filterClear: 'limpar',
      filterPlaceholder: 'Buscar por oportunidade ou contato…',
      filterReset: 'Limpar filtro',
      filterResult: (shown: number, total: number) => `${shown} de ${total}`,
      filterStageAria: 'Filtrar por etapa',
      filterStage: 'Etapa',
      title: 'Funil de vendas',
      intro: 'Números reais das oportunidades registradas aqui.',
      empty: 'Nenhuma oportunidade ainda.',
      open: 'Em aberto',
      won: 'Ganho',
      opportunity: 'Oportunidade',
      value: 'Valor (centavos)',
      columnEmpty: 'Nada aqui ainda',
      contact: 'Contato',
      add: 'Adicionar oportunidade',
      remove: 'Remover',
      stage: 'Estágio',
      unavailable: 'Este cliente não tem disco local para o funil.',
    },
    crmConversations: {
      tags: 'Etiquetas',
      tagsPlaceholder: 'vip, orcamento, retorno',
      indicatorsTitle: 'Visao rapida',
      newConversations: 'Novas em 7 dias',
      waitingReply: 'Aguardando resposta',
      responseTime: 'Tempo de resposta',
      notePlaceholder: 'Nota interna (nunca vai para o cliente)',
      notes: 'Notas internas',
      saveNote: 'Salvar nota',
      filter: { aguardando: 'Aguardando', abertas: 'Abertas', todas: 'Todas' },
      noResults: 'Nada encontrado nesta busca.',
      search: 'Buscar conversas…',
      empty: 'Nenhuma conversa ainda. Quando o WhatsApp oficial estiver conectado, as mensagens aparecem aqui.',
      loading: 'Carregando conversas…',
      naoLidasLabel: 'nao lidas',
      markRead: 'Marcar como lida',
      resolve: 'Marcar como resolvida',
      noMessages: 'Sem mensagens ainda.',
      pickOne: 'Escolha uma conversa para ler.',
      status: {
        aberta: 'Aberta',
        aguardando: 'Aguardando',
        resolvida: 'Resolvida',
      },
      subtitle: 'Mensagens recebidas e enviadas, ligadas ao contato do CRM.',
      title: 'Conversas',
      unavailable: 'As conversas precisam do aplicativo desktop para funcionar.',
    },
    products: {
      cancel: 'Cancelar',
      category: 'Categoria',
      count: (n: number) => (n === 1 ? '1 produto' : `${n} produtos`),
      cost: 'Custo',
      duplicateSku: 'Já existe um produto com este SKU.',
      edit: 'Editar',
      empty: 'Nenhum produto cadastrado ainda.',
      hint: 'Os produtos ficam neste computador. Estoque, vendas e financeiro leem daqui.',
      invalidCost: 'Custo inválido.',
      invalidName: 'Informe o nome do produto.',
      invalidPrice: 'Preço inválido.',
      invalidSku: 'Informe o SKU.',
      loadFailed: 'Não foi possível carregar os produtos.',
      name: 'Nome',
      noMatch: 'Nenhum produto corresponde à busca.',
      price: 'Preço',
      remove: 'Remover',
      save: 'Adicionar produto',
      saveEdit: 'Salvar alterações',
      search: 'Buscar por nome, SKU ou código de barras',
      sku: 'SKU',
      stock: 'Unidade',
      title: 'Produtos',
      unit: 'Unidade',
      units: {
        cx: 'caixa',
        g: 'g',
        kg: 'kg',
        l: 'L',
        m: 'm',
        m2: 'm²',
        m3: 'm³',
        ml: 'mL',
        pct: 'pacote',
        un: 'unidade'
      },
      unavailable: 'Produtos precisam do aplicativo desktop para funcionar.'
    },
    agenda: {
      book: 'Agendar',
      cancel: 'Cancelar',
      confirm: 'Confirmar',
      conflict: 'Horário já ocupado:',
      date: 'Data',
      duration: 'Duração (min)',
      empty: 'Nenhum compromisso ainda.',
      hint: 'O conflito é conferido pelo backend, contra todos os compromissos do mesmo recurso.',
      invalidPeriod: 'Informe data e hora válidas.',
      loadFailed: 'Não foi possível carregar a agenda.',
      resource: 'Recurso',
      resourceHint: 'cadeira-1, sala-2, dra-ana…',
      catalogUnavailable: 'Os serviços precisam do aplicativo desktop para funcionar.',
      serviceNotFound: 'Serviço não encontrado no catálogo.',
      servicePlaceholder: 'Selecione um serviço',
      serviceRequired: 'Selecione um serviço.',
      resourceRequired: 'Diga qual recurso vai ficar ocupado.',
      service: 'Serviço',
      status: 'Situação',
      statuses: { cancelado: 'cancelado', concluido: 'concluído', confirmado: 'confirmado', faltou: 'faltou', marcado: 'marcado' },
      time: 'Hora',
      title: 'Agenda',
      today: 'Hoje',
      unavailable: 'A agenda precisa do aplicativo desktop para funcionar.'
    },
    compras: {
      bestOffer: 'Melhor oferta',
      compare: 'Comparar fornecedores',
      addItem: 'Adicionar item',
      addSupplier: 'Cadastrar fornecedor',
      alreadyReceived: 'Pedido recebido é definitivo.',
      cnpj: 'CNPJ',
      duplicateSupplier: 'Já existe um fornecedor com este nome.',
      empty: 'Nenhum pedido de compra ainda.',
      hint: 'Receber um pedido coloca a mercadoria no estoque.',
      invalidQuantity: 'Informe uma quantidade.',
      items: 'Itens',
      itemsRequired: 'Adicione pelo menos um item.',
      loadFailed: 'Não foi possível carregar as compras.',
      number: 'Nº',
      pickProduct: 'Selecione um produto',
      pickSupplier: 'Selecione um fornecedor',
      product: 'Produto',
      quantity: 'Quantidade',
      receive: 'Receber pedido',
      removeItem: 'Remover',
      saveOrder: 'Salvar pedido',
      needQuantity: 'Informe a quantidade do pedido para comparar.',
      noValidOffer: 'Nenhuma proposta atende a quantidade pedida.',
      orderQuantity: 'Quantidade a comprar',
      prazo: 'Prazo (dias)',
      status: 'Situação',
      statuses: { cancelado: 'cancelado', pedido: 'pedido', recebido: 'recebido', rascunho: 'rascunho' },
      supplier: 'Fornecedor',
      supplierName: 'Nome do fornecedor',
      supplierNameRequired: 'Informe o nome do fornecedor.',
      supplierRequired: 'Selecione um fornecedor.',
      title: 'Compras',
      total: 'Total',
      unitCost: 'Custo unitário',
      unavailable: 'As compras precisam do aplicativo desktop para funcionar.'
    },
    automacoes: {
      actorNote: 'A regra roda como o proprietário. Para mudar isso, use a tela de Agentes.',
      create: 'Criar regra',
      disable: 'Desativar',
      empty: 'Nenhuma automação ainda.',
      enable: 'Ativar',
      errAction: 'Escolha uma ação.',
      errActor: 'A regra precisa de um responsável.',
      errDuplicate: 'Já existe uma regra com esse nome.',
      errNotFound: 'Regra não encontrada.',
      errState: 'Estado inválido.',
      errTrigger: 'Escolha um gatilho válido.',
      hint: 'Uma regra reage a um evento da empresa e age pelas mesmas ferramentas que os agentes usam.',
      inactive: 'inativa',
      loadFailed: 'Não foi possível carregar as automações.',
      name: 'Nome',
      nameRequired: 'Informe o nome.',
      noActions: 'Nenhuma ação executável disponível.',
      then: 'Então',
      title: 'Automações',
      unavailable: 'As automações precisam do aplicativo desktop para funcionar.',
      when: 'Quando'
    },
    painel: {
      activeCampaigns: 'campanhas ativas',
      balance: 'saldo previsto',
      hint: 'Uma leitura de todos os domínios. Cada número vem do dono dele; nada é somado aqui.',
      invoiced: 'vendas faturadas',
      lateTickets: 'atendimentos atrasados',
      loadFailed: 'Não foi possível carregar o painel.',
      money: 'Dinheiro',
      noAfterSales: 'vendas faturadas sem acompanhamento',
      noAlerts: 'Nada fora do lugar no momento.',
      openTickets: 'atendimentos abertos',
      operation: 'Operação',
      outOfStock: 'produtos sem estoque',
      payable: 'a pagar',
      receivable: 'a receber',
      revenue: 'total faturado',
      satisfaction: 'satisfação',
      staleCampaigns: 'campanhas agendadas vencidas',
      invoicedOne: 'venda faturada',
      noAfterSalesOne: 'venda faturada sem acompanhamento',
      outOfStockOne: 'produto sem estoque',
      staleCampaignsOne: 'campanha agendada vencida',
      title: 'Painel',
      unavailable: 'O painel precisa do aplicativo desktop para funcionar.'
    },
    marketing: {
      active: 'campanhas ativas',
      approve: 'Aprovar',
      approved: 'aprovado',
      campaigns: 'Campanhas',
      contentPlaceholder: 'Conteúdo da publicação',
      contentRequired: 'Escreva o conteúdo.',
      create: 'Criar',
      draft: 'rascunho',
      editorial: 'Calendário editorial',
      errCampaignMissing: 'Essa campanha não existe.',
      errChannel: 'Escolha um canal válido.',
      errContent: 'Escreva o conteúdo.',
      errDateRequired: 'Aprovar exige uma data agendada.',
      errEndBeforeStart: 'O fim não pode ser anterior ao início.',
      errName: 'Informe o nome.',
      errStart: 'A data de início é obrigatória.',
      errStatus: 'Status inválido.',
      hint: 'Campanha carrega o dinheiro e a métrica; conteúdo carrega o calendário. Nada é publicado daqui.',
      leads: 'leads',
      loadFailed: 'Não foi possível carregar o marketing.',
      namePlaceholder: 'Nome da campanha',
      nameRequired: 'Informe o nome.',
      noCampaigns: 'Nenhuma campanha ainda.',
      noPosts: 'Nenhum conteúdo ainda.',
      noPublishNote: 'Aprovar aqui não publica. Publicar exige a API real de cada canal.',
      overBudget: 'estourou o orçamento',
      spend: 'gasto',
      staleScheduled: 'agendadas vencidas',
      staleScheduledHint: 'Estas campanhas foram agendadas, a data de início passou e ninguém as ativou.',
      title: 'Marketing',
      unavailable: 'O marketing precisa do aplicativo desktop para funcionar.'
    },
    posvenda: {
      done: 'Concluir',
      empty: 'Nenhum acompanhamento pendente.',
      hint: 'O acompanhamento é criado quando a venda é faturada. O número que importa é o de vendas faturadas sem nenhum.',
      loadFailed: 'Não foi possível carregar os acompanhamentos.',
      noFollowUpOne: 'venda faturada sem acompanhamento',
      noFollowUp: 'vendas faturadas sem acompanhamento',
      noFollowUpHint: 'Estas vendas foram faturadas e nada foi agendado depois delas — elas não voltam sozinhas.',
      overdue: 'atrasados',
      overdueTag: 'atrasado',
      pending: 'pendentes',
      title: 'Pós-venda',
      unavailable: 'O pós-venda precisa do aplicativo desktop para funcionar.'
    },
    agentes: {
      aboveOwnLevel: 'Você não pode conceder um nível acima do seu.',
      add: 'Criar agente',
      bot: 'agente',
      botAsOwner: 'Um agente não pode ser dono.',
      botCannotGrant: 'Um agente não pode conceder permissão.',
      deactivate: 'Desativar',
      empty: 'Nenhum agente ainda.',
      hint: 'Um agente opera os mesmos dados que as telas. O escopo limita quais domínios ele alcança.',
      human: 'pessoa',
      humanOnly: 'Isto é uma decisão sobre pessoas e exige humano.',
      inactive: 'inativo',
      insufficientLevel: 'Seu nível não permite isto.',
      lastOwner: 'O último dono ativo não pode ser desativado.',
      level: 'Nível',
      loadFailed: 'Não foi possível carregar os atores.',
      mcpNote: 'O agente recebe a credencial de MCP na próxima abertura do aplicativo.',
      name: 'Nome',
      nameRequired: 'Informe o nome.',
      noScopeWarning: 'Sem escopo o agente não enxerga ferramenta nenhuma.',
      scopes: 'Domínios que ele pode operar',
      title: 'Agentes',
      unavailable: 'A administração de agentes precisa do aplicativo desktop para funcionar.',
      youAre: 'Você é'
    },
    atendimento: {
      close: 'Fechar',
      closeRequiresResolved: 'Resolva o ticket antes de fechá-lo.',
      empty: 'Nenhum ticket ainda.',
      hint: 'Atraso e satisfação baixa aparecem aqui, não escondidos num relatório.',
      invalidRating: 'A nota vai de 1 a 5.',
      loadFailed: 'Não foi possível carregar o atendimento.',
      notFound: 'Ticket não encontrado.',
      noRatings: 'sem avaliações',
      open: 'Abrir ticket',
      openCount: 'Abertos',
      overdue: 'atrasado',
      overdueBadge: 'atrasado',
      overdueCount: 'Atrasados',
      phone: 'Telefone',
      priority: 'Prioridade',
      rate: 'Avaliar',
      rateRequiresResolved: 'Resolva o ticket antes de avaliá-lo.',
      remaining: 'restantes',
      resolve: 'Resolver',
      reviewBadge: 'precisa revisão',
      satisfaction: 'Satisfação',
      start: 'Iniciar',
      subject: 'Assunto',
      subjectRequired: 'Informe o assunto.',
      title: 'Atendimento',
      unavailable: 'O atendimento precisa do aplicativo desktop para funcionar.'
    },
    rh: {
      addDepartment: 'Adicionar departamento',
      addEmployee: 'Cadastrar colaborador',
      approvalNeeded: 'Isto exige aprovação humana',
      decisionAboutPerson: 'uma decisão sobre uma pessoa',
      department: 'Departamento',
      departmentName: 'Nome do departamento',
      departmentRequired: 'Selecione um departamento existente.',
      empty: 'Nenhum colaborador cadastrado ainda.',
      forbiddenReason: 'motivo não permitido',
      hideSalary: 'Ocultar salário',
      hint: 'O salário não é carregado por padrão. Desligamentos e mudanças de salário exigem aprovação.',
      jobTitle: 'Cargo',
      loadFailed: 'Não foi possível carregar o RH.',
      name: 'Nome',
      nameRequired: 'Informe o nome.',
      pickDepartment: 'Selecione um departamento',
      salaryHidden: 'O salário fica oculto até você pedir para ver.',
      showSalary: 'Mostrar salário',
      status: 'Situação',
      title: 'Pessoas',
      unavailable: 'O RH precisa do aplicativo desktop para funcionar.',
      unknownOperation: 'operação desconhecida'
    },
    servicos: {
      add: 'Cadastrar serviço',
      duration: 'Duração (minutos)',
      durationRequired: 'Informe uma duração maior que zero.',
      duplicate: 'Já existe um serviço com este nome.',
      empty: 'Nenhum serviço cadastrado ainda.',
      free: 'cortesia',
      hint: 'Duração e preço daqui são os que a agenda usa.',
      loadFailed: 'Não foi possível carregar os serviços.',
      name: 'Nome',
      nameRequired: 'Informe o nome.',
      notFound: 'Serviço não encontrado.',
      price: 'Preço',
      remove: 'Remover',
      title: 'Serviços',
      unavailable: 'Os serviços precisam do aplicativo desktop para funcionar.'
    },
    empresa: {
      addBranch: 'Adicionar filial',
      addCompany: 'Cadastrar empresa',
      searchCnpj: 'Buscar dados',
      searching: 'Buscando…',
      address: 'Endereço',
      branchLabel: 'Filial',
      branchName: 'Nome da filial',
      cnpj: 'CNPJ',
      company: 'Empresa',
      companyRequired: 'Selecione uma empresa.',
      duplicateCnpj: 'Já existe uma empresa com este CNPJ.',
      empty: 'Nenhuma empresa cadastrada ainda.',
      hint: 'A empresa é o tenant. Cada uma mantém os próprios dados.',
      loadFailed: 'Não foi possível carregar as empresas.',
      migrationNote: 'Cadastrar empresa ainda não move os dados existentes para ela — essa migração é um passo separado, com backup.',
      name: 'Nome',
      nameRequired: 'Informe o nome.',
      noBranches: 'Nenhuma filial ainda.',
      pickCompany: 'Selecione uma empresa',
      title: 'Empresa',
      tradeName: 'Nome fantasia',
      unavailable: 'As empresas precisam do aplicativo desktop para funcionar.'
    },
    finance: {
      add: 'Lançar',
      alreadyPaid: 'Este lançamento já está liquidado.',
      amount: 'Valor',
      description: 'Descrição',
      due: 'Vencimento',
      duplicateRef: 'Este lançamento já foi registrado.',
      empty: 'Nenhum lançamento registrado ainda.',
      hint: 'Os totais vêm dos lançamentos. Lançamento liquidado é definitivo.',
      invalidAmount: 'Informe um valor.',
      invalidDue: 'Informe o vencimento.',
      kind: 'Tipo',
      kinds: { pagar: 'A pagar', receber: 'A receber' },
      loadFailed: 'Não foi possível carregar o financeiro.',
      openPayable: 'A pagar em aberto',
      openReceivable: 'A receber em aberto',
      overdue: 'Vencido',
      paidPayable: 'Pago',
      paidReceivable: 'Recebido',
      settle: 'Liquidar',
      status: 'Situação',
      statuses: { aberto: 'aberto', cancelado: 'cancelado', pago: 'liquidado' },
      title: 'Financeiro',
      unavailable: 'O financeiro precisa do aplicativo desktop para funcionar.'
    },
    sales: {
      paymentMethod: 'Forma de pagamento',
      paymentNone: 'Não informada',
      cancelInvoice: 'Cancelar nota',
      emitting: 'Emitindo…',
      emitInvoice: 'Emitir nota',
      printInvoice: 'Imprimir nota',
      addItem: 'Adicionar item',
      alreadyIssued: 'Uma venda faturada não pode ser alterada.',
      cancel: 'Cancelar',
      empty: 'Nenhuma venda registrada ainda.',
      estimate: 'Estimativa',
      hint: 'Faturar dá baixa no estoque e lança a conta a receber.',
      insufficientStock: 'Estoque insuficiente',
      invalidQuantity: 'Informe uma quantidade.',
      issue: 'Faturar venda',
      items: 'Itens',
      itemsRequired: 'Adicione pelo menos um item.',
      loadFailed: 'Não foi possível carregar as vendas.',
      number: 'Nº',
      pickProduct: 'Selecione um produto',
      product: 'Produto',
      quantity: 'Quantidade',
      removeItem: 'Remover',
      saveDraft: 'Salvar como orçamento',
      status: 'Situação',
      statuses: { cancelado: 'cancelada', faturado: 'faturada', orcamento: 'orçamento', pedido: 'pedido' },
      title: 'Vendas',
      total: 'Total',
      unitPrice: 'Preço unitário',
      unavailable: 'As vendas precisam do aplicativo desktop para funcionar.'
    },
    stock: {
      balance: 'Saldo',
      count: (n: number) => (n === 1 ? '1 produto' : `${n} produtos`),
      duplicateRef: 'Esta movimentação já foi registrada.',
      hint: 'O saldo vem das movimentações. Para corrigir um erro, lance a movimentação inversa.',
      insufficientBalance: 'Não há saldo suficiente para esta saída.',
      invalidNegative: 'Entrada e saída têm quantidade positiva.',
      invalidQuantity: 'Informe uma quantidade.',
      kind: 'Movimento',
      kinds: { ajuste: 'Ajuste', entrada: 'Entrada', saida: 'Saída' },
      loadFailed: 'Não foi possível carregar o estoque.',
      low: 'baixo',
      name: 'Nome',
      noMatch: 'Nenhum produto corresponde à busca.',
      noMovements: 'Nenhuma movimentação registrada ainda.',
      noProducts: 'Cadastre um produto antes — o estoque precisa do catálogo.',
      pickProduct: 'Selecione um produto',
      product: 'Produto',
      quantity: 'Quantidade',
      reason: 'Motivo (obrigatório no ajuste)',
      reasonRequired: 'Um ajuste precisa de motivo.',
      recent: 'Movimentações recentes',
      register: 'Registrar movimentação',
      search: 'Buscar por nome ou SKU',
      sku: 'SKU',
      title: 'Estoque',
      unitsOf: { cx: 'caixa', g: 'g', kg: 'kg', l: 'L', m: 'm', m2: 'm²', m3: 'm³', ml: 'mL', pct: 'pacote', un: 'unidade' },
      unavailable: 'O estoque precisa do aplicativo desktop para funcionar.'
    },
    crmTasks: {
      showDone: (count: number) => `Mostrar ${count} concluíd` + (count === 1 ? 'a' : 'as'),
      hideDone: 'Ocultar concluídas',
      contactRemoved: 'contato excluído',
      add: 'Adicionar tarefa',
      contactLabel: 'Contato (opcional)',
      due: when => `vence ${when}`,
      dueLabel: 'Prazo',
      empty: 'Nenhuma tarefa aberta. Crie a primeira abaixo.',
      late: when => `atrasada · ${when}`,
      loading: 'Carregando tarefas…',
      markDone: 'Marcar como concluída',
      markOpen: 'Reabrir tarefa',
      noContact: 'Sem contato',
      noDue: 'sem prazo',
      priorities: { alta: 'Alta', baixa: 'Baixa', media: 'Média' },
      priorityLabel: 'Prioridade',
      remove: 'Remover',
      saving: 'Salvando…',
      subtitle: 'Os acompanhamentos que não cabem em uma conversa. Ficam neste computador.',
      summary: open => (open === 1 ? '1 tarefa aberta' : `${open} tarefas abertas`),
      // A palavra do plural fica FORA do template de proposito: o teste de cobertura compara os nomes
      // interpolados com os do ingles, e repetir `${late}` dentro do ternario mudava essa lista.
      summaryLate: (open, late) => `${open} ` + (open === 1 ? 'aberta' : 'abertas') + ` · ${late} ` + (late === 1 ? 'atrasada' : 'atrasadas'),
      title: 'Tarefas do CRM',
      titleLabel: 'Tarefa',
      titlePlaceholder: 'Ligar para a Maria sobre a proposta',
      unavailable: 'As tarefas precisam do aplicativo desktop para serem guardadas.'
    },
    crmContacts: {
      export: 'Exportar CSV',
      openCrm: 'Abrir a página do CRM',
      title: 'Contatos do CRM',
      intro: 'Com quem seus bots falam. Os contatos ficam neste computador; nada é enviado a terceiros.',
      empty: 'Nenhum contato ainda. Cadastre o primeiro abaixo.',
      unavailable: 'Este cliente não tem disco local para guardar contatos.',
      name: 'Nome',
      phone: 'Telefone',
      company: 'Empresa',
      add: 'Adicionar contato',
      remove: 'Remover',
    },
    gateway: {
      ...ptGatewayHost,
      pairedDevicesTitle: 'Dispositivos pareados',
      pairedDevicesIntro:
        'Celulares que podem falar com os bots deste computador. Cada um tem a própria chave; revogar corta o acesso de vez.',
      pairedDevicesEmpty: 'Nenhum celular pareado ainda. Abra o link de pareamento no aparelho para adicionar.',
      pairedDevicesError: 'Não foi possível ler os dispositivos pareados.',
      pairedDevicesRefresh: 'Atualizar',
      pairedDevicesRevoke: 'Revogar',
      pairedDevicesRevoked: 'revogado',
      pairedDevicesCreated: 'adicionado',
      pairedDevicesLastSeen: 'último uso',
      pairedDevicesTickets: 'tickets'
    },
    sections: {
      model: 'Modelo',
      chat: 'Conversa',
      appearance: 'Aparência',
      workspace: 'Workspace',
      safety: 'Segurança',
      memory: 'Memória e contexto',
      voice: 'Voz',
      advanced: 'Avançado'
    },
    closeSettings: 'Fechar configurações',
    exportConfig: 'Exportar configuração',
    importConfig: 'Importar configuração',
    resetToDefaults: 'Restaurar padrões',
    resetConfirm: 'Restaurar todas as configurações para os padrões do B-3PO?',
    exportFailed: 'Falha ao exportar',
    resetFailed: 'Falha ao restaurar',
    appearance: {
      title: 'Aparência',
      intro: 'Somente desktop. Modo é o brilho; tema é a paleta e a moldura da conversa.',
      colorMode: 'Modo de cor',
      colorModeDesc: 'Escolha um modo fixo ou deixe o B-3PO seguir a configuração do sistema.',
      chatTextScaleTitle: 'Tamanho do texto da conversa',
      chatTextScaleDesc:
        'Escala o texto da conversa e o editor de mensagem em relação à Escala da interface. Barras laterais e controles continuam do mesmo tamanho.',
      toolViewTitle: 'Exibição das chamadas de ferramenta',
      toolViewDesc: 'Produto esconde os dados brutos da ferramenta; Técnico mostra entrada/saída completas.',
      product: 'Produto',
      productDesc: 'Atividade de ferramenta amigável, com resumos curtos.',
      technical: 'Técnico',
      technicalDesc: 'Inclui argumentos/resultados brutos e detalhes de baixo nível.',
      hideCodeDiffsTitle: 'Esconder diffs de código',
      hideCodeDiffsDesc:
        'Mostra edições de arquivo como linhas de ferramenta, com a contagem de linhas adicionadas/removidas, sem o código.',
      hideThreadTimelineTitle: 'Esconder as barras da linha do tempo',
      hideThreadTimelineDesc: 'Esconde as barras de navegação na borda direita de cada conversa.',
      reasoningCollapsedTitle: 'Recolher o raciocínio por padrão',
      reasoningCollapsedDesc: 'Mantém o raciocínio disponível sem expandi-lo até você abrir.',
      uiScaleTitle: 'Escala da interface',
      uiScaleDesc: (percent: number) =>
        `Escala texto e controles no app inteiro. Cmd/Ctrl com +, - e 0 também funciona. Atual: ${percent}%.`,
      sessionDensityTitle: 'Densidade da lista de conversas',
      sessionDensityDesc: 'Escolha quanto contexto aparece abaixo dos títulos na barra lateral.',
      sessionDensityCompact: 'Compacta',
      sessionDensityComfortable: 'Confortável',
      sessionDensityDetailed: 'Detalhada',
      tabStripTitle: 'Faixa de abas',
      tabStripDesc:
        'Mostra abas acima de uma zona. Automático as esconde quando há um só painel, a menos que outra conversa esteja aberta.',
      tabStripAuto: 'Automático',
      tabStripAlways: 'Sempre',
      tabStripNever: 'Nunca',
      appActionsTitle: 'Ações do app',
      appActionsDesc:
        'Onde Configurações, Layout e HUD ficam na barra de título. À direita deixa espaço para abas à esquerda.',
      appActionsLeft: 'Esquerda',
      appActionsRight: 'Direita',
      terminalFontTitle: 'Fonte do terminal',
      terminalFontDesc:
        'Escolha uma fonte instalada para os terminais do desktop. Nerd Fonts renderizam Powerlevel10k e ícones de shell; deixe em branco para usar a JetBrains Mono inclusa.',
      terminalFontPlaceholder: 'MesloLGS NF ou uma pilha de fontes CSS',
      terminalFontPreview: 'Prévia dos glifos',
      terminalFontReset: 'Usar padrão',
      chatFontTitle: 'Fonte da conversa',
      chatFontDesc:
        'Escolha uma fonte instalada para a conversa e o resto do app. Útil para fontes de leitura como OpenDyslexic; deixe em branco para usar a fonte do tema.',
      chatFontPlaceholder: 'OpenDyslexic ou uma pilha de fontes CSS',
      chatFontPreview: 'Prévia',
      chatFontSample: 'Um pequeno jabuti xereta viu dez cegonhas felizes. 0123456789',
      chatFontReset: 'Usar fonte do tema',
      translucencyTitle: 'Translucidez da janela',
      translucencyDesc:
        'Veja o desktop através da janela inteira, texto incluído. Ajustado separadamente para claro e escuro.',
      translucencyGlassDesc:
        'Vidro fosco: o desktop aparece como um desfoque suave enquanto o texto fica nítido. Ajustado separadamente para claro e escuro.',
      translucencyModeClear: 'Transparente',
      translucencyModeGlass: 'Vidro',
      translucencyTintTitle: 'Tonalidade',
      translucencyFadeTitle: 'Desvanecer',
      translucencyFrostTitle: 'Gelo',
      translucencyFrost: {
        'under-window': 'Profundo',
        popover: 'Suave',
        titlebar: 'Claro',
        header: 'Brilhante'
      },
      translucencyScopeTitle: 'Área',
      translucencyScope: {
        window: 'Janela inteira',
        sidebar: 'Só a barra lateral'
      },
      backdropTitle: 'Fundo da conversa',
      backdropDesc: 'A imagem tênue de estátua atrás da conversa.',
      userBubbleTitle: 'Balão de mensagem',
      userBubbleDesc: 'Quão transparentes são as suas mensagens. Sólido em 0; só o contorno em 100.',
      textDirectionTitle: 'Direção do texto',
      textDirectionDesc:
        'Como as mensagens e o compositor escolhem a direção. Automático segue a primeira letra de cada parágrafo; escolha uma direção quando textos misturados ficam desalinhados. Código fica sempre da esquerda para a direita.',
      textDirection: { auto: 'Automático', rtl: 'Direita para esquerda', ltr: 'Esquerda para direita' },
      introSplashTitle: 'Splash de introdução',
      introSplashDesc: 'A marca e a frase mostradas numa conversa vazia.',
      modelPricingTitle: 'Preço dos modelos',
      modelPricingDesc: 'Mostra preços de entrada, saída e leitura de cache por milhão de tokens no seletor de modelo.',
      reactionsTitle: 'Reações de mensagem',
      reactionsDesc: 'Reações em emoji no estilo iMessage — reaja às mensagens, e o B-3PO pode reagir às suas.',
      tipsTitle: 'Dicas no app',
      tipsDesc:
        'Dicas ocasionais do app e do B-3PO. Cada dica aparece uma vez. Desliga sozinho após os primeiros 30 dias; você pode reativar.',
      tipsReset: (count: number) => `Mostrar ${count} ${count === 1 ? 'dica' : 'dicas'} de novo`,
      toursTitle: 'Tours guiados',
      toursDesc:
        'Deixe o B-3PO destacar cada passo enquanto guia você pelo app. Desliga sozinho após os primeiros 30 dias; você pode reativar.',
      composerPopoutTitle: 'Compositor flutuante',
      composerPopoutDesc: 'Permite arrastar o compositor para fora do encaixe. Desligado, ele fica no rodapé.',
      fileBrowserTitle: 'Navegador de arquivos',
      fileBrowserDesc:
        'Mostra o navegador de arquivos ao lado da conversa quando um workspace está aberto. O botão da barra de título também alterna.',
      vibeHeartsTitle: 'Corações',
      vibeHeartsDesc:
        'Corações flutuantes quando você agradece ou manda um coração. Separado das Reações de mensagem acima.',
      embedsTitle: 'Incorporações inline',
      embedsDesc:
        'Prévias ricas carregam de sites de terceiros (YouTube, X, …). Perguntar mostra um espaço até você liberar cada um; Sempre carrega automaticamente; Desligado mantém links simples.',
      embedsAsk: 'Perguntar',
      embedsAlways: 'Sempre',
      embedsOff: 'Desligado',
      embedsReset: (count: number) => `Liberar de novo ${count} ${count === 1 ? 'serviço' : 'serviços'}`,
      resumeLastSessionTitle: 'Reabrir a última conversa ao iniciar',
      resumeLastSessionDesc:
        'Quando ligado, o app reabre a conversa mais recente no início. Desligue para começar sempre numa conversa nova.',
      themeTitle: 'Tema',
      themeDesc: 'Apenas paletas do desktop. O modo selecionado é aplicado por cima.',
      themeSearchPlaceholder: 'Buscar seus temas ou o VS Code Marketplace…',
      themeProfileNote: profile => `Salvo para o perfil ${profile} — cada perfil mantém o próprio tema.`,
      installTitle: 'Instalar do VS Code',
      installDesc:
        'Cole o id de uma extensão do Marketplace (ex.: dracula-theme.theme-dracula) para converter o tema de cores numa paleta do desktop.',
      installPlaceholder: 'publicador.extensao',
      installButton: 'Instalar',
      installing: 'Instalando…',
      installError: 'Não foi possível instalar esse tema.',
      installed: name => `Instalado “${name}”.`,
      removeTheme: 'Remover tema',
      importedBadge: 'Importado',

      pet: {
        title: 'Mascote',
        intro:
          'Adote um mascote oficial do B-3PO que flutua sobre o app e reage ao que o agente está fazendo — correndo enquanto ferramentas executam, comemorando no sucesso, emburrado nos erros.',
        restartHint:
          'Mascotes precisam de um reinício rápido — o app em execução começou antes deste recurso existir. Feche e reabra o B-3PO, depois volte aqui.',
        scaleTitle: 'Tamanho',
        scaleDesc: 'Redimensiona o mascote flutuante. Aplica em todo lugar na hora.',
        roamTitle: 'Passear',
        roamDesc: 'Deixa o mascote andar sozinho pela janela quando ocioso.',
        chooseTitle: 'Escolha um mascote',
        chooseDesc: 'Escolher instala (se preciso) e ativa.',
        searchPlaceholder: 'Buscar mascotes…',
        unreachable: 'Não foi possível carregar a galeria de mascotes. Reabra esta página.',
        noMatch: query => `Nenhum mascote corresponde a "${query}".`,
        installedTag: 'instalado',
        generatedTag: 'Gerado',
        countCapped: (cap, total) => `Mostrando ${cap} de ${total} — digite para refinar.`,
        count: n => `${n} mascote${n === 1 ? '' : 's'}.`,
        uninstall: name => `Desinstalar ${name}`,
        delete: name => `Apagar ${name}`,
        deleteTitle: name => `Apagar ${name}?`,
        deleteBody: 'Isso apaga o mascote em definitivo — não dá para reinstalar.',
        deleteConfirm: 'Apagar',
        rename: name => `Renomear ${name}`,
        renameTitle: 'Renomear mascote',
        renamePlaceholder: 'Dê um nome ao mascote',
        renameSave: 'Salvar',
        exportPet: name => `Exportar ${name}`,
        adoptFailed: slug => `Não foi possível adotar ${slug}`,
        uninstallFailed: slug => `Não foi possível desinstalar ${slug}`,
        renameFailed: slug => `Não foi possível renomear ${slug}`,
        exportFailed: slug => `Não foi possível exportar ${slug}`,
        noneAvailable: 'Nenhum mascote disponível para ativar agora.',
        turnOnFailed: 'Não foi possível ativar o mascote.',
        turnOffFailed: 'Não foi possível desativar o mascote.'
      }
    },
    search: { placeholder: 'Buscar em todas as configurações…', pill: 'Buscar' },
    nav: {
      keysSettings: 'Configurações',
      providers: 'Provedores',
      providerAccounts: 'Contas',
      providerApiKeys: 'Chaves de API',
      providerCustomEndpoints: 'Endpoints personalizados',
      providerLocalModels: 'Modelos locais',
      gateway: 'Gateways',
      apiKeys: 'Ferramentas e chaves',
      keybinds: 'Atalhos de teclado',
      keysTools: 'Ferramentas',
      mcp: 'MCP',
      archivedChats: 'Conversas arquivadas',
      sessions: 'Conversas',
      about: 'Sobre',
      billing: 'Cobrança',
      notifications: 'Notificações',
      vault: 'Senhas e logins',
      plugins: 'Plugins'
    },
    config: {

      minimizeToTrayTitle: 'Minimizar para a bandeja',
      minimizeToTrayDesc:
        'Minimiza ou fecha a janela principal para escondê-la na bandeja do sistema (menu bar no macOS) e manter o B-3PO rodando. Use Sair do B-3PO no menu da bandeja ou Cmd+Q para encerrar. Desligado por padrão; vale só para este dispositivo.',
      minimizeToTrayUnavailable:
        'A bandeja do sistema não está disponível. As janelas vão minimizar e fechar normalmente. Desligue e ligue para tentar de novo.',
      none: 'Nenhum',
      noneParen: '(nenhum)',
      builtinOnly: 'Somente integrado',
      notSet: 'Não definido',
      commaSeparated: 'valores separados por vírgula',
      searchPlaceholder: 'Buscar…',
      noResults: 'Nenhum resultado',
      systemDefault: 'Padrão do sistema',
      loading: 'Carregando a configuração do B-3PO...',
      emptyTitle: 'Nada para configurar',
      emptyDesc: 'Esta seção não tem ajustes.',
      failedLoad: 'Falha ao carregar as configurações',
      autosaveFailed: 'Falha ao salvar automaticamente',
      imported: 'Configuração importada',
      invalidJson: 'JSON de configuração inválido',
      toolsetsWipeConfirm:
        'Remover todos os conjuntos de ferramentas ativos? Isso desliga memória, terminal, busca web, delegação e quase todas as outras ferramentas até você reativar.',
      keepAwakeTitle: 'Manter o computador acordado',
      keepAwakeDesc:
        'Impede a máquina de dormir. "Enquanto trabalha" segura só enquanto há um turno em andamento, então execuções da noite sobrevivem sem deixar o notebook acordado a semana toda. A tela ainda pode escurecer.',
      keepAwakeOff: 'Desligado',
      keepAwakeWhileWorking: 'Enquanto trabalha',
      keepAwakeAlways: 'Sempre',
      disableF12Title: 'Desativar DevTools do F12',
      disableF12Desc: 'Bloqueia o F12 de abrir as Ferramentas de Desenvolvedor. Ctrl+Shift+I (ou Cmd+Opt+I no Mac) continua funcionando.',
      alwaysExternalLinksTitle: 'Abrir sempre os links no navegador externo',
      alwaysExternalLinksDesc:
        'Abre todo link clicado no navegador do sistema em vez do navegador interno. "Abrir no navegador interno" no menu de contexto continua funcionando.',
      attachmentSizeTitle: 'Tamanho máximo de prévia / imagem',
      attachmentSizeDesc:
        'Tamanho máximo, em MB, de um arquivo local que o Desktop carrega para prévias e anexar imagem. O padrão é 16. Anexos remotos que não são imagem usam outro limite de 256 MB. Definir um valor muito alto carrega o arquivo inteiro na memória e pode travar ou derrubar o app.',
      attachmentSizeUnit: 'MB',
      attachmentSizeLabel: 'Tamanho máximo de prévia / imagem em megabytes',
      voiceShortcutHintTitle: 'Atalho de gravação de voz',
      voiceShortcutHintDesc:
        'Defina o atalho de gravação em Configurações → Atalhos de teclado ("Iniciar / parar conversa por voz"). O valor voice.record_key só vale para a CLI e a TUI.',
      showOptions: 'Mostrar opções'
    },
    /** A janela do atalho global (renderer sem provider): traduzida por translateNow. */
  quickEntryWindow: {
    sendTo: 'Enviar para',
    currentChat: 'Conversa atual',
    newSession: 'Nova conversa',
    targetSession: 'Conversa de destino'
  },
  quickEntry: {
      enabledTitle: 'Entrada rápida',
      enabledDesc:
        'Chame um compositor pequeno de qualquer lugar com um atalho global e dispare um prompt sem abrir o B-3PO.',
      shortcutTitle: 'Atalho da Entrada rápida',
      shortcutDesc: 'Precisa de ao menos um modificador, ex.: CommandOrControl+Shift+Space.',
      active: 'O atalho está ativo.',
      takenBy: 'Outro app já usa este atalho — escolha outro.',
      invalidShortcut: 'Atalho inválido. Inclua ao menos uma tecla modificadora.'
    },
    subpages: {
      appearanceTheme: 'Tema',
      appearanceTypography: 'Tipografia',
      appearanceWindowLayout: 'Janela e layout',
      appearanceChatDisplay: 'Exibição da conversa',
      appearancePet: 'Mascote',
      appearanceGeneral: 'Geral',
      modelMain: 'Modelo principal',
      modelAuxiliary: 'Modelos auxiliares',
      modelMoa: 'Mistura de agentes',
      modelFallbacks: 'Modelos de fallback',
      chatBehavior: 'Comportamento',
      chatAttachments: 'Anexos',
      workspaceProjects: 'Projetos e descoberta',
      workspaceShell: 'Ambiente de shell',
      workspaceFiles: 'Arquivos e execução',
      safetyApprovals: 'Aprovações',
      safetyPrivacy: 'Privacidade e rede',
      safetyCheckpoints: 'Pontos de restauração',
      browserProfile: 'Perfil do navegador',
      browserNetwork: 'URLs locais e privadas',
      memoryPersistent: 'Memória persistente',
      memoryContext: 'Contexto e compactação',
      voiceConversation: 'Conversa por voz',
      voiceTranscription: 'Fala para texto',
      voiceSpeech: 'Texto para fala',
      advancedRuntime: 'Limites do agente',
      advancedTools: 'Acesso a ferramentas',
      advancedTerminal: 'Backend do terminal',
      advancedOutput: 'Limites de saída',
      advancedDelegation: 'Subagentes',
      gatewayManagedUpdates: 'Atualizações remotas',
      gatewayManagedUpdatesUnavailable: 'Atualizações remotas exigem uma versão do desktop com suporte a atualização por SSH gerenciado.',
      gatewayManagedUpdatesEmpty: 'Adicione uma conexão SSH em Conexões salvas para gerenciar as atualizações dela aqui.',
      keyboardShortcuts: 'Atalhos de teclado',
      hudGesture: 'Gesto do HUD',
      screenCapture: 'Captura de tela',
      notificationAlerts: 'Alertas no desktop',
      notificationSounds: 'Sons',
      archivedSessions: 'Arquivo e retenção',
      defaultDirectory: 'Pasta padrão de projetos',
      vaultCredentials: 'Credenciais salvas',
      vaultSources: 'Gerenciadores de senha',
      appUpdates: 'Versão e atualizações',
      uninstall: 'Desinstalar',
      billingOverview: 'Visão geral',
      billingPlans: 'Planos',
      advancedDesktop: 'Desktop e inicialização',
    }
  },
  /** Só o que o painel de atualizações mostra hoje; o resto do bloco cai no inglês. */
  updates: {
    appName: 'B-3PO',
    cantReach: 'Não foi possível falar com o servidor de atualizações.',
    latestBodyBackend: 'O backend já está na versão mais recente.'
  },

}

export const pt = defineLocale(ptOverrides)