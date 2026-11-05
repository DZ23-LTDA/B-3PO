/**
 * Sofia no renderer (r21 do GOAL V2).
 *
 * O grafo chega PRONTO do processo principal: `grafo`, `prontas` e `profundidade`. Este wrapper não
 * recalcula nada — recalcular aqui criaria uma segunda topologia, e as duas divergiriam no primeiro
 * plano com ciclo.
 *
 * O preload expõe `window.hermesDesktop`, não `window.hermes`. A r99 confundiu os dois e o canal parecia
 * inexistente; o tipo do bridge é declarado aqui para o erro ser de compilação, não de runtime.
 */

export interface SofiaTarefaRow {
  agente_id: null | string
  depende_de: string[]
  erro: null | string
  execucao_id: null | string
  resultado: null | unknown
  status: 'bloqueada' | 'concluida' | 'executando' | 'falhou' | 'pendente' | 'pronta'
  tarefa_id: string
  titulo: string
}

export interface SofiaGrafo {
  ciclos: string[][]
  dependencias_orfas: { depende_de: string; tarefa_id: string }[]
  valido: boolean
}

export interface PlanoComGrafo {
  aprovacao: null | { em: number; por: string }
  atualizado_em: number
  criado_em: number
  escopo: 'organizacao' | 'projeto' | 'trabalho_pontual'
  grafo: SofiaGrafo
  objetivo: string
  plano_id: string
  profundidade: null | number
  prontas: string[]
  status: 'aguardando_aprovacao' | 'cancelado' | 'concluido' | 'executando' | 'falhou' | 'rascunho'
  tarefas: SofiaTarefaRow[]
  tenant_id: string
}

type Resposta = { error: string } | Record<string, unknown>

interface Bridge {
  aprovar: (payload: Record<string, unknown>) => Promise<Resposta>
  criar: (payload: Record<string, unknown>) => Promise<Resposta>
  plano: (planoId: string) => Promise<Resposta>
  planos: () => Promise<Resposta>
  status: (payload: Record<string, unknown>) => Promise<Resposta>
  tarefa: (payload: Record<string, unknown>) => Promise<Resposta>
}

/** As seis operações, nomeadas como os canais. `chamarSofia` evita seis funções quase idênticas. */
export type OperacaoSofia = 'aprovar' | 'criar' | 'plano' | 'planos' | 'status' | 'tarefa'

function bridge(): Bridge | null {
  return (globalThis as { hermesDesktop?: { sofia?: Bridge } }).hermesDesktop?.sofia ?? null
}

export function sofiaDisponivel(): boolean {
  return bridge() !== null
}

/**
 * Chama um canal de Sofia.
 *
 * Devolve `null` quando o bridge não existe — o renderer roda em teste e em webview sem preload, e nesses
 * casos a resposta certa é "não há produto aqui", não uma exceção.
 */
export async function chamarSofia(operacao: OperacaoSofia, arg: unknown): Promise<null | Resposta> {
  const api = bridge()

  if (!api) return null

  switch (operacao) {
    case 'planos':
      return api.planos()
    case 'plano':
      return api.plano(typeof arg === 'string' ? arg : '')
    default:
      return api[operacao]((arg ?? {}) as Record<string, unknown>)
  }
}
