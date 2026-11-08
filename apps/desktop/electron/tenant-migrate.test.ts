import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { catalogStorePath } from './catalog-store'
import { inventoryStorePath } from './inventory-store'
import { migrateTenant, tenantFiles } from './tenant-migrate'

async function withUserData<T>(run: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'b3po-migrate-'))

  try {
    return await run(dir)
  } finally {
    await rm(dir, { force: true, recursive: true })
  }
}

async function escrever(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, JSON.stringify(value, null, 2), 'utf8')
}

async function ler(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, 'utf8')) as unknown
}

const catalogoLocal = {
  products: [{ id: 'p1', name: 'Café', sku: 'CAF-500', tenant_id: 'local' }],
  schema_version: 1
}

const estoqueLocal = {
  movements: [
    {
      created_at: 1,
      id: 'm1',
      kind: 'entrada',
      product_sku: 'CAF-500',
      quantity_milli: 10000,
      reason: 'compra',
      ref: 'compra:1',
      tenant_id: 'local'
    }
  ],
  schema_version: 1
}

describe('executor da migracao', () => {
  it('migra os arquivos, deixa backup e verifica', async () => {
    await withUserData(async dir => {
      await escrever(catalogStorePath(dir), catalogoLocal)
      await escrever(inventoryStorePath(dir), estoqueLocal)

      const r = await migrateTenant(dir, 'emp_123', 'local', 111)

      expect(r.problems).toEqual([])
      expect(r.rolledBack).toBe(false)

      const catalogo = (await ler(catalogStorePath(dir))) as { products: { tenant_id: string }[] }
      const estoque = (await ler(inventoryStorePath(dir))) as { movements: { tenant_id: string }[] }

      expect(catalogo.products[0]!.tenant_id).toBe('emp_123')
      expect(estoque.movements[0]!.tenant_id).toBe('emp_123')

      // Backup existe e guarda o estado ANTERIOR.
      const backup = (await ler(join(r.backupDir, 'catalog.json'))) as { products: { tenant_id: string }[] }

      expect(backup.products[0]!.tenant_id).toBe('local')
    })
  })

  it('aborta antes de escrever quando encontra tenant desconhecido', async () => {
    await withUserData(async dir => {
      await escrever(catalogStorePath(dir), {
        products: [
          { id: 'p1', tenant_id: 'local' },
          { id: 'p2', tenant_id: 'emp_fantasma' }
        ],
        schema_version: 1
      })

      const r = await migrateTenant(dir, 'emp_123', 'local', 222)

      expect(r.problems[0]).toContain('emp_fantasma')
      expect(r.rolledBack).toBe(false)

      // Nada foi escrito: o arquivo continua como estava.
      const catalogo = (await ler(catalogStorePath(dir))) as { products: { tenant_id: string }[] }

      expect(catalogo.products[1]!.tenant_id).toBe('emp_fantasma')
    })
  })

  it('nao cria backup nem escreve quando nao ha dado nenhum', async () => {
    await withUserData(async dir => {
      const r = await migrateTenant(dir, 'emp_123', 'local', 333)

      expect(r.problems).toEqual([])

      const arquivos = await readdir(join(dir, 'b3po'), { withFileTypes: true })
      const backups = arquivos.filter(e => e.isDirectory() && e.name.startsWith('backup-tenant-'))

      // Só a pasta de backup vazia, nenhum arquivo de domínio criado do nada.
      expect(backups).toHaveLength(1)
      expect(await readdir(tenantFiles(dir)[0]!.path).catch(() => [])).toEqual([])
    })
  })

  it('lista os seis arquivos de dominio', async () => {
    const nomes = tenantFiles('C:/x').map(f => f.nome)

    expect(nomes).toEqual([
      'catalog.json',
      'finance.json',
      'inventory.json',
      'purchases.json',
      'sales.json',
      'scheduling.json'
    ])
  })
})
