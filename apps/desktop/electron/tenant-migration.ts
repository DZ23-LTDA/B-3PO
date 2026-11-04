// Migração de tenant: trocar `tenant_id = 'local'` pelo id da empresa real.
//
// Este arquivo é **só a lógica**. Nenhuma escrita em disco acontece aqui — quem chama é o processo
// principal, e o procedimento (backup antes, verificação depois, rollback se falhar) está em
// docs/b3po/audit/TENANT-MIGRATION.md.
//
// Por que separar: migração que mexe em arquivo e verifica no mesmo lugar não pode ser testada sem
// arriscar dados. Aqui a transformação é pura, então o teste compara antes e depois sobre objetos.
//
// A verificação central: o saldo de estoque é **derivado** das movimentações. Se a migração acertar o
// `tenant_id` das movimentações, o saldo continua idêntico. Se errar, o saldo muda sem nenhuma
// mercadoria ter entrado ou saído — e é isso que a verificação precisa pegar.

import { balanceFor, type InventoryMovement } from './inventory-store'

/** Troca `tenant_id` de `from` para `to` em todos os registros que têm o campo. */
export function retagTenant<T>(value: T, from: string, to: string): T {
  if (Array.isArray(value)) {
    return value.map(entry => retagTenant(entry, from, to)) as unknown as T
  }

  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}

    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      out[key] = key === 'tenant_id' && entry === from ? to : retagTenant(entry, from, to)
    }

    return out as unknown as T
  }

  return value
}

/** Quantos registros de cada arquivo ainda estão no tenant antigo. */
export function countTenant(value: unknown, tenantId: string): number {
  let total = 0

  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const entry of node) walk(entry)

      return
    }

    if (node && typeof node === 'object') {
      const record = node as Record<string, unknown>

      if (record['tenant_id'] === tenantId) total += 1

      for (const entry of Object.values(record)) walk(entry)
    }
  }

  walk(value)

  return total
}

/** Todos os `tenant_id` distintos encontrados num arquivo. */
export function tenantsIn(value: unknown): string[] {
  const vistos = new Set<string>()

  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const entry of node) walk(entry)

      return
    }

    if (node && typeof node === 'object') {
      const record = node as Record<string, unknown>

      if (typeof record['tenant_id'] === 'string') vistos.add(record['tenant_id'])

      for (const entry of Object.values(record)) walk(entry)
    }
  }

  walk(value)

  return [...vistos].sort()
}

export interface FileCheck {
  /** Registros que estavam no tenant antigo e passaram para o novo. */
  migrated: number
  /** Registros que ficaram no tenant antigo (deveria ser 0). */
  remaining: number
}

export function checkFile(before: unknown, after: unknown, from: string, to: string): FileCheck {
  return {
    migrated: countTenant(after, to) - countTenant(before, to),
    remaining: countTenant(after, from)
  }
}

/**
 * Compara os saldos de estoque antes e depois.
 *
 * Devolve os SKUs cujo saldo mudou. Lista vazia é o único resultado aceitável: migração não pode
 * alterar quantidade em estoque.
 */
export function balanceDrift(before: readonly InventoryMovement[], after: readonly InventoryMovement[], to: string): string[] {
  const skus = new Set<string>([...before.map(m => m.product_sku), ...after.map(m => m.product_sku)])
  const divergentes: string[] = []

  for (const sku of skus) {
    // Antes, o saldo está no tenant `local`; depois, no tenant novo. Compara o mesmo conjunto de
    // movimentações sob o rótulo que cada lado usa.
    const antes = balanceFor(before, sku, 'local') + balanceFor(before, sku, to)
    const depois = balanceFor(after, sku, 'local') + balanceFor(after, sku, to)

    if (antes !== depois) {
      divergentes.push(sku)
    }
  }

  return divergentes.sort()
}

/**
 * A migração é considerada segura quando nada ficou no tenant antigo e nenhum saldo mudou.
 *
 * Recebe os arquivos já transformados e devolve os problemas — não lança, porque quem chama precisa
 * decidir entre rolar de volta e abortar.
 */
export function verifyMigration(
  pares: readonly { antes: unknown; depois: unknown; nome: string }[],
  estoqueAntes: readonly InventoryMovement[],
  estoqueDepois: readonly InventoryMovement[],
  from: string,
  to: string
): string[] {
  const problemas: string[] = []

  for (const par of pares) {
    const check = checkFile(par.antes, par.depois, from, to)

    if (check.remaining > 0) {
      problemas.push(`${par.nome}: ${check.remaining} registro(s) ainda em "${from}"`)
    }
  }

  const drift = balanceDrift(estoqueAntes, estoqueDepois, to)

  if (drift.length > 0) {
    problemas.push(`estoque: saldo mudou para ${drift.join(', ')}`)
  }

  return problemas
}
