// Estoque como livro-razão de movimentações, no disco do usuário.
//
// A decisão central: **saldo não é armazenado**. Ele é sempre a soma das movimentações do produto.
// Guardar um número `saldo` ao lado das movimentações cria duas verdades que saem de sincronia assim
// que uma escrita falha no meio — e então ninguém sabe qual das duas está certa. Derivando, o saldo é
// impossível de ficar inconsistente, e cada número pode ser auditado até a movimentação que o gerou.
//
// A segunda decisão: **movimentação é imutável**. Não existe update nem delete. Corrigir um lançamento
// errado é lançar o inverso, com motivo — do mesmo jeito que se corrige um erro de contabilidade. Se
// fosse possível editar uma saída, a auditoria do estoque deixaria de existir.

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { DEFAULT_TENANT } from './catalog-store'
import { milli } from './quantity'

export const MOVEMENT_KINDS = ['entrada', 'saida', 'ajuste'] as const

export type MovementKind = (typeof MOVEMENT_KINDS)[number]

export interface InventoryMovement {
  created_at: number
  id: string
  kind: MovementKind
  /** SKU do catálogo: é a identidade comercial do produto, não o id interno. */
  product_sku: string
  /** Milésimos. Em `entrada`/`saida` é sempre positivo; em `ajuste` carrega o sinal do delta. */
  quantity_milli: number
  /** Por que o lançamento existe. Obrigatório em `ajuste` e nas correções. */
  reason: string
  /** Chave de idempotência do emissor (ex.: `venda:123`). Vazio = sem deduplicação. */
  ref: string
  tenant_id: string
}

export interface InventoryFile {
  movements: InventoryMovement[]
  schema_version: 1
}

function emptyInventory(): InventoryFile {
  return { movements: [], schema_version: 1 }
}

export function inventoryStorePath(userDataDir: string): string {
  return join(userDataDir, 'b3po', 'inventory.json')
}

