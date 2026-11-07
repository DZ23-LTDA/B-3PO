import type { Translations } from './types'
import { ptConnectorAccounts } from './pt_connector_accounts'

/**
 * pt-BR da página de Conectores (Capacidades ▸ Conectores).
 *
 * A família não tinha `en_connectors.ts` — o inglês mora dentro do `en.ts`. Traduzi a partir do bloco original,
 * espelhando as expressões (e não só o texto) para que a contagem e a ordem dos placeholders continuem idênticas às
 * do inglês.
 */
export const ptConnectors: Translations['connectorsPage'] = {
  title: 'Conectores',
  searchPlaceholder: (count: number) => `Buscar em ${count} aplicativos`,
  filterCategory: 'Categoria',
  categoryAll: 'Todas as categorias',
  uncategorised: 'Sem categoria',

  residencyLocal: 'Neste dispositivo',

  segment: {
    all: 'Todos',
    available: 'Disponíveis',
    connected: 'Conectados',
    off: 'Desligados'
  },

  group: {
    connected: 'Conectados',
    connectedNote: 'Conexões quebradas primeiro.',
    available: 'Disponíveis',
    off: 'Desligados',
    offNote: 'Os logins são mantidos.'
  },

  card: {
    kindManaged: 'Gerenciado',
    kindCatalog: 'MCP · Catálogo',
    kindCustom: 'MCP · Personalizado',
    kindPlugin: (plugin: string) => `MCP · Plugin ${plugin}`,
    inCatalog: 'No catálogo do Hermes',
    hostedTwin: 'Versão gerenciada disponível',
    alsoLocal: 'Também roda neste dispositivo',
    open: (name: string) => `Abrir ${name}`,
    turnServerOn: (name: string) => `Ligar ${name}`,
    turnServerOff: (name: string) => `Desligar ${name}`,
    state: {
      accessExpired: 'Acesso expirado',
      available: 'Disponível',
      connected: 'Conectado',
      connecting: 'Conectando',
      connectionUnknown: 'Estado desconhecido',
      couldNotConnect: 'Não foi possível conectar',
      offByYourOrganisation: 'Desligado pela sua organização',
      offForYou: 'Desligado para você',
      serverConnecting: 'Conectando…',
      serverError: 'Erro',
      serverNeedsAuth: 'Precisa de autenticação',
      serverOff: 'Desligado',
      serverOn: 'Ligado',
      serverOnUnused: 'Ligado, sem uso'
    },
    fact: {
      tools: (count: number) => `${count} ferramenta${count === 1 ? '' : 's'}`,
      toolsOff: (count: number) => `${count} ferramenta${count === 1 ? '' : 's'} desligadas`,
      toolsOn: (count: number) => `${count} ferramenta${count === 1 ? '' : 's'} ligadas`,
      toolsSomeOn: (total: number, on: number) => `${total} ferramentas, ${on} ligadas`
    },
    verb: {
      authenticate: 'Autenticar',
      connect: 'Conectar',
      install: 'Instalar',
      openLogs: 'Abrir os logs',
      reconnect: 'Reconectar',
      stopWaiting: 'Parar de esperar',
      tryAgain: 'Tentar de novo',
      turnBackOn: 'Ligar de novo'
    },
    reason: {
      finishSignIn: 'Conclua o login no seu navegador.',
      reconnect: 'Reconecte para este aplicativo continuar funcionando.',
      serverError: 'O servidor recusou a conexão.',
      serverNeedsAuth: 'Entre para deixar este servidor responder.'
    }
  },

  page: {
    loading: 'Lendo o catálogo e os servidores deste computador',
    emptyTitle: 'Nenhum aplicativo aqui ainda. Adicione um servidor neste computador para começar.',
    noMatchTitle: 'Nenhum aplicativo corresponde',
    noMatchBody: 'Nada aqui corresponde. Aponte o Hermes para o seu próprio servidor MCP para adicionar.',
    clearSearch: 'Limpar a busca',
    hostedFailedTitle: 'Não foi possível alcançar os aplicativos gerenciados.',
    hostedFailedBody: 'Os servidores deste computador não foram afetados e continuam rodando. Nada foi desligado.',
    retry: 'Tentar de novo',
    matchesElsewhere: (count: number) => `${count} resultado${count === 1 ? '' : 's'} em outros grupos.`,
    showAllMatches: 'Mostrar todos os resultados',
    segmentNoMatch: (segment: string) => `Nenhum resultado em ${segment}, então todos aparecem.`,
    freeTierNote: 'As conexões ficam neste computador até você entrar.',
    signInLine: 'Entre no Nous para usar aplicativos gerenciados.',
    signIn: 'Entrar',
    managedUnavailable: 'Aplicativos gerenciados ainda não estão disponíveis para esta conta.',
    writeFailed: 'Essa mudança não foi salva.',
    refreshFailed: 'A lista de ferramentas não foi atualizada.',
    disconnectNoAccount: 'O B-3PO não tem conta para desconectar aqui. Atualize a página e tente de novo.',
    disconnectRefused:
      'O Nous não conseguiu remover este login agora. Desligue o aplicativo pelo botão, ou tente mais tarde.'
  },

  add: {
    action: 'Adicionar o seu',
    title: 'Conectar a um MCP personalizado',
    hint: 'uma nova entrada no mcp.json deste dispositivo',
    pasteLabel: 'Cole um comando ou um trecho',
    pastePlaceholder: 'npx -y @modelcontextprotocol/server-filesystem /caminho/para/pasta',
    pasteNoMatch: 'Nada aqui parece um servidor. Preencha os campos abaixo.',
    name: 'Nome',
    nameTaken: 'Esse nome já está em uso.',
    type: 'Tipo',
    typeStdio: 'STDIO',
    typeHttp: 'HTTP com streaming',
    command: 'Comando para iniciar',
    args: 'Argumentos',
    addArg: '+ Adicionar argumento',
    envVars: 'Variáveis de ambiente',
    addEnvVar: '+ Adicionar variável de ambiente',
    passthrough: 'Repasse de variáveis de ambiente',
    addPassthrough: '+ Adicionar variável',
    cwd: 'Diretório de trabalho',
    url: 'URL',
    headers: 'Cabeçalhos',
    addHeader: '+ Adicionar cabeçalho',
    auth: 'Autenticação',
    authNone: 'Nenhuma',
    authOauth: 'OAuth',
    authBearer: 'Token Bearer',
    keyPlaceholder: 'CHAVE',
    valuePlaceholder: 'valor',
    removeRow: 'Remover esta linha',
    editJson: 'Editar mcp.json',
    saveFailed: 'Esse servidor não foi salvo.'
  },

  dialog: {
    disconnect: 'Desconectar',
    disconnectTitle: (name: string) => `Desconectar ${name}?`,
    disconnectBody: 'O B-3PO deixa de agir como esta conta. Você pode conectar de novo quando quiser.',
    menuRefreshTools: 'Atualizar ferramentas',
    moreActions: 'Mais ações',
    removeServerTitle: (name: string) => `Remover ${name}?`,
    removeServerBody: 'A entrada sai do mcp.json deste computador. Nada mais é apagado.',
    appSwitch: (name: string) => `O B-3PO pode usar ${name}`,
    waysTitle: (name: string) => `Onde ${name} roda`,
    wayNotConnected: (name: string) => `Ainda não conectado. Entre em ${name} no seu navegador.`,
    wayHosted: 'Gerenciado',
    bothOn: (name: string) => `Os dois estão ligados, então o B-3PO vê cada ferramenta de ${name} duas vezes.`,
    turnOffLocal: 'Desligar o servidor local',
    providedByPlugin: (plugin: string) => `Fornecido pelo plugin ${plugin}`,
    openPlugins: 'Abrir a aba Plugins',
    nousLine: 'Aplicativos Nous seguem sua conta, não o perfil.',
    rulesReadOnly: 'As regras não podem ser mudadas agora.',
    rulesAppOff: (name: string) => `Ligue ${name} para mudar as ferramentas dele.`,
    rulesSignIn: 'Entre para mudar o que o B-3PO pode fazer aqui.',
    orgNote: (count: number) => `Sua organização desligou ${count} ferramentas.`,
    orgLink: 'Abrir a administração de conectores',
    connectEnded: 'O login não terminou.',
    connectOpenAgain: 'Abrir o link de novo',
    tokensPerCall: 'tokens por chamada',
    usesPerMonth: 'usos em 30 dias',
    advanced: 'Avançado',
    advancedHint: 'a entrada do mcp.json e os logs'
  },

  accounts: ptConnectorAccounts,

  tools: {
    title: 'Ferramentas',
    notInstalledBody: 'Instale neste dispositivo para ver as ferramentas que ele traz.',
    summaryTitle: (name: string) => `O que o B-3PO pode fazer com ${name}`,
    summaryPreviewTitle: (name: string) => `O que o B-3PO poderá fazer com ${name} depois que você conectar`,
    summaryCount: (count: number) => `${count} ferramenta${count === 1 ? '' : 's'}`,
    summaryAllTools: 'Todas as ferramentas',
    summaryOther: 'Outras',
    allToolsSwitch: 'Ligar ou desligar todas as ferramentas',
    summaryAllOn: 'todas ligadas',
    summarySomeOn: (on: number, total: number) => `${on} de ${total} ligadas`,
    summaryOff: 'desligadas',
    showAllTools: (count: number) => `Mostrar todas as ${count} ferramenta${count === 1 ? '' : 's'}`,
    showSummary: 'Mostrar resumo',
    facetSwitch: (facet: string) => `Ligar ou desligar ferramentas de ${facet}`,
    moreHints: (count: number) => `+${count}`,
    staleSignIn: 'Entre para ler a lista de ferramentas mais recente.',
    searchCountPlaceholder: (count: number) => `Buscar em ${count} ferramentas`,
    toolList: (name: string) => `Ferramentas de ${name}`,
    categorySelect: (count: number) => `${count} categorias`,
    showDeprecated: (count: number) => `Mostrar ${count} obsoletas`,
    hideDeprecated: (count: number) => `Ocultar ${count} obsoletas`,
    quickReadOnly: 'Somente leitura',
    quickNoDestructive: 'Desligar destrutivas',
    quickEverythingOn: 'Tudo ligado',
    lockedHint: 'desligado pela sua organização',
    turnToolOn: (tool: string) => `Ligar ${tool}`,
    turnToolOff: (tool: string) => `Desligar ${tool}`,
    showDetails: (tool: string) => `Mostrar o que ${tool} faz`,
    hideDetails: (tool: string) => `Ocultar o que ${tool} faz`,
    noMatch: 'Nenhuma ferramenta corresponde a estes filtros.',
    loading: 'Lendo a lista de ferramentas',
    unavailableLine: 'Lista de ferramentas indisponível.',
    retry: 'Tentar de novo',
    goneTitle: (name: string) => `${name} saiu do catálogo.`,
    goneBody: 'O B-3PO não consegue mais chamá-lo. A linha fica até você removê-la, então nada desaparece.',
    remove: 'Remover',
    offTitle: (name: string) => `${name} está desligado.`,
    offBody: 'Ligue no botão acima para ler as ferramentas que ele traz.',
    needsAuthTitle: (name: string) => `Entre em ${name} para ler as ferramentas dele.`,
    needsAuthBody: 'O login fica neste computador. Nada sai dele.',
    signedOutTitle: 'Entre no Nous para ler a lista de ferramentas.',
    signedOutBody: 'Seus servidores neste computador não são afetados.',
    conflictTitle: 'Alguém mudou esta regra enquanto você editava.',
    conflictBody: (theyOff: number, theyOn: number) => {
      const they = [
        theyOff > 0 ? `desligou ${theyOff} ferramenta${theyOff === 1 ? '' : 's'} que você tem ligada` : '',
        theyOn > 0 ? `deixou ${theyOn} ferramenta${theyOn === 1 ? '' : 's'} ligada que você desligou` : ''
      ].filter(Boolean)

      return `${they.length > 0 ? `A outra pessoa ${they.join(', e ')}. ` : ''}Suas edições continuam na tela; nada foi gravado.`
    },
    conflictReload: 'Recarregar a versão da outra pessoa',
    conflictSave: 'Gravar por cima da versão dela',
    saveFailed: 'Essas regras de ferramentas não foram salvas.',
    footerDirty: (off: number, backOn: number) =>
      `${off} ferramenta${off === 1 ? '' : 's'} desligadas, ${backOn === 0 ? 'nenhuma' : backOn} de volta`,
    discard: 'Descartar',
    save: 'Salvar mudanças',
    saving: 'Salvando...'
  },

  vocabulary: {
    facetRead: { label: 'Leitura', long: 'Lê dados deste aplicativo. Não muda nada.' },
    facetWrite: { label: 'Escrita', long: 'Cria ou altera algo neste aplicativo.' },
    facetDestructive: { label: 'Destrutiva', long: 'Pode remover algo deste aplicativo em definitivo.' },
    facetUnclassified: { label: 'Efeito desconhecido', long: 'O aplicativo não disse o que esta ferramenta faz.' },
    hintReadOnly: { label: 'Somente leitura', long: 'A ferramenta declara que apenas lê.' },
    hintCreate: { label: 'Cria', long: 'Faz algo novo.' },
    hintUpdate: { label: 'Atualiza', long: 'Altera algo que já existe.' },
    hintDelete: { label: 'Apaga', long: 'Remove algo.' },
    hintDestructive: { label: 'Destrutiva', long: 'A mudança que faz não pode ser desfeita aqui.' },
    hintIdempotent: { label: 'Repetível', long: 'Rodar duas vezes faz o mesmo que rodar uma.' },
    hintOpenWorld: { label: 'Externa', long: 'Alcança algo fora deste aplicativo.' }
  }
}
