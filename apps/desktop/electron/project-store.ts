// O store de projetos (r77 do GOAL V2).
//
// A r76 criou a REGRA. Este arquivo a guarda — e é o que faz o plano **sobreviver ao reinício**.
//
// POR QUE ELE É O "PLANO PERSISTENTE" DO §12
//
// Uma tarefa sem projeto é um afazer. Um projeto é o que diz **por que** as tarefas existem, **até quando**,
// **com quanto** e **como saber que terminou**.
//
// Enquanto isso vivia só em memória, fechar o app apagava o motivo.
//
// O QUE ELE **NÃO** FAZ
//
// **Não guarda as tarefas.** Elas são da `sofia-store` (r17), referenciadas pelo projeto. Duplicar criaria
// duas verdades sobre o mesmo trabalho — o erro que a r39 corrigiu na conferência de compras.
//
// **Não valida o grafo.** Isso é `podeIniciar` (r76), que **recebe** as tarefas. Um store que buscasse a
// `sofia-store` para validar juntaria duas donas de dado no mesmo lugar.

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import {
  isProjetoStatus,
  mudarProjeto,
  normalizarProjeto,
  podeIniciar,
  type Projeto,
  type ProjetoStatus
} from './project'
import type { NoDoGrafo } from './sofia-grafo'
import { INSTALLATION_TENANT } from './server-tenant'
import { WriteQueue } from './write-queue'

export interface ProjectStoreFile {
  projetos: Projeto[]
  schema_version: 1
}

export function projectStorePath(userDataDir: string): string {
  return join(userDataDir, 'b3po', 'projetos.json')
}

function vazio(): ProjectStoreFile {
  return { projetos: [], schema_version: 1 }
}

/**
 * Lê o arquivo.
 *
 * Projeto malformado é descartado — e **projeto sem objetivo é descartado em especial**: ele quebraria a
 * regra que dá sentido ao tipo, e um objeto que não é um projeto não deve entrar na lista de projetos.
 */
export function parseProjectStore(raw: string): ProjectStoreFile {
  try {
    const parsed = JSON.parse(raw) as Partial<ProjectStoreFile>

    if (!parsed || !Array.isArray(parsed.projetos)) return vazio()

    const projetos = parsed.projetos.filter(
      (p): p is Projeto =>
        !!p &&
        typeof p === 'object' &&
        typeof p.id === 'string' &&
        typeof p.nome === 'string' &&
        typeof p.objetivo === 'string' &&
        p.objetivo.trim().length > 0 &&
        isProjetoStatus(p.status) &&
        Array.isArray(p.criterios)
    )

    return { projetos, schema_version: 1 }
  } catch {
    return vazio()
  }
}

export class ProjectStore {
  private readonly fila = new WriteQueue()

  constructor(private readonly file: string) {}

  private async carregar(): Promise<ProjectStoreFile> {
    try {
      return parseProjectStore(await readFile(this.file, 'utf8'))
    } catch {
      return vazio()
    }
  }

  private async gravar(estado: ProjectStoreFile): Promise<void> {
    const temporario = `${this.file}.${process.pid}.tmp`

    await mkdir(dirname(this.file), { recursive: true })
    await writeFile(temporario, JSON.stringify(estado, null, 2), 'utf8')
    await rename(temporario, this.file)
  }

  async listar(tenantId: string = INSTALLATION_TENANT): Promise<Projeto[]> {
    const estado = await this.carregar()

    return estado.projetos.filter(p => p.tenant_id === tenantId).sort((a, b) => b.created_at - a.created_at)
  }

  async porId(id: string): Promise<Projeto | null> {
    return (await this.carregar()).projetos.find(p => p.id === id) ?? null
  }

  /** Os que estão em andamento. Rascunho não conta: ninguém começou. */
  async ativos(tenantId: string = INSTALLATION_TENANT): Promise<Projeto[]> {
    return (await this.listar(tenantId)).filter(p => p.status === 'ativo')
  }

  async criar(
    input: unknown,
    tenantId: string = INSTALLATION_TENANT,
    agora: number = Date.now(),
    id?: string
  ): Promise<{ error: string } | { projeto: Projeto; projetos: Projeto[] }> {
    return this.fila.serializar(async () => {
      const estado = await this.carregar()
      const identidade = id ?? `proj-${estado.projetos.length + 1}-${agora}`
      const normalizada = normalizarProjeto(input, { agora, id: identidade, tenant_id: tenantId })

      if ('error' in normalizada) return { error: normalizada.error }

      // Nome repetido não é recusado: duas frentes com o mesmo nome são comuns ("Site"), e o id é o que
      // identifica. Recusar obrigaria a inventar sufixos que ninguém lembra depois.
      estado.projetos.push(normalizada.projeto)
      await this.gravar(estado)

      return { projeto: normalizada.projeto, projetos: await this.listar(tenantId) }
    })
  }

  async mudar(
    input: unknown,
    agora: number = Date.now()
  ): Promise<{ error: string } | { projeto: Projeto; projetos: Projeto[] }> {
    const raw = (input ?? {}) as Record<string, unknown>
    const id = typeof raw['id'] === 'string' ? raw['id'] : ''

    if (!id) return { error: 'projeto_obrigatorio' }
    if (!isProjetoStatus(raw['status'])) return { error: 'status_invalido' }

    const novo = raw['status'] as ProjetoStatus

    return this.fila.serializar(async () => {
      const estado = await this.carregar()
      const indice = estado.projetos.findIndex(p => p.id === id)

      if (indice < 0) return { error: 'projeto_inexistente' }

      const atual = estado.projetos[indice] as Projeto
      const r = mudarProjeto(atual, novo, agora)

      if ('error' in r) return { error: r.error }

      estado.projetos[indice] = r.projeto
      await this.gravar(estado)

      return { projeto: r.projeto, projetos: await this.listar(atual.tenant_id) }
    })
  }

  /**
   * Pode começar? — a pergunta que o painel faz, delegando ao grafo.
   *
   * Recebe as tarefas **de fora**: o store não conhece a `sofia-store`.
   */
  async podeIniciar(
    id: string,
    tarefas: readonly NoDoGrafo[]
  ): Promise<{ error: 'projeto_inexistente' } | ReturnType<typeof podeIniciar>> {
    const projeto = await this.porId(id)

    if (!projeto) return { error: 'projeto_inexistente' }

    return podeIniciar(projeto, tarefas)
  }
}
