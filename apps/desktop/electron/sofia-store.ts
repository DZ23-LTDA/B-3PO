// Planos e tarefas da camada de coordenação (Sofia) — r17 do GOAL V2.
//
// O CONTRATO ESTÁ EM docs/b3po/SOFIA-ORCHESTRATION-SPEC.md E docs/b3po/adr/ADR-001-SOFIA.md.
// Este arquivo cumpre o primeiro dos cinco passos que a spec lista:
//
//   1. sofia-store.ts        ← este arquivo
//   2. grafo de dependência
//   3. sofia-ipc.ts          (canais COM guarda desde o primeiro commit)
//   4. ponte com agent-execution-store
//   5. tela
//
// O QUE ESTE STORE É, E O QUE ELE NÃO É
//
// Ele guarda o **plano**: objetivo, escopo, tarefas e a ligação para a execução. Não guarda transcript,
// não guarda sessão, não guarda resultado de agente — o `execucao_id` de cada tarefa **aponta** para o
// `agent-execution-store`, que é o dono desse dado.
//
// Guardar uma cópia do status da execução aqui criaria duas verdades que podem divergir. O status da
// tarefa é sobre o **plano** (`pendente`, `pronta`, `executando`, `concluida`); o status da execução é
// do runtime. São coisas diferentes e ficam em lugares diferentes.
//
// O GRAFO NÃO É ARMAZENADO COMO ORDEM
//
// `depende_de` é a única representação de precedência. A ordem de execução é **derivada** por ordenação
// topológica — nunca gravada. Gravar a ordem criaria uma segunda verdade que ninguém atualiza quando
// uma dependência muda.

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { INSTALLATION_TENANT } from './server-tenant'
import { WriteQueue } from './write-queue'

const TITULO_MAX = 200
const OBJETIVO_MAX = 2000
const ID_MAX = 120

/** O alcance do plano. A spec (§4) fixa três, e o produto não deve inventar um quarto sem ADR. */
export const SOFIA_ESCOPOS = ['organizacao', 'projeto', 'trabalho_pontual'] as const
export type SofiaEscopo = (typeof SOFIA_ESCOPOS)[number]

/** Estado do plano como um todo. */
export const SOFIA_PLANO_STATUS = [
  'rascunho',
  'aguardando_aprovacao',
  'executando',
  'concluido',
  'falhou',
  'cancelado'
] as const
export type SofiaPlanoStatus = (typeof SOFIA_PLANO_STATUS)[number]

/** Estado de uma tarefa. `pronta` = dependências satisfeitas, pode ser delegada. */
export const SOFIA_TAREFA_STATUS = [
  'pendente',
  'pronta',
  'executando',
  'concluida',
  'falhou',
  'bloqueada'
] as const
export type SofiaTarefaStatus = (typeof SOFIA_TAREFA_STATUS)[number]

export interface SofiaTarefa {
  /** Agente que vai executar. `null` = a designar. */
  agente_id: null | string
  /** Ids de tarefas que precisam terminar antes. Única representação de precedência. */
  depende_de: string[]
  /** Ligação com `agent-execution-store`. `null` até a delegação acontecer. */
  execucao_id: null | string
  erro: null | string
  /** Resultado da execução. Cópia do que o runtime devolveu, não uma reavaliação. */
  resultado: null | unknown
  status: SofiaTarefaStatus
  tarefa_id: string
  titulo: string
}

export interface SofiaPlano {
  aprovacao: null | { em: number; por: string }
  ator_id: string
  criado_em: number
  escopo: SofiaEscopo
  objetivo: string
  plano_id: string
  status: SofiaPlanoStatus
  tarefas: SofiaTarefa[]
  tenant_id: string
  atualizado_em: number
}

export interface SofiaFile {
  planos: SofiaPlano[]
  schema_version: 1
}

export function sofiaStorePath(userDataDir: string): string {
  return join(userDataDir, 'b3po', 'sofia-planos.json')
}

