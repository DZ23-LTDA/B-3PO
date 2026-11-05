// O store de reservas (r63 do GOAL V2).
//
// A r62 criou a REGRA. Este arquivo a guarda — e a torna útil, respondendo `reservado()` com o que está
// em disco.
//
// POR QUE UM ARQUIVO PRÓPRIO
//
// `reservas.json`, ao lado de `sales.json` e `inventory.json`. A reserva **liga** os dois: uma venda que
// prometeu mercadoria e um estoque que ainda a tem. Guardá-la dentro de qualquer um faria o outro ter de
// saber sobre reserva para ler a própria lista.
//
// O QUE O STORE **NÃO** FAZ
//
// **Não libera reservas vencidas sozinho.** `reservasVencidas()` as encontra; mudá-las de estado é uma
// ação de alguém. Um store que se auto-limpa em `read` esconderia a escrita — e quem depurasse um produto
// travado não encontraria o que aconteceu.

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import {
  isReservaStatus,
  mudarReserva,
  normalizarReserva,
  PRAZO_PADRAO_MS,
  reservaAtiva,
  reservado,
  reservasVencidas,
  type Reserva,
  type ReservaStatus
} from './reservation'
import { INSTALLATION_TENANT } from './server-tenant'
import { WriteQueue } from './write-queue'

export interface ReservationStoreFile {
  reservas: Reserva[]
  schema_version: 1
}

export function reservationStorePath(userDataDir: string): string {
  return join(userDataDir, 'b3po', 'reservas.json')
}

function vazio(): ReservationStoreFile {
  return { reservas: [], schema_version: 1 }
}

/**
 * Lê o arquivo.
 *
 * Reserva malformada é descartada: uma linha sem `sale_id` quebraria a ligação com a venda, e uma sem
 * `expires_at` **travaria um produto para sempre** — o oposto do que a reserva existe para fazer.
 */
export function parseReservationStore(raw: string): ReservationStoreFile {
  try {
    const parsed = JSON.parse(raw) as Partial<ReservationStoreFile>

    if (!parsed || !Array.isArray(parsed.reservas)) return vazio()

    const reservas = parsed.reservas.filter(
      (r): r is Reserva =>
        !!r &&
        typeof r === 'object' &&
        typeof r.id === 'string' &&
        typeof r.sale_id === 'string' &&
        typeof r.product_sku === 'string' &&
        typeof r.quantity_milli === 'number' &&
        typeof r.expires_at === 'number' &&
        isReservaStatus(r.status)
    )

    return { reservas, schema_version: 1 }
  } catch {
    return vazio()
  }
}

export class ReservationStore {
  private readonly fila = new WriteQueue()

  constructor(private readonly file: string) {}

  private async carregar(): Promise<ReservationStoreFile> {
    try {
      return parseReservationStore(await readFile(this.file, 'utf8'))
    } catch {
      return vazio()
    }
  }

  private async gravar(estado: ReservationStoreFile): Promise<void> {
    const temporario = `${this.file}.${process.pid}.tmp`

    await mkdir(dirname(this.file), { recursive: true })
    await writeFile(temporario, JSON.stringify(estado, null, 2), 'utf8')
    await rename(temporario, this.file)
  }

  async listar(tenantId: string = INSTALLATION_TENANT): Promise<Reserva[]> {
    const estado = await this.carregar()

    return estado.reservas.filter(r => r.tenant_id === tenantId).sort((a, b) => b.created_at - a.created_at)
  }

  /**
   * Quanto de um SKU está reservado **agora**.
   *
   * Lê o disco em vez de manter um cache: uma reserva criada por outro processo (ou por outra instância
   * do app) não estaria no cache, e a conta de "quanto posso vender" erraria para cima.
   */
  async reservadoDoSku(sku: string, agora: number = Date.now()): Promise<number> {
    return reservado((await this.carregar()).reservas, sku, agora)
  }

  async ativas(tenantId: string = INSTALLATION_TENANT, agora: number = Date.now()): Promise<Reserva[]> {
    const lista = await this.listar(tenantId)

    return lista.filter(r => reservaAtiva(r, agora))
  }

