import type { Translations } from './types'

type ThreadCopy = Translations['assistant']['thread']

/**
 * pt-BR das camadas de erro do cartão de falha: usadas quando um código de erro específico não tem entrada
 * própria. `retry`/`diagnostics` continuam vindo do catálogo geral.
 */
export const ptErrorLayers: Pick<ThreadCopy, 'errorLayerBodies' | 'errorLayers'> = {
  errorLayers: {
    auth: 'Problema de login',
    billing: 'Sem créditos',
    disk: 'Disco cheio',
    endpoint: 'Não é possível alcançar seu servidor de modelos',
    gateway: 'Não foi possível enviar sua mensagem',
    generic: 'O B-3PO não conseguiu concluir esta resposta',
    provider: 'O serviço de IA retornou um erro',
    runtime: 'O B-3PO encontrou um problema',
    streaming: 'A resposta foi cortada'
  },
  errorLayerBodies: {
    auth: 'O serviço de IA recusou seu login. Confira as credenciais deste provedor e envie a mensagem de novo.',
    billing: 'Sua conta está sem créditos neste provedor. Recarregue ou troque de provedor e envie de novo.',
    disk: 'Seu disco está cheio, então o B-3PO não conseguiu salvar esta conversa. Libere espaço e tente de novo.',
    endpoint: 'O B-3PO não alcança seu servidor de modelos. Verifique se ele está rodando e envie a mensagem de novo.',
    gateway:
      'O B-3PO teve um problema interno ao iniciar esta resposta. Envie a mensagem de novo; se continuar, envie os diagnósticos.',
    generic: 'Algo deu errado enquanto o B-3PO respondia. Tente de novo, ou copie os detalhes se continuar.',
    provider: 'O serviço de IA não conseguiu completar este pedido. Tente em instantes ou troque de provedor.',
    runtime:
      'O B-3PO teve um problema interno ao iniciar esta resposta. Envie a mensagem de novo; se continuar, envie os diagnósticos.',
    streaming: 'A conexão caiu antes de a resposta terminar. Tente de novo para reenviar.'
  }
}
