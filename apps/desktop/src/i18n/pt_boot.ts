import type { Translations } from './types'

/**
 * pt-BR da tela de boot (inclui a tela de retenção por atualização).
 *
 * Era uma das 26 famílias de locale sem português: quem abria o app com o idioma em português via a tela de
 * inicialização e as mensagens de falha em inglês. `Hermes` continua como referência técnica do runtime.
 */
export const ptBoot = {
  boot: {
    ready: 'O B-3PO Desktop está pronto',
    desktopBootFailedWithMessage: message => `Falha ao iniciar o Desktop: ${message}`,
    steps: {
      connectingGateway: 'Conectando ao gateway do desktop',
      loadingSettings: 'Carregando as configurações',
      loadingSessions: 'Carregando as conversas recentes',
      retryingRemoteBackend: 'Reconectando ao backend remoto…',
      startingDesktopConnection: 'Iniciando a conexão do desktop',
      startingHermesDesktop: 'Iniciando o B-3PO Desktop…'
    },
    errors: {
      backgroundExited:
        'O serviço que roda suas conversas fechou de repente. Reinicie para continuar — suas conversas e configurações estão seguras.',
      backgroundExitedDuringStartup: 'O Hermes parou logo depois de iniciar.',
      backendStopped: 'O Hermes parou de trabalhar em segundo plano',
      restartHermes: 'Reiniciar o Hermes',
      openLogs: 'Abrir os logs',
      desktopBootFailed: 'O Hermes não conseguiu iniciar',
      gatewayConnectionLost: 'O Hermes perdeu a conexão',
      gatewayConnectionLostDetail:
        'Ainda tentando reconectar. Você pode continuar lendo e escrevendo. Se isso persistir, reconecte agora ou confira as configurações de conexão.',
      reconnectNow: 'Reconectar agora',
      connectionSettings: 'Configurações de conexão',
      gatewaySignInRequired: 'Seu Hermes remoto encerrou a sessão',
      gatewaySignInRequiredDetail: 'Entre de novo para reconectar. Suas conversas e configurações estão seguras.',
      signInAgain: 'Entrar de novo',
      ipcBridgeUnavailable:
        'O B-3PO Desktop não conseguiu falar com a própria camada de segundo plano. Reinicie o aplicativo.'
    },
    causes: {
      exitedEarly: 'O serviço de segundo plano do Hermes parou logo depois de iniciar.',
      timedOut: 'O serviço de segundo plano do Hermes não respondeu a tempo.',
      permission: 'O Hermes não conseguiu gravar na pasta de dados (problema de permissão).',
      diskFull: 'O disco está cheio, então o Hermes não pôde iniciar.',
      portInUse: 'Outro programa está usando a porta de rede de que o Hermes precisa.',
      installMissing: 'Falta parte da instalação do Hermes. Use Reparar instalação para repor.'
    },
    failure: {
      title: 'O Hermes não conseguiu iniciar',
      description:
        'O serviço de segundo plano do Hermes não subiu. Tente uma das etapas de recuperação abaixo. Nada aqui apaga suas conversas ou configurações.',
      details: 'Detalhes',
      remoteTitle: 'É preciso entrar no gateway remoto',
      remoteDescription:
        'A sessão do gateway remoto expirou. Entre de novo para reconectar. Nada aqui apaga suas conversas ou configurações.',
      webappTitle: 'Entrar no Hermes',
      webappDescription: 'Execute hermes webapp neste computador para autorizar este navegador.',
      retry: 'Tentar de novo',
      repairInstall: 'Reparar instalação',
      useLocalGateway: 'Usar o gateway local',
      gatewaySettings: 'Configurações do gateway',
      back: 'Voltar',
      openLogs: 'Abrir os logs',
      repairHint: 'O reparo roda o instalador de novo e pode levar alguns minutos em uma máquina nova.',
      bundledReinstallHint:
        'Esta instalação empacotada não consegue se reparar por dentro do app — reinstale o aplicativo para restaurar o backend.',
      reinstallApp: 'Reinstalar o aplicativo',
      remoteSignInHint: signInLabel =>
        `Encerra a sessão remota salva e abre ${signInLabel}. Use o gateway local para trocar para o backend empacotado.`,
      signOutAndSignIn: 'Sair e entrar',
      remoteFailureHint:
        'Confira a URL do gateway e o login em Configurações do gateway, ou troque para o gateway local.',
      cloudDownTitle: 'O agente do Nous Cloud está fora do ar',
      cloudDownDescription:
        'O agente em nuvem gerenciado pelo Nous, ao qual este gateway se conecta, está devolvendo erro de servidor. Não é possível reiniciá-lo daqui — verifique o status, troque para o gateway local ou peça suporte.',
      cloudDownHint: 'Os botões abaixo abrem o Nous Portal (status e controles da instância) e nosso Discord para suporte.',
      cloudDownCheckPortal: 'Ver o status no Portal',
      cloudDownDiscord: 'Pedir ajuda no Discord',
      hideRecentLogs: 'Ocultar logs recentes',
      showRecentLogs: 'Mostrar logs recentes',
      signedInTitle: 'Sessão iniciada',
      signedInMessage: 'Reconectando ao gateway remoto…',
      signInIncompleteTitle: 'Login incompleto',
      signInIncompleteMessage: 'A janela de login fechou antes de a autenticação terminar.',
      signInFailed: 'Falha no login',
      signInToRemoteGateway: 'Entrar no gateway remoto',
      signInWithProvider: provider => `Entrar com ${provider}`,
      identityProvider: 'seu provedor de identidade'
    },
    updateHold: {
      title: 'Uma atualização anterior ainda retém o Hermes',
      titleUnverified: 'O Hermes não consegue confirmar que a última atualização terminou',
      description:
        'O Hermes está adiando a inicialização para não carregar arquivos que uma atualização ainda pode estar mudando. Ele começa sozinho assim que a retenção terminar.',
      heldByProcess: pid =>
        `A atualização (processo ${pid}) terminou, mas um processo que ela iniciou ainda retém a instalação do Hermes.`,
      heldUnknown: 'Uma atualização terminou, mas um processo que ela iniciou ainda retém a instalação do Hermes.',
      unverified:
        'O auxiliar de atualização não conseguiu verificar quem é dono da instalação do Hermes agora. O Hermes continua verificando.',
      since: time => `Aguardando desde ${time}`,
      lastChecked: time => `Última verificação ${time}`,
      recoveryHint:
        'Normalmente isso passa em alguns minutos. Se não passar: feche o Hermes, encerre processos restantes de git ou hermes (ou reinicie o computador) e abra o Hermes de novo.',
      checkAgain: 'Verificar de novo',
      quit: 'Fechar o Hermes',
      openLogs: 'Abrir os logs',
      startAnyway: 'Iniciar assim mesmo…',
      confirmTitle: 'Iniciar o Hermes enquanto a atualização ainda o retém?',
      confirmBody:
        'O processo remanescente da atualização pode ainda estar mudando arquivos do Hermes. Iniciar agora pode carregar uma instalação pela metade, que talvez não funcione até você rodar a atualização de novo. O Hermes registra essa escolha no log e mantém o marcador da atualização.',
      confirmKeepWaiting: 'Continuar esperando',
      confirmStart: 'Iniciar assim mesmo',
      startAnywayRefused:
        'O que retém a instalação mudou antes de o Hermes conseguir iniciar. Verifique e tente de novo.'
    }
  }
} satisfies Pick<Translations, 'boot'>