  /** As vencidas que ninguém liberou. Alguém precisa olhar — o store não decide por ninguém. */
  async vencidas(tenantId: string = INSTALLATION_TENANT, agora: number = Date.now()): Promise<Reserva[]> {
    return reservasVencidas(await this.listar(tenantId), agora)
  }

  /** A reserva de uma venda, se houver. É a pergunta que `faturar` faz. */
  async porVenda(saleId: string): Promise<Reserva | null> {
    const estado = await this.carregar()
    const daVenda = estado.reservas.filter(r => r.sale_id === saleId)

    return daVenda.sort((a, b) => b.created_at - a.created_at)[0] ?? null
  }

  async criar(
    input: unknown,
    tenantId: string = INSTALLATION_TENANT,
    agora: number = Date.now(),
    prazoMs: number = PRAZO_PADRAO_MS
  ): Promise<{ error: string } | { reserva: Reserva; reservas: Reserva[] }> {
    const normalizada = normalizarReserva(input, { agora, prazo_ms: prazoMs, tenant_id: tenantId })

    if ('error' in normalizada) return { error: normalizada.error }

    return this.fila.serializar(async () => {
      const estado = await this.carregar()

      // Uma reserva ativa por venda: duas deixariam "quanto esta venda prometeu" sem resposta, e a
      // mesma mercadoria contaria duas vezes no disponível.
      const jaTem = estado.reservas.some(
        r => r.sale_id === normalizada.reserva.sale_id && reservaAtiva(r, agora)
      )

      if (jaTem) return { error: 'reserva_ja_existe' }

      estado.reservas.push(normalizada.reserva)
      await this.gravar(estado)

      return {
        reserva: normalizada.reserva,
        reservas: await this.listar(normalizada.reserva.tenant_id)
      }
    })
  }

  async mudar(
    input: unknown,
    agora: number = Date.now()
  ): Promise<{ error: string } | { reserva: Reserva; reservas: Reserva[] }> {
    const raw = (input ?? {}) as Record<string, unknown>
    const id = typeof raw['id'] === 'string' ? raw['id'] : ''

    if (!id) return { error: 'reserva_obrigatoria' }
    if (!isReservaStatus(raw['status'])) return { error: 'status_invalido' }

    const novo = raw['status'] as ReservaStatus

    return this.fila.serializar(async () => {
      const estado = await this.carregar()
      const indice = estado.reservas.findIndex(r => r.id === id)

      if (indice < 0) return { error: 'reserva_inexistente' }

      const atual = estado.reservas[indice] as Reserva
      const r = mudarReserva(atual, novo, agora)

      if ('error' in r) return { error: r.error }

      estado.reservas[indice] = r.reserva
      await this.gravar(estado)

      return { reserva: r.reserva, reservas: await this.listar(atual.tenant_id) }
    })
  }

  /**
   * Consome a reserva de uma venda — chamada por `faturar`.
   *
   * **Não falha quando não há reserva.** Nem toda venda reserva: o balcão vende e entrega no mesmo
   * minuto. Uma função que exigisse reserva obrigaria toda venda direta a criar uma antes, o que seria
   * cerimônia sem propósito.
   *
   * Devolve `null` quando não havia nada a consumir — e `null` aqui é **sucesso**, não ausência de
   * resposta.
   */
  async confirmarDaVenda(
    saleId: string,
    agora: number = Date.now()
  ): Promise<{ reserva: Reserva } | { error: string } | null> {
    return this.fila.serializar(async () => {
      const estado = await this.carregar()

      // r63: procura a reserva da venda **sem filtrar por ativa**. Filtrar esconderia a diferença entre
      // "nunca houve reserva" (`null`, e é sucesso) e "houve e venceu" (`prazo_vencido`, e é um fato que
      // alguém precisa saber) — as duas coisas produziriam o mesmo silêncio.
      const indice = estado.reservas.findIndex(r => r.sale_id === saleId)

      if (indice < 0) return null

      const atual = estado.reservas[indice] as Reserva
      const r = mudarReserva(atual, 'confirmada', agora)

      // Vencida: o produto já voltou a estar disponível, e confirmar venderia a dois clientes. A venda
      // fato (feita por `faturar`) continua valendo — o que não vale é a reserva.
      if ('error' in r) return { error: r.error }

      estado.reservas[indice] = r.reserva
      await this.gravar(estado)

      return { reserva: r.reserva }
    })
  }
}
