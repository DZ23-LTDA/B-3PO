import type { Translations } from './types'

/** pt-BR do consentimento de métricas de uso (só contagens, nunca conteúdo). */
export const ptSharedMetrics: Translations['sharedMetrics'] = {
  consentTitle: 'Compartilhar estatísticas de uso?',
  dialogTitle: 'Estatísticas de uso',
  consentBody:
    'O B-3PO pode contar como você o usa: duração da sessão, quais modelos e ferramentas rodam e quando algo falha. Ele nunca registra suas mensagens, arquivos, caminhos ou texto de erro.',
  whatIsCollected: 'O que é contado',
  collectedActivity: 'Sessões: duração, resultado, tipo de erro, tempo ativo por dia',
  collectedModels: 'Modelos: quais foram, total de tokens',
  collectedNames: 'Recursos: ferramentas embutidas, comandos, áreas do app e configurações usadas ou desligadas',
  collectedMilestones: 'Configuração inicial: etapas concluídas, conexões de provedor, quantas skills, plugins e agendamentos',
  collectedReliability: 'Saúde do app: travamentos, velocidade de início e de resposta, atualizações, conexões de mensageria',
  collectedUsage: 'Qualidade do agente: edições perdidas, chamadas de ferramenta quebradas, laços travados, custo por tarefa',
  collectedMachine: 'Máquina: sistema, faixa de RAM, tipo de GPU, versão do B-3PO, uso de modelo local',
  sending:
    'Se você compartilhar, o B-3PO envia estatísticas anônimas uma vez por dia com um id aleatório deste perfil. Fora um aviso único de que o Hermes foi instalado, estatísticas anteriores ao seu consentimento nunca são enviadas. Dá para mudar a qualquer momento nas Configurações.',
  readDocs: 'Ler os detalhes completos',
  share: 'Compartilhar anonimamente',
  off: 'Não, obrigado',
  saveFailed: 'Não foi possível salvar sua escolha',
  sendLabel: 'Compartilhar estatísticas de uso anônimas',
  sendDesc:
    'Somente contagens, enviadas uma vez por dia com um id aleatório deste perfil. Nunca suas mensagens, arquivos, caminhos ou texto de erro.',
  unavailable: 'Atualize o backend do B-3PO para mudar esta opção.',
  stripBody: 'Somente contagens. Nunca suas mensagens ou arquivos.',
  stripReaskBody: 'Perguntando de novo: uma versão anterior podia salvar "Não, obrigado" antes de você ver isto.',
  stripChoices: { share: 'Compartilhar anonimamente', off: 'Não, obrigado' },
  stripDetails: 'Detalhes'
}
