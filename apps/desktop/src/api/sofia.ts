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
  delegar: (payload: Record<string, unknown>) => Promise<Resposta>
  execucaoVinculada: (payload: Record<string, unknown>) => Promise<Resposta>
  plano: (planoId: string) => Promise<Resposta>
  planos: () => Promise<Resposta>
  status: (payload: Record<string, unknown>) => Promise<Resposta>
  tarefa: (payload: Record<string, unknown>) => Promise<Resposta>
}

/** As seis operações, nomeadas como os canais. `chamarSofia` evita seis funções quase idênticas. */
export type OperacaoSofia = 'aprovar' | 'criar' | 'delegar' | 'execucaoVinculada' | 'plano' | 'planos' | 'status' | 'tarefa'

function bridge(): Bridge | null {
  return (globalThis as { hermesDesktop?: { sofia?: Bridge } }).hermesDesktop?.sofia ?? null
}

/**
 * O resumo de um plano da Sofia, para a home (r2 do V4).
 *
 * **Só o que a lista devolve.** O plano completo (grafo, tarefas, aprovação) vive em `/sofia`; a home
 * não recalcula topologia — `sofia.ts` já diz desde a r21 que recalcular aqui criaria uma segunda
 * verdade que diverge no primeiro plano com ciclo.
 */
export interface PlanoResumo {
  atualizado_em: number
  escopo: string
  objetivo: string
  plano_id: string
  qtdTarefas: number
  status: string
}

export interface CargaDePlanos {
  erro?: string
  estado: 'erro' | 'indisponivel' | 'ok'
  planos: PlanoResumo[]
}

/**
 * A leitura **honesta** dos planos da Sofia.
 *
 * O `status()` da ponte responde `{ error }` nesta versão (medido em 07/11) — por isso existe
 * `estado: 'erro'` separado de lista vazia. Mostrar *"nenhum plano"* quando a leitura falhou é o
 * zero enganoso que a decisão de produto proíbe.
 */
export async function listarPlanosComEstado(): Promise<CargaDePlanos> {
  if (!sofiaDisponivel()) return { estado: 'indisponivel', planos: [] }

  try {
    const r = await chamarSofia('planos', {})

    if (!r) return { estado: 'indisponivel', planos: [] }

    if ('error' in r) return { erro: String((r as { error: string }).error), estado: 'erro', planos: [] }

    const brutos = (r as { planos?: unknown }).planos

    if (!Array.isArray(brutos)) return { estado: 'ok', planos: [] }

    return {
      estado: 'ok',
      planos: brutos.map((x: Record<string, unknown>) => ({
        atualizado_em: Number(x.atualizado_em ?? 0),
        escopo: String(x.escopo ?? ''),
        objetivo: String(x.objetivo ?? ''),
        plano_id: String(x.plano_id ?? ''),
        qtdTarefas: Array.isArray(x.tarefas) ? x.tarefas.length : 0,
        status: String(x.status ?? '')
      }))
    }
  } catch (e) {
    return { erro: e instanceof Error ? e.message : String(e), estado: 'erro', planos: [] }
  }
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
