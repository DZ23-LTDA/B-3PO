import type { SessionCommandNotices } from './types_notices'

/** pt-BR dos avisos de /undo /retry /steer /queue (mesmo texto do gateway na TUI). */
export const ptSessionCommands: SessionCommandNotices = {
  undoUsage: 'uso: /undo [N]',
  undoNothing: 'nada para desfazer',
  undidOne: (count: string) => `desfez ${count} mensagem — a mensagem removida está no compositor`,
  undidOther: (count: string) => `desfez ${count} mensagens — a mensagem removida está no compositor`,
  retryNothing: 'nada para tentar de novo',
  retryUnsupported: '/retry: tentar de novo não aceita mídia nem partes de conteúdo desconhecidas',
  busy: (command: string) =>
    `sessão ocupada — o B-3PO ainda está respondendo. Pare a resposta atual primeiro (botão Parar, ou Ctrl+C num terminal) e rode /${command}.`,
  busyCompressing: (command: string) =>
    `sessão ocupada — um /compress está rodando; rode /${command} quando ele terminar.`,
  steerUsage: 'uso: /steer <instrução>',
  steerQueued: (preview: string) => `intervenção na fila — chega depois da próxima chamada de ferramenta: "${preview}"`,
  steerNoActiveTurn: (preview: string) => `nenhum turno ativo — na fila para o próximo: "${preview}"`,
  steerRejected: 'intervenção recusada — nenhum turno ativo, na fila para o próximo turno',
  queued: (preview: string) => `na fila: "${preview}"`,
  queueFailed: 'não foi possível enfileirar a mensagem',
  countOne: (count: string) => `${count} mensagem na fila`,
  countOther: (count: string) => `${count} mensagens na fila`,
  queueEditKeptTitle: 'Mensagem na fila não foi alterada',
  queueEditKept: 'Ela começou ou foi recusada antes de sua edição ser salva. Seu texto editado está no compositor.',
  queueEditUnconfirmedTitle: 'Edição não confirmada',
  queueEditUnconfirmed:
    'O B-3PO não conseguiu confirmar sua edição. Salve de novo para repetir a mesma edição; ela nunca entra duas vezes na fila.'
}
