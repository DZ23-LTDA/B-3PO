// O store de entregas (r57 do GOAL V2).
//
// A r56 criou a REGRA — o que uma entrega pode e não pode fazer. Este arquivo é o que a guarda em disco.
//
// POR QUE UM ARQUIVO PRÓPRIO
//
// `entregas.json`, ao lado de `sales.json` e `inventory.json`. A entrega **não pertence** a nenhum deles:
// ela liga os dois, e guardá-la dentro de um faria o outro ter de saber sobre entrega para ler a própria
// lista.
//
// O que o §14 proíbe é criar **segunda entidade para o mesmo dado** — um segundo `supplier`, um segundo
// estoque. A entrega não existe em lugar nenhum: é entidade nova, não duplicata.
//
// A LIGAÇÃO QUE A r55 MEDIU FALTAR
//
// `porPedido(order_id)` é a pergunta que a venda faz: *"esta venda já saiu?"*. Sem ela, a venda registra e
// ninguém sabe se a mercadoria chegou — que é o estado atual do produto.

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import {
  entregasPendentes,
  isEntregaStatus,
  normalizarEntrega,
  transitarEntrega,
  type Entrega,
  type EntregaStatus
} from './delivery'
import { INSTALLATION_TENANT } from './server-tenant'
import { WriteQueue } from './write-queue'

export interface EntregaStoreFile {
  entregas: Entrega[]
  schema_version: 1
}

export function deliveryStorePath(userDataDir: string): string {
  return join(userDataDir, 'b3po', 'entregas.json')
}

function vazio(): EntregaStoreFile {
  return { entregas: [], schema_version: 1 }
}

/**
 * Lê o arquivo.
 *
 * Entrega malformada é **descartada**, não propagada: uma linha sem `order_id` quebraria a ligação com a
 * venda, e uma quebra na leitura impediria de ver as outras. O que foi descartado some — e é a escolha
 * menos ruim que existe sem um campo de "inválidas".
 */
export function parseDeliveryStore(raw: string): EntregaStoreFile {
  try {
    const parsed = JSON.parse(raw) as Partial<EntregaStoreFile>

    if (!parsed || !Array.isArray(parsed.entregas)) return vazio()

    const entregas = parsed.entregas.filter(
      (e): e is Entrega =>
        !!e &&
        typeof e === 'object' &&
        typeof e.id === 'string' &&
        typeof e.order_id === 'string' &&
        typeof e.destino === 'string' &&
        isEntregaStatus(e.status)
    )

    return { entregas, schema_version: 1 }
  } catch {
    return vazio()
  }
}

export class DeliveryStore {
  private readonly fila = new WriteQueue()

  constructor(private readonly file: string) {}

  private async carregar(): Promise<EntregaStoreFile> {
    try {
      return parseDeliveryStore(await readFile(this.file, 'utf8'))
    } catch {
      return vazio()
    }
  }

  /** Escreve em temporário e renomeia — o mesmo padrão de todo store (r11). */
  private async gravar(estado: EntregaStoreFile): Promise<void> {
    const temporario = `${this.file}.${process.pid}.tmp`

    await mkdir(dirname(this.file), { recursive: true })
    await writeFile(temporario, JSON.stringify(estado, null, 2), 'utf8')
    await rename(temporario, this.file)
  }

  /** As entregas do tenant, mais recentes primeiro. */
  async listar(tenantId: string = INSTALLATION_TENANT): Promise<Entrega[]> {
    const estado = await this.carregar()

    return estado.entregas.filter(e => e.tenant_id === tenantId).sort((a, b) => b.created_at - a.created_at)
  }

  /**
   * As que ainda precisam sair.
   *
   * Existe como método de store, e não só como função pura, porque a tela pergunta **a cada montagem** —
   * e carregar a lista inteira para filtrar em memória funcionaria, mas esconderia que a pergunta é
   * sobre uma parte da lista.
   */
  async pendentes(tenantId: string = INSTALLATION_TENANT): Promise<Entrega[]> {
    return entregasPendentes(await this.listar(tenantId))
  }

  /** A ligação com a venda: esta venda já saiu? Devolve a mais recente que a cumpre. */
  async porPedido(orderId: string): Promise<Entrega | null> {
    const estado = await this.carregar()
    const doPedido = estado.entregas.filter(e => e.order_id === orderId)

    return doPedido.sort((a, b) => b.created_at - a.created_at)[0] ?? null
  }

  async criar(
    input: unknown,
    tenantId: string = INSTALLATION_TENANT,
    agora: number = Date.now()
  ): Promise<{ error: string } | { entrega: Entrega; entregas: Entrega[] }> {
    const normalizada = normalizarEntrega(input, { agora, tenant_id: tenantId })

    if ('error' in normalizada) return { error: normalizada.error }

    return this.fila.serializar(async () => {
      const estado = await this.carregar()

      // Uma entrega por pedido. Criar a segunda deixaria a venda com duas rotas e nenhuma resposta para
      // "já saiu?" — que é a pergunta que a ligação existe para responder.
      if (estado.entregas.some(e => e.order_id === normalizada.entrega.order_id)) {
        return { error: 'entrega_ja_existe' }
      }

      estado.entregas.push(normalizada.entrega)
      await this.gravar(estado)

      return {
        entrega: normalizada.entrega,
        entregas: await this.listar(normalizada.entrega.tenant_id)
      }
    })
  }

  /**
   * Muda o status, e a regra mora no módulo puro (`transitarEntrega`).
   *
   * O `recebedor` vem de quem chama — no canal, de `actorOf`. Nunca do payload do renderer.
   */
  async transitar(
    input: unknown,
    agora: number = Date.now()
  ): Promise<{ error: string } | { entrega: Entrega; entregas: Entrega[] }> {
    const raw = (input ?? {}) as Record<string, unknown>
    const id = typeof raw['id'] === 'string' ? raw['id'] : ''

    if (!id) return { error: 'entrega_obrigatoria' }
    if (!isEntregaStatus(raw['status'])) return { error: 'status_invalido' }

    const novo = raw['status'] as EntregaStatus

    return this.fila.serializar(async () => {
      const estado = await this.carregar()
      const indice = estado.entregas.findIndex(e => e.id === id)

      if (indice < 0) return { error: 'entrega_inexistente' }

      const atual = estado.entregas[indice] as Entrega
      const r = transitarEntrega(atual, novo, {
        agora,
        recebedor: typeof raw['recebedor'] === 'string' ? raw['recebedor'] : undefined
      })

      if ('error' in r) return { error: r.error }

      estado.entregas[indice] = r.entrega
      await this.gravar(estado)

      return { entrega: r.entrega, entregas: await this.listar(atual.tenant_id) }
    })
  }
}