function texto(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function herdado(value: unknown, anterior: string | undefined): string {
  const novo = texto(value)

  return novo || anterior || ''
}

function escopoDe(value: unknown): SofiaEscopo {
  return SOFIA_ESCOPOS.includes(value as SofiaEscopo) ? (value as SofiaEscopo) : 'trabalho_pontual'
}

function statusDePlano(value: unknown): SofiaPlanoStatus {
  return SOFIA_PLANO_STATUS.includes(value as SofiaPlanoStatus) ? (value as SofiaPlanoStatus) : 'rascunho'
}

function statusDeTarefa(value: unknown): SofiaTarefaStatus {
  return SOFIA_TAREFA_STATUS.includes(value as SofiaTarefaStatus) ? (value as SofiaTarefaStatus) : 'pendente'
}

export function parseSofia(raw: string): SofiaFile {
  try {
    const parsed = JSON.parse(raw) as Partial<SofiaFile>

    if (!parsed || !Array.isArray(parsed.planos)) return { planos: [], schema_version: 1 }

    return {
      planos: parsed.planos.filter(
        p => p && typeof p === 'object' && typeof p.plano_id === 'string' && Array.isArray(p.tarefas)
      ),
      schema_version: 1
    }
  } catch {
    return { planos: [], schema_version: 1 }
  }
}

/**
 * Uma tarefa do grafo, normalizada.
 *
 * `depende_de` **não** é validado aqui contra a existência das outras tarefas: um plano pode ser escrito
 * em partes, e a validação de integridade do grafo é do passo 2 da spec (`grafo de dependência`), que é
 * uma função pura sobre o plano completo. Este store aceita e devolve o que foi gravado.
 */
function normalizarTarefa(raw: unknown, existente?: SofiaTarefa): SofiaTarefa {
  const input = (raw ?? {}) as Record<string, unknown>
  const deps = Array.isArray(input['depende_de']) ? input['depende_de'] : (existente?.depende_de ?? [])

  return {
    agente_id: typeof input['agente_id'] === 'string' ? input['agente_id'].slice(0, ID_MAX) : (existente?.agente_id ?? null),
    depende_de: deps.filter((d): d is string => typeof d === 'string' && d !== '').map(d => d.slice(0, ID_MAX)),
    execucao_id:
      typeof input['execucao_id'] === 'string' ? input['execucao_id'].slice(0, ID_MAX) : (existente?.execucao_id ?? null),
    erro: input['erro'] === undefined ? (existente?.erro ?? null) : texto(input['erro']) || null,
    resultado: input['resultado'] === undefined ? (existente?.resultado ?? null) : input['resultado'],
    status: input['status'] === undefined ? (existente?.status ?? 'pendente') : statusDeTarefa(input['status']),
    tarefa_id: existente?.tarefa_id ?? texto(input['tarefa_id']).slice(0, ID_MAX),
    titulo: herdado(input['titulo'], existente?.titulo).slice(0, TITULO_MAX)
  }
}

export type SofiaRecusa = { error: string }

/** Recusas da criação — nomeadas, nunca um "erro" genérico. */
function recusaDePlano(objetivo: string, escopoOk: boolean): string | null {
  if (!objetivo) return 'objetivo_obrigatorio'
  if (!escopoOk) return 'escopo_invalido'

  return null
}

/**
 * Store dos planos.
 *
 * Fila de escrita como os outros 25 stores: dois `salvar` concorrentes não podem perder um plano.
 */
export class SofiaStore {
  private readonly fila = new WriteQueue()
  private readonly file: string

  constructor(file: string) {
    this.file = file
  }

  private async carregar(): Promise<SofiaFile> {
    try {
      return parseSofia(await readFile(this.file, 'utf8'))
    } catch {
      return { planos: [], schema_version: 1 }
    }
  }

  private async gravar(conteudo: SofiaFile): Promise<void> {
    await mkdir(dirname(this.file), { recursive: true })

    const temp = `${this.file}.${process.pid}.tmp`

    await writeFile(temp, JSON.stringify(conteudo, null, 2), 'utf8')
    await rename(temp, this.file)
  }

  async listar(filtro: { tenant_id?: string } = {}): Promise<SofiaPlano[]> {
    const conteudo = await this.carregar()

    return conteudo.planos
      .filter(p => (filtro.tenant_id ? p.tenant_id === filtro.tenant_id : true))
      .sort((a, b) => b.criado_em - a.criado_em)
  }

  async obter(planoId: string): Promise<SofiaPlano | null> {
    const conteudo = await this.carregar()

    return conteudo.planos.find(p => p.plano_id === planoId) ?? null
  }

  /**
   * Cria o plano. Recusa nomeada quando falta objetivo ou o escopo não é um dos três.
   *
   * `ator_id` é obrigatório: um plano sem responsável não tem a quem pedir aprovação nem a quem
   * atribuir a prestação de contas.
   */
  async criar(input: unknown, agora: number = Date.now()): Promise<SofiaRecusa | { plano: SofiaPlano }> {
    const raw = (input ?? {}) as Record<string, unknown>
    const objetivo = texto(raw['objetivo']).slice(0, OBJETIVO_MAX)
    const escopoOk = SOFIA_ESCOPOS.includes(raw['escopo'] as SofiaEscopo)
    const recusa = recusaDePlano(objetivo, escopoOk)

    if (recusa) return { error: recusa }

    const ator = texto(raw['ator_id']).slice(0, ID_MAX)

    if (!ator) return { error: 'ator_obrigatorio' }

    const tarefas = Array.isArray(raw['tarefas'])
      ? raw['tarefas'].map(t => normalizarTarefa(t)).filter(t => t.tarefa_id !== '')
      : []

    // Ids duplicados dentro do mesmo plano tornariam o grafo ambíguo: duas tarefas com o mesmo id não
    // têm "qual delas" uma dependência aponta.
    if (new Set(tarefas.map(t => t.tarefa_id)).size !== tarefas.length) {
      return { error: 'tarefa_duplicada' }
    }

    const plano: SofiaPlano = {
      aprovacao: null,
      ator_id: ator,
      criado_em: agora,
      escopo: escopoDe(raw['escopo']),
      objetivo,
      plano_id: texto(raw['plano_id']).slice(0, ID_MAX) || `plano-${agora.toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`,
      status: statusDePlano(raw['status'] ?? 'rascunho'),
      tarefas,
      tenant_id: texto(raw['tenant_id']) || INSTALLATION_TENANT,
      atualizado_em: agora
    }

    await this.fila.serializar(async () => {
      const conteudo = await this.carregar()

      conteudo.planos.push(plano)
      await this.gravar(conteudo)
    })

    return { plano }
  }

  /**
   * Atualiza o status de uma tarefa e/ou a ligação com a execução.
   *
   * Não muda `resultado` a não ser que ele venha no patch: o resultado é do runtime, e este store não
   * inventa um.
   */
  async atualizarTarefa(
    planoId: string,
    tarefaId: string,
    patch: unknown,
    agora: number = Date.now()
  ): Promise<SofiaRecusa | { plano: SofiaPlano }> {
    return this.fila.serializar(async () => {
      const conteudo = await this.carregar()
      const plano = conteudo.planos.find(p => p.plano_id === planoId)

      if (!plano) return { error: 'plano_inexistente' }

      const indice = plano.tarefas.findIndex(t => t.tarefa_id === tarefaId)

      if (indice < 0) return { error: 'tarefa_inexistente' }

      plano.tarefas[indice] = normalizarTarefa(patch, plano.tarefas[indice])
      plano.atualizado_em = agora

      await this.gravar(conteudo)

      return { plano }
    })
  }

  /** Muda o status do plano. `concluido` só é aceito quando toda tarefa terminou. */
  async definirStatus(
    planoId: string,
    status: unknown,
    agora: number = Date.now()
  ): Promise<SofiaRecusa | { plano: SofiaPlano }> {
    return this.fila.serializar(async () => {
      const conteudo = await this.carregar()
      const plano = conteudo.planos.find(p => p.plano_id === planoId)

      if (!plano) return { error: 'plano_inexistente' }

      const novo = statusDePlano(status)

      // "Concluído" é afirmação sobre o trabalho, não sobre a intenção: um plano com tarefa pendente
      // não terminou, e aceitar isso faria a prestação de contas mentir.
      if (novo === 'concluido' && plano.tarefas.some(t => t.status !== 'concluida')) {
        return { error: 'tarefas_pendentes' }
      }

      plano.status = novo
      plano.atualizado_em = agora

      await this.gravar(conteudo)

      return { plano }
    })
  }

  /** Registra a aprovação humana. Não existe autoaprovação: `por` tem de ser um ator distinto. */
  async aprovar(
    planoId: string,
    por: string,
    agora: number = Date.now()
  ): Promise<SofiaRecusa | { plano: SofiaPlano }> {
    return this.fila.serializar(async () => {
      const conteudo = await this.carregar()
      const plano = conteudo.planos.find(p => p.plano_id === planoId)

      if (!plano) return { error: 'plano_inexistente' }
      if (!texto(por)) return { error: 'aprovador_obrigatorio' }
      if (plano.ator_id === por) return { error: 'autoaprovacao' }

      plano.aprovacao = { em: agora, por: texto(por) }
      plano.atualizado_em = agora

      if (plano.status === 'aguardando_aprovacao') plano.status = 'executando'

      await this.gravar(conteudo)

      return { plano }
    })
  }
}

export async function openSofiaStore(userDataDir: string): Promise<SofiaStore> {
  return new SofiaStore(sofiaStorePath(userDataDir))
}
