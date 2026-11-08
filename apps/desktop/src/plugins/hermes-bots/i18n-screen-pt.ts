import type { BotsMessages } from './i18n-messages'

/**
 * pt-BR da tela do bot (VNC no host do gateway, controle de quem manda e troca de imagem do sandbox).
 *
 * Em módulo próprio porque `i18n.ts` está no teto do ratchet de linhas: lá entra como `screen: ptScreen`.
 */
export const ptScreen: BotsMessages['screen'] = {
  title: 'Tela',
  menu: 'Abrir tela',
  unsupportedTitle: 'Sem tela do bot neste host',
  unsupportedBody: 'Telas de bot rodam em hosts Linux do gateway. Este bot usa o display do próprio host.',
  notInstalledTitle: 'Pacotes de tela ausentes',
  notInstalledBody:
    'O host do gateway precisa do TigerVNC e do núcleo do Xfce para dar uma tela a este bot. Rode no host:',
  installHint: 'Roda no host do gateway como o usuário do Hermes; o sudo é pedido uma vez, pelo Hermes.',
  install: 'Instalar no host',
  installing: 'Instalando…',
  installCancelled: 'Instalação cancelada: nenhuma senha de sudo foi informada.',
  installFailed: 'A instalação falhou. Leia o log acima, ou rode o comando no host você mesmo.',
  noPackageManager: 'Nenhum gerenciador de pacotes suportado (apt, dnf, pacman) foi encontrado no host do gateway.',
  portalTitle: 'Tela',
  portalOpen: 'Abrir',
  heroStopped: 'A tela está desligada',
  heroNotInstalled: 'Não instalada neste host',
  heroConnecting: 'Verificando a tela…',
  heroStale: 'Vista por último — tela inalcançável',
  heroSuppressed: 'Oculta enquanto alguém tem o controle',
  heroOpenLive: 'Abrir ao vivo',
  heroInstall: 'Instalar',
  heroStart: 'Iniciar',
  portalWatching: 'Ao vivo · bot no controle',
  portalYouControl: 'Ao vivo · você está no controle',
  portalOtherControls: 'Ao vivo · outro espectador no controle',
  portalStopped: 'Parada',
  portalNotInstalled: 'Não instalada no host',
  portalUnsupported: 'Não disponível neste host',
  portalUnavailable: 'Atualize o Hermes do bot para usar a Tela',
  portalUnavailableManaged: 'A Tela ainda não está disponível nesta versão gerenciada do Hermes',
  managedNotIncludedTitle: 'A Tela não está incluída neste bot',
  managedNotIncludedBody:
    'O Hermes Cloud inclui a Tela em bots com 8 GB de memória ou mais. Não é possível instalá-la num bot menor.',
  unavailableTitle: 'A Tela precisa de um Hermes mais novo',
  autoOpenMenu: 'Abrir a Tela quando o bot usar',
  autoOpenOnToast: name => `A Tela de ${name} abre quando ele começa a usar o desktop`,
  autoOpenOffToast: name => `A Tela de ${name} fica fechada até você abrir`,
  stoppedTitle: 'A tela está desligada',
  stoppedBody: 'Inicie o desktop deste bot para ver o que ele faz e assumir quando ele precisar de você.',
  placementSandbox: backend => `A Tela roda dentro do sandbox ${backend}, junto com o terminal`,
  imageSwitchTitle: 'Nova imagem de sandbox disponível',
  imageSwitchBody: (current, target) =>
    `Seu sandbox ainda roda ${current}, que não tem desktop. Trocar para ${target} recria o contêiner na próxima vez que o bot usar o terminal: arquivos em /root e /workspace ficam nesta máquina, pacotes instalados dentro do contêiner são reinstalados sob demanda.`,
  imageSwitchApprove: 'Trocar a imagem',
  imageSwitchKeep: 'Manter a imagem atual',
  start: 'Iniciar a tela',
  attaching: 'Conectando à tela…',
  streamLost: 'O stream da tela terminou',
  reconnect: 'Reconectar',
  takeOver: 'Assumir o controle',
  handBack: 'Devolver o controle',
  handBackForce: 'Devolver (forçado)',
  handBackForceHint: 'Libera um controle preso por um espectador que não está mais aqui, por exemplo após recarregar.',
  openNeedsUpdate: 'Atualize o Hermes Desktop para abrir telas de bot.',
  youControl: 'Você está no controle',
  otherControls: 'Outro espectador está no controle',
  agentControls: 'O bot está no controle',
  controlTaken: 'Outro espectador assumiu o controle. Somente assistindo.',
  needsHttps:
    'Telas de bot exigem conexão segura. Abra o Webapp por HTTPS, ou por um túnel SSH para 127.0.0.1, para ver esta.'
}
