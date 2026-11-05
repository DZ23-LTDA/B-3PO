// Catálogo de produtos no disco do usuário, dono do dado: o processo principal do Electron.
//
// Mesmo desenho dos stores do CRM: um JSON sob `userData`, gravação atômica (`write` + `rename`) e
// erro como valor (`{ error }`) em vez de exceção.
//
// `tenant_id` existe desde o primeiro campo, mesmo com uma empresa só hoje. Esta é a decisão cara de
// inverter depois: sem a chave no registro, toda consulta, validação e arquivo precisaria migrar quando
// a segunda empresa aparecer. Com ela, isolar é filtrar.

import { WriteQueue } from './write-queue'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { cents } from './money'

/** Empresa única desta instalação. Vira o id real quando houver cadastro de empresas. */
export const DEFAULT_TENANT = 'local'

export const PRODUCT_UNITS = ['un', 'kg', 'g', 'l', 'ml', 'm', 'm2', 'm3', 'cx', 'pct'] as const

export type ProductUnit = (typeof PRODUCT_UNITS)[number]

export interface Product {
  /** Produto inativo continua no catálogo: o histórico de vendas aponta para ele. */
  active: boolean
  barcode: string
  category: string
  cost_cents: number
  created_at: number
  id: string
  name: string
  price_cents: number
  sku: string
  tenant_id: string
  unit: ProductUnit
  updated_at: number
}

export interface CatalogFile {
  products: Product[]
  schema_version: 1
}

function emptyCatalog(): CatalogFile {
  return { products: [], schema_version: 1 }
}

export function catalogStorePath(userDataDir: string): string {
  return join(userDataDir, 'b3po', 'catalog.json')
}

export function isUnit(value: unknown): value is ProductUnit {
  return typeof value === 'string' && (PRODUCT_UNITS as readonly string[]).includes(value)
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/** Filtra pelo dono do dado. É o único ponto que decide o que uma empresa pode ver. */
export function productsFor(products: readonly Product[], tenantId: string): Product[] {
  return products.filter(product => product.tenant_id === tenantId)
}

export function normalizeProduct(input: unknown, now: number): { error: string } | { product: Product } {
  const raw = (input ?? {}) as Record<string, unknown>
  const name = text(raw['name'])
  const sku = text(raw['sku'])

  if (!name) {
    return { error: 'name_required' }
  }

  if (!sku) {
    return { error: 'sku_required' }
  }

  const unit = raw['unit']

  // Unidade ausente é aceita (assume `un`); unidade inventada é erro de digitação, não default.
  if (unit !== undefined && unit !== null && text(unit) !== '' && !isUnit(unit)) {
    return { error: 'unit_invalid' }
  }

  return {
    product: {
      active: raw['active'] === undefined ? true : raw['active'] === true,
      barcode: text(raw['barcode']),
      category: text(raw['category']),
      cost_cents: cents(raw['cost_cents']),
      created_at: typeof raw['created_at'] === 'number' ? raw['created_at'] : now,
      id: text(raw['id']) || `prod_${now}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      price_cents: cents(raw['price_cents']),
      sku,
      tenant_id: text(raw['tenant_id']) || DEFAULT_TENANT,
      unit: isUnit(unit) ? unit : 'un',
      updated_at: now
    }
  }
}

export function parseCatalog(raw: string): CatalogFile {
  try {
    const parsed = JSON.parse(raw) as Partial<CatalogFile>

    if (!parsed || !Array.isArray(parsed.products)) {
      return emptyCatalog()
    }

    return {
      products: parsed.products.filter(
        entry =>
          !!entry &&
          typeof entry.id === 'string' &&
          typeof entry.sku === 'string' &&
          typeof entry.tenant_id === 'string' &&
          isUnit((entry as Product).unit)
      ),
      schema_version: 1
    }
  } catch {
    return emptyCatalog()
  }
}

export class CatalogStore {
  constructor(private readonly filePath: string) {}

  /** Fila de escrita (r238): read -> valida -> write nao era serializado. Ver write-queue.ts. */
  private readonly fila = new WriteQueue()

  async list(tenantId: string = DEFAULT_TENANT): Promise<Product[]> {
    const file = await this.read()

    return productsFor(file.products, tenantId).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  }

  async upsert(input: unknown): Promise<{ error: string } | { products: Product[] }> {
    return this.fila.serializar(() => this.upsertSerializado(input))
  }

  private async upsertSerializado(input: unknown): Promise<{ error: string } | { products: Product[] }> {
    const normalized = normalizeProduct(input, Date.now())

    if ('error' in normalized) {
      return normalized
    }

    const file = await this.read()
    const product = normalized.product
    const index = file.products.findIndex(entry => entry.id === product.id)
    const duplicado = file.products.some(
      entry =>
        entry.id !== product.id &&
        entry.tenant_id === product.tenant_id &&
        entry.sku.toLowerCase() === product.sku.toLowerCase()
    )

    // SKU é a identidade comercial do produto dentro da empresa: repetido, nem o estoque nem a venda
    // saberiam a qual produto se referem. Em empresas diferentes, o mesmo SKU é legítimo.
    if (duplicado) {
      return { error: 'sku_duplicado' }
    }

    if (index >= 0) {
      const anterior = file.products[index]!

      file.products[index] = { ...anterior, ...product, created_at: anterior.created_at }
    } else {
      file.products.push(product)
    }

    await this.write(file)

    return { products: await this.list(product.tenant_id) }
  }

  async remove(id: string, tenantId: string = DEFAULT_TENANT): Promise<{ products: Product[] }> {
    return this.fila.serializar(() => this.removeSerializado(id, tenantId))
  }

  private async removeSerializado(id: string, tenantId: string = DEFAULT_TENANT): Promise<{ products: Product[] }> {
    const file = await this.read()

    // Remove apenas dentro da empresa: um id de outra empresa não pode ser apagado por engano.
    file.products = file.products.filter(entry => !(entry.id === id && entry.tenant_id === tenantId))
    await this.write(file)

    return { products: await this.list(tenantId) }
  }

  private async read(): Promise<CatalogFile> {
    try {
      return parseCatalog(await readFile(this.filePath, 'utf8'))
    } catch {
      return emptyCatalog()
    }
  }

  private async write(file: CatalogFile): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true })
    const temp = `${this.filePath}.tmp`
    await writeFile(temp, JSON.stringify(file, null, 2), 'utf8')
    await rename(temp, this.filePath)
  }
}
