import { describe, expect, it } from 'vitest'

import { DEFAULT_TENANT } from './catalog-store'
import { balanceFor, type InventoryMovement } from './inventory-store'
import {
  balanceDrift,
  checkFile,
  countTenant,
  retagTenant,
  tenantsIn,
  verifyMigration
} from './tenant-migration'

const movimento = (over: Partial<InventoryMovement> = {}): InventoryMovement => ({
  created_at: 1,
  id: 'm1',
  kind: 'entrada',
  product_sku: 'CAF-500',
  quantity_milli: 10000,
  reason: '',
  ref: '',
  tenant_id: DEFAULT_TENANT,
  ...over
})

const catalogo = {
  products: [
    { id: 'p1', name: 'Café', sku: 'CAF-500', tenant_id: 'local' },
    { id: 'p2', name: 'Chá', sku: 'CHA-1', tenant_id: 'local' }
  ],
  schema_version: 1
}

describe('retagTenant', () => {
  it('troca tenant_id em todos os registros, inclusive aninhados', () => {
    const depois = retagTenant(catalogo, 'local', 'emp_123')

    expect(depois.products.every(p => p.tenant_id === 'emp_123')).toBe(true)
    expect(depois.schema_version).toBe(1)
    // Não muta o original: a migração precisa poder ser descartada.
    expect(catalogo.products[0]!.tenant_id).toBe('local')
  })

  it('não toca em registros de outro tenant', () => {
    const misto = {
      products: [
        { id: 'p1', tenant_id: 'local' },
        { id: 'p2', tenant_id: 'outra' }
      ]
    }
    const depois = retagTenant(misto, 'local', 'emp_1')

    expect(depois.products[0]!.tenant_id).toBe('emp_1')
    expect(depois.products[1]!.tenant_id).toBe('outra')
  })

  it('preserva números, strings e nulos', () => {
    const entrada = { a: 1, b: 'texto', c: null, d: true, tenant_id: 'local' }
    const depois = retagTenant(entrada, 'local', 'x')

    expect(depois).toEqual({ a: 1, b: 'texto', c: null, d: true, tenant_id: 'x' })
  })

  it('lida com objeto vazio e primitivo', () => {
    expect(retagTenant({}, 'local', 'x')).toEqual({})
    expect(retagTenant('local', 'local', 'x')).toBe('local')
  })
})

describe('contagem e diagnostico', () => {
  it('conta registros do tenant e lista os tenants presentes', () => {
    expect(countTenant(catalogo, 'local')).toBe(2)
    expect(tenantsIn(catalogo)).toEqual(['local'])
  })

  it('checkFile reporta migrados e remanescentes', () => {
    const depois = retagTenant(catalogo, 'local', 'emp_1')
    const check = checkFile(catalogo, depois, 'local', 'emp_1')

    expect(check.migrated).toBe(2)
    expect(check.remaining).toBe(0)
  })

  it('checkFile aponta quando sobrou registro', () => {
    const parcial = { products: [{ id: 'p1', tenant_id: 'local' }, { id: 'p2', tenant_id: 'emp_1' }] }
    const check = checkFile(catalogo, parcial, 'local', 'emp_1')

    expect(check.remaining).toBe(1)
  })
})

describe('saldo derivado nao pode mudar', () => {
  it('mesmas movimentacoes sob outro tenant mantem o saldo', () => {
    const antes = [movimento(), movimento({ id: 'm2', kind: 'saida', quantity_milli: 3000 })]
    const depois = retagTenant(antes, 'local', 'emp_1')

    expect(balanceDrift(antes, depois, 'emp_1')).toEqual([])
    expect(balanceFor(depois, 'CAF-500', 'emp_1')).toBe(7000)
  })

  it('DETECTA quando a migracao perde uma movimentacao', () => {
    const antes = [movimento(), movimento({ id: 'm2', kind: 'saida', quantity_milli: 3000 })]
    // Simula um bug: só a primeira foi migrada, a segunda desapareceu.
    const depois = retagTenant([antes[0]!], 'local', 'emp_1')

    expect(balanceDrift(antes, depois, 'emp_1')).toEqual(['CAF-500'])
  })

  it('DETECTA quando o sinal de uma movimentacao muda', () => {
    const antes = [movimento(), movimento({ id: 'm2', kind: 'saida', quantity_milli: 3000 })]
    const depois = retagTenant(antes, 'local', 'emp_1')

    depois[1] = { ...depois[1]!, kind: 'entrada' }

    expect(balanceDrift(antes, depois, 'emp_1')).toEqual(['CAF-500'])
  })
})

describe('verifyMigration', () => {
  it('passa quando tudo migrou e o saldo esta igual', () => {
    const antes = [movimento(), movimento({ id: 'm2', kind: 'saida', quantity_milli: 3000 })]
    const depois = retagTenant(antes, 'local', 'emp_1')

    expect(
      verifyMigration(
        [{ antes: catalogo, depois: retagTenant(catalogo, 'local', 'emp_1'), nome: 'catalog.json' }],
        antes,
        depois,
        'local',
        'emp_1'
      )
    ).toEqual([])
  })

  it('falha quando sobrou registro no tenant antigo', () => {
    const problemas = verifyMigration(
      [{ antes: catalogo, depois: catalogo, nome: 'catalog.json' }],
      [],
      [],
      'local',
      'emp_1'
    )

    expect(problemas).toEqual(['catalog.json: 2 registro(s) ainda em "local"'])
  })

  it('falha quando o saldo mudou, e diz qual SKU', () => {
    const antes = [movimento()]
    const depois: InventoryMovement[] = []

    const problemas = verifyMigration([], antes, depois, 'local', 'emp_1')

    expect(problemas).toEqual(['estoque: saldo mudou para CAF-500'])
  })
})
