import type { GatewayHostTranslations } from './types_gateway_host'

/** pt-BR de Configurações ▸ Gateways quando a conexão não pode ser mudada daqui. */
export const ptGatewayHost: GatewayHostTranslations = {
  unavailableTitle: 'Configurações do gateway indisponíveis',
  unavailableDesc:
    'As configurações de conexão só podem ser mudadas pelo aplicativo B-3PO Desktop no computador que o roda.',
  webappHostTitle: 'Host do Hermes',
  webappHostDesc:
    'O Webapp sempre usa o host Hermes que o serve. Para trocar de gateway, entrar no B-3PO Cloud ou gerenciar conexões salvas, use o aplicativo B-3PO Desktop.',
  webAccess: {
    title: 'Acesso pela web',
    intro:
      'Abra o Hermes deste computador pelo celular ou por outro computador, entrando com sua conta Nous. Quem entrar pode rodar comandos neste computador.',
    failed: 'Não foi possível mudar o acesso pela web',
    running: 'Rodando',
    stopped: 'Parado',
    starting: 'Iniciando',
    stopping: 'Parando',
    restartNeeded: 'Precisa reiniciar',
    unavailable: 'Indisponível',
    notRunningDetail: 'Inicie para abrir o Hermes em outro dispositivo.',
    needsNous: 'Entre na sua conta Nous em Provedores primeiro.',
    runningLan: 'Abra este endereço num dispositivo na mesma rede.',
    runningPublic: 'Servido pela sua URL.',
    runningLocal: 'Só este computador consegue abrir. Pare e inicie de novo para abrir em outros dispositivos.',
    pendingOn: 'Salvo. O gateway serve o app web assim que reiniciar.',
    pendingOff: 'Desligado, mas o gateway segue servindo o app web até reiniciar.',
    unavailableDetail: reason => `O gateway não conseguiu servir o app web: ${reason}`,
    restartBusy:
      'Salvo. Uma conversa está rodando, então o gateway não reiniciou. Escolha Reiniciar gateway quando ela terminar.',
    restartFailed: 'Salvo, mas o gateway não conseguiu reiniciar. Escolha Reiniciar gateway para tentar de novo.',
    restartFailedBecause: reason => `O gateway não conseguiu reiniciar: ${reason}`,
    startTimedOut: 'O gateway não serviu o app web em 90 segundos.',
    stopTimedOut: 'O gateway não parou de servir o app web em 90 segundos.',
    start: 'Iniciar',
    stop: 'Parar',
    restartGateway: 'Reiniciar gateway',
    modeLan: 'Esta rede',
    modeLanDetail: url => `Dispositivos no seu Wi-Fi abrem ${url}. Use só numa rede em que você confia.`,
    lanUnencrypted: 'A conexão não é criptografada: outras pessoas nesta rede poderiam ler o que você envia e recebe.',
    noLan: 'Este computador não tem um endereço de rede alcançável por outros dispositivos.',
    modePublic: 'Minha própria URL',
    modePublicDetail: port => `Um endereço HTTPS que você já roda, como Tailscale Serve ou um túnel, apontando para http://127.0.0.1:${port}.`
  }
}
