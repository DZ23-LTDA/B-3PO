/**
 * Prontidão dos conectores de plataforma do gateway (r15 do V5).
 *
 * POR QUE ESTA CAMADA EXISTE
 *
 * `gateway/connector_readiness.py` calcula um estado honesto — `ready` significa **apto a conectar
 * quando o gateway subir**, nunca "conectado" — e não tinha consumidor nenhum. A r14 do V5 expôs
 * `GET /api/connectors/readiness`; esta camada é o cliente dele.
 *
 * O QUE ESTA CAMADA NÃO FAZ
 *
 * Não infere, não soma, não transforma ausência em zero. Se a leitura falhar, o estado é `erro` e a
 * tela mostra isso — a mesma regra que a home V4 usa (`null` vira `—`, nunca `0`).
 */
import { hermesApi, profileScoped } from './client'

/** Os cinco estados do backend. Não há "conectado": o gateway não expõe socket vivo por aqui. */
export type EstadoDoConector =
  | 'ready'
  | 'missing_credential'
  | 'deps_missing'
  | 'not_configured'
  | 'unknown_platform'

export interface ConectorProntidao {
  platform: string
  /** Nomes de variáveis ausentes. Nunca valores. */
  missing_env: string[]
  /** A ação concreta, escrita pelo backend para quem opera. */
  next_action: string
  required_env: string[]
  status: EstadoDoConector
}

export interface ResumoDeProntidao {
  /** Nomes de variáveis ausentes em qualquer conector — deduplicados pelo backend. */
  credenciais_faltando: string[]
  por_status: Partial<Record<EstadoDoConector, number>>
  /** Quantos estão `ready`. Não significa "conectados". */
  prontos: number
  total: number
}

export interface ProntidaoDosConectores {
  connectors: ConectorProntidao[]
  resumo: ResumoDeProntidao
}

export type CargaDeProntidao =
  | { estado: 'erro'; erro: string }
  | { estado: 'ok'; prontidao: ProntidaoDosConectores }

/**
 * Lê a prontidão de todos os conectores.
 *
 * **Distingue falha de lista vazia**: uma leitura que falhou não vira "nenhum conector", porque isso
 * afirmaria que o produto não tem conectores — e ele tem a plataforma que o plugin registrou.
 */
export async function lerProntidaoDosConectores(): Promise<CargaDeProntidao> {
  try {
    const prontidao = await hermesApi<ProntidaoDosConectores>({
      ...profileScoped(),
      path: '/api/connectors/readiness'
    })

    // A resposta sem as duas chaves não é prontidão: é uma rota errada ou uma versão antiga.
    if (!Array.isArray(prontidao?.connectors) || !prontidao?.resumo) {
      return { erro: 'resposta_sem_prontidao', estado: 'erro' }
    }

    return { estado: 'ok', prontidao }
  } catch (error) {
    return { erro: error instanceof Error ? error.message : String(error), estado: 'erro' }
  }
}

/** Texto curto para o selo de cada conector. `ready` **não** é "conectado". */
export function rotuloDoEstado(status: EstadoDoConector): string {
  switch (status) {
    case 'ready':
      return 'Pronto para conectar'
    case 'missing_credential':
      return 'Falta credencial'
    case 'deps_missing':
      return 'Falta dependência'
    case 'not_configured':
      return 'Não configurado'
    case 'unknown_platform':
      return 'Plataforma desconhecida'
  }
}
