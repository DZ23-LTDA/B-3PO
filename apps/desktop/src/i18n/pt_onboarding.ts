import type { Translations } from './types'

/** pt-BR da tela de configuração inicial (conectar um provedor e começar). */
export const ptOnboarding: Translations['onboarding'] = {
  headerTitle: 'Vamos configurar o B-3PO para você',
  headerDesc: 'Conecte um provedor de modelos para começar a conversar. Quase todas as opções são um clique.',
  preparingInstall: 'O Hermes está terminando a instalação. Na primeira execução isso costuma levar menos de um minuto.',
  starting: 'Iniciando o Hermes…',
  setupSlowTitle: 'A configuração está demorando mais que o normal.',
  setupSlowBody: 'O Hermes ainda está iniciando em segundo plano.',
  continueWithoutSetup: 'Continuar sem configurar',
  lookingUpProviders: 'Procurando provedores...',
  collapse: 'Recolher',
  otherProviders: 'Outros provedores',
  haveApiKey: 'Tenho uma chave de API',
  chooseLater: 'Escolho um provedor depois',
  recommended: 'Recomendado',
  connected: 'Conectado',
  featuredPitch: 'Uma assinatura, mais de 300 modelos de ponta — o jeito recomendado de rodar o Hermes',
  fireworksPitch: 'API de modelos direta — modelos de ponta hospedados pela Fireworks',
  localModelsTitle: 'Rodar modelos localmente',
  localModelsPitch: 'Sem conta — baixe um modelo e rode nesta máquina',
  openRouterPitch: 'Uma chave, centenas de modelos — um bom padrão',
  apiKeyOptions: {
    fireworks: {
      short: 'API de modelos direta',
      description: 'Acesso direto aos modelos hospedados pela Fireworks AI.'
    },
    openrouter: {
      short: 'uma chave, muitos modelos',
      description: 'Hospeda centenas de modelos atrás de uma única chave. Bom padrão para instalações novas.'
    },
    openai: { short: 'modelos classe GPT', description: 'Acesso direto aos modelos da OpenAI.' },
    gemini: { short: 'modelos Gemini', description: 'Acesso direto aos modelos do Google Gemini.' },
    xai: { short: 'modelos Grok', description: 'Acesso direto aos modelos Grok da xAI.' },
    local: {
      short: 'auto-hospedado',
      description: 'Aponte o Hermes para um endpoint compatível com OpenAI local ou auto-hospedado (vLLM, llama.cpp, Ollama etc).'
    }
  },
  backToSignIn: 'Voltar para o login',
  getKey: 'Obter uma chave',
  replaceCurrent: 'Substituir o valor atual',
  pasteApiKey: 'Cole a chave de API',
  localApiKeyPlaceholder: 'Chave de API (opcional — só se seu endpoint exigir)',
  localModelNamePlaceholder: 'Nome do modelo (ex.: command-a-plus-05-2026)',
  couldNotSave: 'Não foi possível salvar a credencial.',
  connecting: 'Conectando',
  update: 'Atualizar',
  flowSubtitles: {
    pkce: 'Abre seu navegador para entrar e continua aqui',
    device_code: 'Abre uma página de verificação no navegador — o Hermes se conecta sozinho',
    external: 'Entre uma vez no seu terminal e volte para conversar'
  },
  startingSignIn: provider => `Iniciando o login no ${provider}...`,
  verifyingCode: provider => `Verificando seu código com o ${provider}...`,
  connectedProvider: provider => `${provider} conectado`,
  connectedPicking: provider => `${provider} conectado. Escolhendo um modelo padrão...`,
  signInFailed: 'O login falhou. Tente de novo.',
  signInExpired:
    'A página de login expirou antes de você terminar. Tente de novo e conclua a etapa no navegador em poucos minutos, ou use uma chave de API.',
  signInDidNotFinish: provider =>
    `O login no ${provider} não terminou. Verifique sua conexão e tente de novo, ou escolha outro provedor.`,
  tryAgain: 'Tentar de novo',
  useApiKeyInstead: 'Usar uma chave de API',
  errorDetails: 'Detalhes',
  pickDifferentProvider: 'Escolher outro provedor',
  signInWith: provider => `Entrar com ${provider}`,
  openedBrowser: provider => `Abrimos o ${provider} no seu navegador.`,
  authorizeThere: 'Autorize o Hermes lá.',
  copyAuthCode: 'Copie o código de autorização e cole abaixo.',
  pasteAuthCode: 'Cole o código de autorização',
  reopenAuthPage: 'Reabrir a página de autorização',
  waitingAuthorize: 'Esperando você autorizar...',
  externalPending: provider =>
    `O ${provider} entra pelo próprio CLI. Rode este comando num terminal, volte e escolha "Já entrei":`,
  signedIn: 'Já entrei',
  deviceCodeOpened: provider => `Abrimos o ${provider} no seu navegador. Informe este código lá:`,
  reopenVerification: 'Reabrir a página de verificação',
  copy: 'Copiar',
  defaultModel: 'Modelo padrão',
  freeTier: 'Nível gratuito',
  pro: 'Pro',
  free: 'Grátis',
  price: (input, output) => `${input} entrada / ${output} saída por Mtok`,
  change: 'Alterar',
  startChatting: 'Começar',
  docs: provider => `Docs do ${provider}`
}