export function isKind(value: unknown): value is MovementKind {
  return typeof value === 'string' && (MOVEMENT_KINDS as readonly string[]).includes(value)
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * Saldo de um produto em milésimos, derivado das movimentações.
 *
 * `saida` subtrai; `entrada` e `ajuste` somam (o ajuste já carrega o sinal no próprio valor).
 */
export function balanceFor(
  movements: readonly InventoryMovement[],
  productSku: string,
  tenantId: string = DEFAULT_TENANT
): number {
  let total = 0

  for (const movement of movements) {
    if (movement.tenant_id !== tenantId || movement.product_sku !== productSku) {
      continue
    }

    total += movement.kind === 'saida' ? -movement.quantity_milli : movement.quantity_milli
  }

  return total
}

/** Saldo de todos os produtos da empresa, em milésimos, por SKU. */
export function balances(
  movements: readonly InventoryMovement[],
  tenantId: string = DEFAULT_TENANT
): Record<string, number> {
  const out: Record<string, number> = {}

  for (const movement of movements) {
    if (movement.tenant_id !== tenantId) {
      continue
    }

    const atual = out[movement.product_sku] ?? 0

    out[movement.product_sku] = atual + (movement.kind === 'saida' ? -movement.quantity_milli : movement.quantity_milli)
  }

  return out
}

export function normalizeMovement(input: unknown, now: number): { error: string } | { movement: InventoryMovement } {
  const raw = (input ?? {}) as Record<string, unknown>
  const sku = text(raw['product_sku'])
  const kind = raw['kind']

  if (!sku) {
    return { error: 'sku_required' }
  }

  if (!isKind(kind)) {
    return { error: 'kind_invalid' }
  }

  // `quantity_milli` já está em milésimos (é o campo que a venda emite); `quantity` é em unidades.
  // Reconvertendo os dois, uma baixa de 3000 milésimos viraria 3.000.000.
  const brutoMilli = raw['quantity_milli']
  const quantity =
    brutoMilli === undefined || brutoMilli === null
      ? milli(raw['quantity'])
      : Number.isFinite(Number(brutoMilli))
        ? Math.round(Number(brutoMilli))
        : 0

  if (quantity === 0) {
    return { error: 'quantity_required' }
  }

  // Entrada e saída têm direção fixa, por isso o valor é sempre positivo nelas; o sinal é do `ajuste`.
  if (kind !== 'ajuste' && quantity < 0) {
    return { error: 'quantity_negative' }
  }

  const reason = text(raw['reason'])

  // Um ajuste sem motivo é um saldo alterado sem explicação — não passa na auditoria.
  if (kind === 'ajuste' && !reason) {
    return { error: 'reason_required' }
  }

  return {
    movement: {
      created_at: typeof raw['created_at'] === 'number' ? raw['created_at'] : now,
      id: text(raw['id']) || `mov_${now}_${Math.random().toString(36).slice(2, 8)}`,
      kind,
      product_sku: sku,
      quantity_milli: quantity,
      reason,
      ref: text(raw['ref']),
      tenant_id: text(raw['tenant_id']) || DEFAULT_TENANT
    }
  }
}

export function parseInventory(raw: string): InventoryFile {
  try {
    const parsed = JSON.parse(raw) as Partial<InventoryFile>

    if (!parsed || !Array.isArray(parsed.movements)) {
      return emptyInventory()
    }

    return {
      movements: parsed.movements.filter(
        entry =>
          !!entry &&
          typeof entry.id === 'string' &&
          typeof entry.product_sku === 'string' &&
          typeof entry.tenant_id === 'string' &&
          isKind((entry as InventoryMovement).kind) &&
          typeof entry.quantity_milli === 'number' &&
          Number.isFinite(entry.quantity_milli)
      ),
      schema_version: 1
    }
  } catch {
    return emptyInventory()
  }
}

export class InventoryStore {
  /**
   * Fila de escrita (r234).
   *
   * O \`append\` faz read -> valida -> push -> write. O write e atomico (temp + rename), mas a SEQUENCIA nao era
   * serializada: duas chamadas simultaneas liam o mesmo saldo e a segunda gravava por cima da primeira.
   *
   * O teste \`inventory-concurrency.test.ts\` provou o efeito: duas saidas de 8 com saldo 10 responderam as DUAS
   * com sucesso, e o ledger ficou com UMA - saldo 2000000 em vez de recusar. Venda fantasma: o cliente paga e o
   * estoque nao baixa.
   *
   * A fila e por INSTANCIA, que e a unidade de escrita do arquivo. Duas instancias sobre o mesmo arquivo
   * continuam sem protecao mutua - isso exigiria lock de sistema de arquivos, e o produto usa uma instancia por
   * diretorio (ver \`erp-ipc\`).
   */
  private fila: Promise<unknown> = Promise.resolve()

  constructor(private readonly filePath: string) {}

  /** Livro-razão completo da empresa, na ordem em que os lançamentos aconteceram. */
  async list(tenantId: string = DEFAULT_TENANT): Promise<InventoryMovement[]> {
    const file = await this.read()

    return file.movements
      .filter(movement => movement.tenant_id === tenantId)
      .sort((a, b) => a.created_at - b.created_at)
  }

  async balances(tenantId: string = DEFAULT_TENANT): Promise<Record<string, number>> {
    return balances(await this.read().then(file => file.movements), tenantId)
  }

  /**
   * Registra uma movimentação. Não existe `update` nem `remove` de propósito.
   *
   * Recusa o lançamento que deixaria o saldo negativo: estoque negativo é efeito de erro de digitação
   * ou de venda sem mercadoria, e aceitar isso silenciosamente esconde o problema em vez de mostrá-lo.
   */
  async append(
    input: unknown
  ): Promise<{ error: string } | { balance: number; movement: InventoryMovement; movements: InventoryMovement[] }> {
    // Serializa: a proxima so comeca quando esta terminar. Sem isto, read-modify-write concorrente perde escrita.
    const resultado = this.fila.then(() => this.appendSerializado(input))

    this.fila = resultado.catch(() => undefined)

    return resultado
  }

  private async appendSerializado(
    input: unknown
  ): Promise<{ error: string } | { balance: number; movement: InventoryMovement; movements: InventoryMovement[] }> {
    const normalized = normalizeMovement(input, Date.now())

    if ('error' in normalized) {
      return normalized
    }

    const file = await this.read()
    const movement = normalized.movement

    // Idempotência: a mesma `ref` (retry de webhook, clique repetido) não lança duas vezes.
    if (
      movement.ref &&
      file.movements.some(entry => entry.tenant_id === movement.tenant_id && entry.ref === movement.ref)
    ) {
      return { error: 'ref_duplicado' }
    }

    const proximo =
      balanceFor(file.movements, movement.product_sku, movement.tenant_id) +
      (movement.kind === 'saida' ? -movement.quantity_milli : movement.quantity_milli)

    if (proximo < 0) {
      return { error: 'saldo_insuficiente' }
    }

    file.movements.push(movement)
    await this.write(file)

    return {
      balance: proximo,
      movement,
      movements: await this.list(movement.tenant_id)
    }
  }

  private async read(): Promise<InventoryFile> {
    try {
      return parseInventory(await readFile(this.filePath, 'utf8'))
    } catch {
      return emptyInventory()
    }
  }

  private async write(file: InventoryFile): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true })
    const temp = `${this.filePath}.tmp`
    await writeFile(temp, JSON.stringify(file, null, 2), 'utf8')
    await rename(temp, this.filePath)
  }
}
