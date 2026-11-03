/**
 * pt-BR — Português do Brasil.
 *
 * O catálogo é um override parcial sobre o inglês (`defineLocale` → `mergeTranslations`): toda chave
 * que não está aqui cai no inglês, então nada quebra e a cobertura cresce por seção.
 *
 * Regra de tradução: textos apresentados ao usuário são traduzidos; **referências técnicas de
 * runtime continuam em inglês** — "Hermes Agent", "gateway", nomes de comando (`hermes`), nomes de
 * provider e caminhos. Placeholders e funções mantêm a mesma assinatura do original.
 */
import { defineLocale, type TranslationOverrides } from './define-locale'

export const ptOverrides: TranslationOverrides = {
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
    settingUpTitle: 'Preparando o Hermes Agent',
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
  }
}

export const pt = defineLocale(ptOverrides)
