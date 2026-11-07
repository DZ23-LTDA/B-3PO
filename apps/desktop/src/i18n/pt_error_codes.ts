import type { Translations } from './types'

type ThreadCopy = Translations['assistant']['thread']

/**
 * pt-BR do cartão de erro por código (`error_surface.code`).
 *
 * É a família mais longa do catálogo e a que mais aparece em produção: cada falha de provedor, sessão e disco tem
 * título e corpo próprios. Nomes de provedor entram por parâmetro, não são traduzidos.
 */
export const ptErrorCodes: ThreadCopy['errorCodes'] = {
  auth: {
    title: provider => `${provider} recusou sua chave de API`,
    body: () => 'A chave salva é inválida ou foi revogada. Atualize-a e envie a mensagem de novo.'
  },
  auth_permanent: {
    title: provider => `${provider} recusou sua chave de API`,
    body: () => 'A chave salva é inválida ou foi revogada. Atualize-a e envie a mensagem de novo.'
  },
  billing: {
    title: provider => `${provider} está sem créditos`,
    body: provider => `Adicione créditos para continuar usando modelos pagos no ${provider}.`
  },
  rate_limit: {
    title: provider => `${provider} está ocupado agora`,
    body: provider => `Você atingiu o limite de requisições do ${provider}. Espere um pouco e tente de novo.`
  },
  upstream_rate_limit: {
    title: (_provider, model) => `${model || 'Este modelo'} está ocupado agora`,
    body: (provider, model) =>
      `${model || 'Este modelo'} está limitado acima do ${provider}, não na sua conta. Tente de novo em instantes.`
  },
  overloaded: {
    title: provider => `${provider} está ocupado agora`,
    body: provider => `O ${provider} está sobrecarregado e não conseguiu aceitar este pedido. Tente de novo em instantes.`
  },
  server_error: {
    title: provider => `${provider} está com problemas`,
    body: provider => `O ${provider} devolveu um erro de servidor. Tente de novo em instantes.`
  },
  timeout: {
    title: provider => `Não é possível alcançar o ${provider}`,
    body: provider => `O B-3PO não conseguiu alcançar o ${provider}. Verifique sua conexão e tente de novo.`
  },
  stream_drop: {
    title: 'A resposta foi cortada',
    body: 'A conexão caiu antes de a resposta terminar. Tente de novo para reenviar.'
  },
  no_reply: {
    title: 'A resposta não chegou',
    body: 'O B-3PO terminou este turno, mas nenhuma resposta chegou a esta janela. Tente de novo para reenviar.'
  },
  upstream_blocked: {
    title: provider => `${provider} bloqueou este pedido`,
    body: provider =>
      `Um firewall à frente do ${provider} recusou antes de chegar ao modelo. Troque de provedor, ou defina um User-Agent personalizado para ele.`
  },
  ssl_cert_verification: {
    title: provider => `Não é possível verificar a conexão com o ${provider}`,
    body: provider =>
      `Um proxy ou um repositório de certificados desatualizado bloqueou a conexão segura com o ${provider}. O guia de configuração mostra como corrigir.`
  },
  context_overflow: {
    title: 'Esta conversa está longa demais',
    body: (_provider, model) =>
      `A conversa não cabe mais na janela de contexto ${model ? `do ${model}` : 'do modelo'}. Compacte para continuar.`
  },
  payload_too_large: {
    title: 'Esta mensagem é grande demais',
    body: provider =>
      `O pedido, com anexos, passou do limite de tamanho do ${provider}. Compacte a conversa ou remova anexos.`
  },
  model_not_found: {
    title: (_provider, model) => `${model || 'Este modelo'} não está disponível`,
    body: (provider, model) =>
      `O ${provider} não oferece ${model || 'este modelo'} na sua conta. Escolha outro modelo.`
  },
  provider_policy_blocked: {
    title: (provider, model) => `As configurações do ${provider} bloqueiam ${model || 'este modelo'}`,
    body: provider =>
      `Suas configurações de privacidade no ${provider} excluem todos os endpoints deste modelo. Mude-as no ${provider}, ou escolha outro modelo.`
  },
  content_policy_blocked: {
    title: provider => `${provider} recusou esta mensagem`,
    body: provider => `O filtro de segurança do ${provider} recusou. Edite a mensagem e envie de novo.`
  },
  format_error: {
    title: provider => `${provider} recusou este pedido`,
    body: provider =>
      `O ${provider} não aceitou a estrutura desta conversa. Troque de provedor, ou comece uma conversa nova se continuar.`
  },
  truncated: {
    title: 'A resposta foi interrompida',
    body: (_provider, model) =>
      `${model || 'O modelo'} parou antes de terminar a resposta. Continue para retomar de onde parou.`
  },
  invalid_response: {
    title: 'Não foi possível ler a resposta',
    body: provider => `O ${provider} devolveu uma resposta vazia ou quebrada. Tente de novo em instantes.`
  },
  empty_response: {
    title: 'Não foi possível obter uma resposta',
    body: provider => `O ${provider} não devolveu nada para esta mensagem. Tente de novo em instantes.`
  },
  loop_error: {
    title: 'O B-3PO não conseguiu concluir este passo',
    body: 'Algo deu errado ao tratar a resposta. Tente de novo; se repetir, envie os diagnósticos a partir dos detalhes.'
  },
  SESSION_OWNER_BUSY: {
    title: 'O B-3PO está ocupado nesta conversa',
    body: 'Outro turno está rodando aqui e sua mensagem não entrou na fila dele. Nada foi enviado. Tente de novo quando o turno terminar.'
  },
  cron_session_read_only: {
    title: 'Esta conversa pertence a uma tarefa agendada',
    body: 'Ela só roda aquela tarefa, então sua mensagem não foi executada. Comece uma conversa nova para enviar.'
  },
  session_read_only: {
    title: 'Esta conversa é somente leitura',
    body: 'É histórico armazenado que o B-3PO pode mostrar, mas não continuar, então sua mensagem não foi executada. Comece uma conversa nova para enviar.'
  },
  workspace_unavailable: {
    title: 'A pasta desta conversa não existe mais',
    body: 'A pasta em que esta conversa trabalha foi movida ou apagada, então sua mensagem não foi executada. Recrie a pasta, ou use Mover para projeto para dar outra a esta conversa, e tente de novo.'
  },
  launch_credentials_unavailable: {
    title: 'A chave de API desta conversa mudou',
    body: 'Esta conversa começou com uma chave de API que mudou ou foi removida, então sua mensagem não foi enviada. Uma conversa aberta nunca troca de chave sozinha. Inicie uma sessão nova para usar sua chave atual.'
  },
  local_runtime_unavailable: {
    title: 'Não é possível alcançar o servidor de modelos local',
    body: 'O servidor de modelos local ainda não está servindo: pode estar iniciando. Tente de novo em instantes, ou troque de modelo.',
    bodyNoRetry:
      'O servidor de modelos local está desligado. Inicie pelo aplicativo B-3PO Desktop ou por `hermes model` num terminal, ou troque de modelo.'
  },
  SESSION_OWNER_UNCONFIRMED: {
    title: 'Sua mensagem pode já estar na fila',
    body: 'O gateway não confirmou sua mensagem a tempo. Se ela entrou na fila, roda quando o turno anterior terminar ou for resolvido. Confira a conversa antes de enviar de novo.'
  },
  agent_init_failed: {
    title: 'Não foi possível iniciar esta conversa',
    body: provider =>
      `O B-3PO não conseguiu se conectar ao ${provider} para esta conversa. Tente de novo; se falhar sempre, confira o provedor nas Configurações.`
  },
  SESSION_NOT_OWNED: {
    title: 'Conversa aberta em outro lugar',
    body: 'Esta conversa está aberta em outra janela do B-3PO ou num terminal. Comece uma conversa nova aqui, ou feche-a lá primeiro.'
  },
  disk_full: {
    title: 'Seu disco está cheio',
    body: 'O B-3PO não conseguiu salvar esta conversa. Libere espaço e tente de novo.'
  },
  free_tier_disabled: {
    title: 'Entre para continuar conversando',
    body: 'Entre com uma conta Nous para continuar conversando, é grátis.'
  },
  free_tier_rate_limited: {
    title: 'Cota gratuita esgotada',
    body: 'Ela renova em breve. Entre com uma conta Nous para uma cota maior, é grátis.'
  },
  free_tier_at_capacity: {
    title: 'O nível gratuito está cheio',
    body: 'Entre para pular a fila, é grátis, ou tente de novo daqui a pouco.'
  },
  free_tier_model_not_free: {
    title: 'Este modelo exige login',
    body: 'O B-3PO usa o modelo gratuito por enquanto. Entre com uma conta Nous para mais modelos, é grátis.'
  },
  free_tier_route: {
    title: 'Não é possível alcançar o modelo gratuito',
    body: 'Entre com uma conta Nous, é grátis, ou confira a configuração NOUS_INFERENCE_BASE_URL.'
  },
  free_tier_outage: {
    title: 'O modelo gratuito está com problemas',
    body: 'Tente enviar sua mensagem de novo em um minuto.'
  },
  free_tier_refused: {
    title: 'Entre para continuar conversando',
    body: 'Entrar com uma conta Nous é grátis.'
  },
  usage_window: {
    title: 'Uso incluído esgotado',
    body: 'O uso incluído no seu plano acabou até a próxima renovação. Adicione créditos em /topup para continuar.'
  }
}
