import type { FirstRunCopy } from './types_first_run'

/** pt-BR do assistente de primeira execução. */
export const ptFirstRun: FirstRunCopy = {
  beats: {
    name: 'Nome',
    theme: 'Cor de destaque',
    layout: 'Layout',
    connectors: 'Aplicativos',
    plugins: 'Plugins',
    tour: 'Tour',
    build: 'Primeira tarefa'
  },
  namePlaceholder: 'Seu nome',
  useName: name => `Usar “${name}”`,
  install: 'Instalar',
  installed: 'Instalado',
  loading: 'Carregando…',
  noPlugins: 'Nenhum plugin para mostrar agora.',
  noneChosen: 'Nenhum',
  noAnswer: 'Sem resposta',
  answerRefused: 'Resposta não aceita',
  tours: {
    quick: 'Tour rápido',
    full: 'Mostre tudo',
    skip: 'Pular, vamos construir algo'
  },
  skippedAll: 'Configuração inicial pulada',
  skip: 'Pular configuração',
  skipTip: 'Encerra a configuração guiada e abre uma conversa nova.',
  skipFailed: 'Não foi possível pular a configuração',
  slashOffTitle: 'Comandos de barra ficam desligados durante a configuração',
  slashOffBody: 'Eles funcionam normalmente assim que a configuração terminar.',
  localModel: {
    title: 'Este computador consegue rodar um modelo localmente',
    text: (model, size) =>
      `${model} (${size}) cabe no seu hardware. Roda de graça, e suas conversas ficam neste computador.`,
    setUp: 'Configurar',
    notNow: 'Agora não'
  },
  intro: {
    greeting: 'Olá, eu sou o B-3PO.',
    plan: 'Vamos preparar tudo para você. Depois fazemos algo legal de verdade.'
  },
  rerun: {
    title: 'Rodar a configuração inicial de novo',
    description: 'Abre uma conversa de configuração nova que percorre as etapas iniciais com o seu modelo atual.',
    action: 'Rodar de novo',
    failed: 'Não foi possível iniciar a configuração'
  }
}
