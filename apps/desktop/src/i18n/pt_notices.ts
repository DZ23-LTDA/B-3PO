import { ptDesktopCommands } from './pt_desktop_commands'
import { ptSessionCommands } from './pt_session_commands'
import type { Translations } from './types'

/** pt-BR dos avisos de shell: renderização remota, barra legal, avisos do compositor e ofertas. */
export const ptNotices = {
  remoteDisplayBanner: {
    message: reason =>
      `Renderização por software ativa — display remoto detectado (${reason}). A aceleração de GPU foi desligada para evitar tremulação.`
  },
  butterbar: {
    goTo: (index, total) => `Mostrar o aviso ${index} de ${total}`,
    legal: {
      before: 'O uso do B-3PO está sujeito aos nossos ',
      terms: 'Termos de Serviço',
      between: ' e à ',
      privacy: 'Política de Privacidade',
      after: '.'
    }
  },
  promptNotices: {
    legacySendUnconfirmed:
      'Este servidor não conseguiu confirmar o envio anterior desta mensagem, então ela pode já ter rodado. Confira a conversa antes de enviar de novo.',
    restoredDraftAttachmentsDropped:
      'Os anexos da sua mensagem não enviada não foram restaurados. Anexe de novo antes de enviar.',
    mcpReloadDeferred:
      'Esta conversa está ocupada: a mudança de MCP vale quando o turno terminar e o MCP recarregar, ou quando você reabrir a conversa',
    mcpReloadUnavailable: servers => `Não conectou: ${servers}`,
    compactedTurnUnavailable:
      'Essa mensagem foi resumida quando a conversa foi compactada, então não pode mais ser restaurada nem editada.',
    staleTurnUnavailable: 'Essa mensagem não está mais no histórico desta conversa.',
    sessionCommands: ptSessionCommands,
    desktopCommands: ptDesktopCommands
  },
  keepAwakeOffer: {
    title: 'Seu computador dormiu enquanto o B-3PO trabalhava',
    message:
      'O B-3PO pode manter seu computador acordado enquanto uma tarefa roda. A tela ainda desliga, e na bateria o computador pode dormir mesmo assim.',
    action: 'Manter acordado durante o trabalho'
  },
  connectorOffer: {
    heading: 'Mantenha seus aplicativos conectados',
    body: 'Entre com uma conta Nous gratuita para manter no seu perfil os aplicativos que você conectou, como Gmail ou Slack.'
  }
} satisfies Pick<
  Translations,
  'remoteDisplayBanner' | 'butterbar' | 'promptNotices' | 'keepAwakeOffer' | 'connectorOffer'
>
