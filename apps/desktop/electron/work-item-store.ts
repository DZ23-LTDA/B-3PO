// O store de trabalho pontual (r84 do GOAL V2).
//
// A r83 criou a REGRA. Este arquivo a guarda — e a decisão de projeto está em **como a expiração é lida**.
//
// A EXPIRAÇÃO É CALCULADA NA LEITURA, NÃO GRAVADA
//
// `trabalhos.json` guarda `expira_em` — um **instante** — e **nunca** o campo `expirado`. A diferença importa:
//
//   - gravado: alguém precisaria rodar uma varredura para atualizar o arquivo, e um app que não abre há um mês
//     teria dados **errados** até a varredura rodar.
//   - calculado: o arquivo **nunca está errado**. Abrir o app hoje mostra o que venceu hoje.
//
// **Nenhum processo precisa rodar para o dado estar certo** — e isso é o que diferencia um `expira_em` de um
// `expirou`.

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { INSTALLATION_TENANT } from './server-tenant'
import { WriteQueue } from './write-queue'
import {
  emAberto,
  isTrabalhoStatus,
  isTrabalhoTipo,
  mudarTrabalho,
  normalizarTrabalho,
  resumoDosTrabalhos,
  vencidos,
  type TrabalhoPontual,
  type TrabalhoStatus
} from './work-item'

export interface WorkItemStoreFile {
  schema_version: 1
  trabalhos: TrabalhoPontual[]
}

export function workItemStorePath(userDataDir: string): string {
  return join(userDataDir, 'b3po', 'trabalhos.json')
}

function vazio(): WorkItemStoreFile {
  return { schema_version: 1, trabalhos: [] }
}

/**
 * Lê o arquivo.
 *
 * Trabalho malformado é descartado — e **sem `expira_em` ele é descartado em especial**: um trabalho que
 * nunca vence é **um projeto disfarçado**, e deixá-lo entrar faria a lista crescer para sempre, que é
 * exatamente o problema que o tipo existe para resolver.
 */
export function parseWorkItemStore(raw: string): WorkItemStoreFile {
  try {
    const parsed = JSON.parse(raw) as Partial<WorkItemStoreFile>

    if (!parsed || !Array.isArray(parsed.trabalhos)) return vazio()

    const trabalhos = parsed.trabalhos.filter(
      (t): t is TrabalhoPontual =>
        !!t &&
        typeof t === 'object' &&
        typeof t.id === 'string' &&
        typeof t.pedido === 'string' &&
        t.pedido.trim().length > 0 &&
        isTrabalhoTipo(t.tipo) &&
        isTrabalhoStatus(t.status) &&
        typeof t.expira_em === 'number' &&
        Number.isFinite(t.expira_em)
    )

    return { schema_version: 1, trabalhos }
  } catch {
    return vazio()
  }
}

export class WorkItemStore {
  private readonly fila = new WriteQueue()

  constructor(private readonly file: string) {}

  private async carregar(): Promise<WorkItemStoreFile> {
    try {
      return parseWorkItemStore(await readFile(this.file, 'utf8'))
    } catch {
      return vazio()
    }
  }

  private async gravar(estado: WorkItemStoreFile): Promise<void> {
    const temporario = `${this.file}.${process.pid}.tmp`

    await mkdir(dirname(this.file), { recursive: true })
    await writeFile(temporario, JSON.stringify(estado, null, 2), 'utf8')
    await rename(temporario, this.file)
  }

  async listar(tenantId: string = INSTALLATION_TENANT): Promise<TrabalhoPontual[]> {
    const estado = await this.carregar()

    return estado.trabalhos.filter(t => t.tenant_id === tenantId).sort((a, b) => b.created_at - a.created_at)
  }

  /** O que ainda é trabalho. Recebe `agora` para o teste poder viajar no tempo. */
  async abertos(tenantId: string = INSTALLATION_TENANT, agora: number = Date.now()): Promise<TrabalhoPontual[]> {
    return emAberto(await this.listar(tenantId), agora)
  }

  /** O que venceu e ninguém resolveu — a pergunta que a tela faz à parte. */
  async vencidos(tenantId: string = INSTALLATION_TENANT, agora: number = Date.now()): Promise<TrabalhoPontual[]> {
    return vencidos(await this.listar(tenantId), agora)
  }

  async resumo(tenantId: string = INSTALLATION_TENANT, agora: number = Date.now()): Promise<string> {
    return resumoDosTrabalhos(await this.listar(tenantId), agora)
  }

  async criar(
    input: unknown,
    tenantId: string = INSTALLATION_TENANT,
    agora: number = Date.now()
  ): Promise<{ error: string } | { trabalho: TrabalhoPontual; trabalhos: TrabalhoPontual[] }> {
    const normalizado = normalizarTrabalho(input, { agora, tenant_id: tenantId })

    if ('error' in normalizado) return { error: normalizado.error }

    return this.fila.serializar(async () => {
      const estado = await this.carregar()

      estado.trabalhos.push(normalizado.trabalho)
      await this.gravar(estado)

      return { trabalho: normalizado.trabalho, trabalhos: await this.listar(tenantId) }
    })
  }

  async mudar(
    input: unknown,
    agora: number = Date.now()
  ): Promise<{ error: string } | { trabalho: TrabalhoPontual; trabalhos: TrabalhoPontual[] }> {
    const raw = (input ?? {}) as Record<string, unknown>
    const id = typeof raw['id'] === 'string' ? raw['id'] : ''

    if (!id) return { error: 'trabalho_obrigatorio' }
    if (!isTrabalhoStatus(raw['status'])) return { error: 'status_invalido' }

    const novo = raw['status'] as TrabalhoStatus

    return this.fila.serializar(async () => {
      const estado = await this.carregar()
      const indice = estado.trabalhos.findIndex(t => t.id === id)

      if (indice < 0) return { error: 'trabalho_inexistente' }

      const atual = estado.trabalhos[indice] as TrabalhoPontual
      const r = mudarTrabalho(atual, novo, raw['entrega'], agora)

      if ('error' in r) return { error: r.error }

      estado.trabalhos[indice] = r.trabalho
      await this.gravar(estado)

      return { trabalho: r.trabalho, trabalhos: await this.listar(atual.tenant_id) }
    })
  }

  /**
   * Limpa os vencidos que ninguém entregou.
   *
   * **Não roda sozinho.** Um store que apagasse na leitura esconderia a remoção, e quem procurasse um
   * trabalho de dois meses atrás não acharia — nem saberia que ele existiu. Quem chama é quem decide.
   *
   * Devolve **quantos** saíram, para a ação poder ser dita na tela.
   */
  async descartarVencidos(
    tenantId: string = INSTALLATION_TENANT,
    agora: number = Date.now()
  ): Promise<{ descartados: number; trabalhos: TrabalhoPontual[] }> {
    return this.fila.serializar(async () => {
      const estado = await this.carregar()
      const vencidosAntes = vencidos(estado.trabalhos.filter(t => t.tenant_id === tenantId), agora)
      const ids = new Set(vencidosAntes.map(t => t.id))

      if (ids.size === 0) return { descartados: 0, trabalhos: await this.listar(tenantId) }

      // O status muda para `descartado` em vez de remover a linha: **o registro de que existiu fica**. Remover
      // apagaria a única coisa que um trabalho pontual deixa.
      estado.trabalhos = estado.trabalhos.map(t =>
        ids.has(t.id) ? { ...t, status: 'descartado' as const, updated_at: agora } : t
      )

      await this.gravar(estado)

      return { descartados: ids.size, trabalhos: await this.listar(tenantId) }
    })
  }
}
