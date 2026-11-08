import type { Translations } from './types'

/**
 * pt-BR dos rótulos de opções de modelo do shell (esforço de raciocínio, velocidade, daybreak).
 *
 * Em módulo próprio porque `pt.ts` está grande; lá entra como `modelOptions: ptModelOptions`.
 */
export const ptModelOptions: Translations['shell']['modelOptions'] = {
  noOptions: 'Sem opções para este modelo',
  options: 'Opções',
  thinking: 'Raciocínio',
  fast: 'Rápido',
  ultrafast: 'Ultra-rápido',
  useStandardSpeed: 'Usar velocidade padrão',
  effort: 'Esforço',
  minimal: 'Mínimo',
  low: 'Baixo',
  medium: 'Médio',
  high: 'Alto',
  xhigh: 'Muito alto',
  max: 'Máximo',
  ultra: 'Ultra',
  sendsOnRoute: (level: string) => `envia ${level} nesta rota`,
  updateFailed: 'Falha ao atualizar a opção do modelo',
  fastFailed: 'Falha ao atualizar o modo rápido',
  daybreak: 'Daybreak',
  daybreakFailed: 'Falha ao atualizar o Daybreak'
}
