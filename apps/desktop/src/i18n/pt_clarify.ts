import type { ClarifyCopy } from './types_clarify'

/** pt-BR do pedido de esclarecimento (pergunta com opções). */
export const ptClarify: ClarifyCopy = {
  notReady: 'O pedido de esclarecimento ainda não está pronto',
  gatewayDisconnected: 'O B-3PO está offline agora. Reconecte e envie de novo.',
  sendFailed: 'Não foi possível enviar a resposta',
  loadingQuestion: 'Carregando a pergunta…',
  other: 'Outro (escreva sua resposta)',
  placeholder: 'Escreva sua resposta…',
  skip: 'Pular',
  skipped: 'Pulada',
  noAnswer: 'Sem resposta',
  confirmAndContinueLabel: 'Confirmar e continuar',
  singleSelectHint: 'Escolha uma',
  multiSelectHint: 'Marque todas as que se aplicam',
  oneQuestion: '1 pergunta',
  questionProgress: (answered, total) => `${answered} de ${total} respondidas`,
  notDelivered:
    'Esta pergunta não chegou ao aplicativo, então não pode ser respondida aqui. Pressione Parar para encerrar o turno e responda no chat.'
}
