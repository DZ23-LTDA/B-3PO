// Visão do roster para a camada IPC (rodada 146).
//
// POR QUE UM MÓDULO SEPARADO
//
// `agent-roster.ts` é o domínio: os onze agentes e o que cada um pode. Este arquivo é a **apresentação** desse
// domínio para a tela — nome legível, limites por agente. Misturar os dois faria o domínio carregar texto de
// interface, e o dia em que o texto mudasse mexeria na regra.

import type { LimitesAgente } from './agent-limits'
import { AGENTES as ROSTER, type AgenteDepartamental } from './agent-roster'

/** Nome legível por id. Fica fora do domínio porque é rótulo, não regra. */
export const NOMES: Readonly<Record<string, string>> = {
  after_sales: 'Pós-venda',
  analytics: 'Análise',
  business_manager: 'Gerente de Negócio',
  finance: 'Financeiro',
  hr: 'RH',
  inventory: 'Estoque',
  marketing: 'Marketing',
  operations: 'Operações',
  sales: 'Vendas',
  scheduling: 'Agenda',
  support: 'Atendimento'
}

/**
 * Limites por agente.
 *
 * Apenas o Gerente de Negócio pode delegar: ele é quem coordena os outros. Um especialista que delegasse
 * abriria a segunda camada de profundidade e a cadeia cresceria sem que ninguém tivesse pedido.
 */
export const LIMITES_POR_AGENTE: Readonly<Record<string, LimitesAgente>> = {
  business_manager: { concorrencia: 2, duracao_ms: 10 * 60_000, profundidade: 1, retries: 2 }
}

/** O roster com o nome pronto para a tela. `AgenteDepartamental` já carrega `nome`; este mapa é a fonte dele. */
export const AGENTES: readonly AgenteDepartamental[] = ROSTER.map(a => ({
  ...a,
  nome: NOMES[a.id] ?? a.nome
}))
