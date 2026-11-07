// Executor da migração de tenant: backup, reescrita por arquivo, verificação, rollback.
//
// A ordem não é negociável:
//   1. ler todos os arquivos e calcular a transformação em memória;
//   2. **copiar** os originais para uma pasta de backup datada;
//   3. escrever cada arquivo (write + rename);
//   4. verificar: nada pode ter sobrado no tenant antigo, e o saldo de estoque tem de ser idêntico;
//   5. se a verificação falhar, restaurar do backup e reportar.
//
// O passo 2 existe porque os passos 3 e 5 podem falhar. Sem backup, "falhou no meio" vira perda de
// dados — e migração de tenant mexe em tudo que a empresa lançou.

import { copyFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { catalogStorePath } from './catalog-store'
import { financeStorePath } from './finance-store'
import { inventoryStorePath } from './inventory-store'
import { purchasesStorePath } from './purchases-store'
import { salesStorePath } from './sales-store'
import { schedulingStorePath } from './scheduling-store'
import { balanceDrift, retagTenant, tenantsIn, verifyMigration } from './tenant-migration'
import type { InventoryMovement } from './inventory-store'

/** Arquivos que carregam `tenant_id`. CRM fica de fora: os stores dele não têm o campo hoje. */
export function tenantFiles(userDataDir: string): { nome: string; path: string }[] {
  return [
    { nome: 'catalog.json', path: catalogStorePath(userDataDir) },
    { nome: 'finance.json', path: financeStorePath(userDataDir) },
    { nome: 'inventory.json', path: inventoryStorePath(userDataDir) },
    { nome: 'purchases.json', path: purchasesStorePath(userDataDir) },
    { nome: 'sales.json', path: salesStorePath(userDataDir) },
    { nome: 'scheduling.json', path: schedulingStorePath(userDataDir) }
  ]
}

export interface MigrationResult {
  backupDir: string
  files: { antes: unknown; depois: unknown; nome: string }[]
  /** Vazio = migração aplicada e verificada. */
  problems: string[]
  rolledBack: boolean
}

async function readJson(path: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as unknown
  } catch {
    return null
  }
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  const temp = `${path}.migrating`
  await writeFile(temp, JSON.stringify(value, null, 2), 'utf8')
  await rename(temp, path)
}

/**
 * Migra `local` para `targetTenant`.
 *
 * `knownTenants` serve de trava: se algum arquivo já tiver um `tenant_id` que não seja o de origem,
 * a migração para antes de escrever qualquer coisa. Migrar sobre um estado que já foi mexido é como
 * se perde dado silenciosamente.
 */
export async function migrateTenant(
  userDataDir: string,
  targetTenant: string,
  from = 'local',
  now = Date.now()
): Promise<MigrationResult> {
  const arquivos = tenantFiles(userDataDir)
  const lidos: { antes: unknown; depois: unknown; nome: string; path: string }[] = []

  for (const arquivo of arquivos) {
    const antes = await readJson(arquivo.path)

    lidos.push({ antes, depois: retagTenant(antes, from, targetTenant), nome: arquivo.nome, path: arquivo.path })
  }

  // Trava: qualquer tenant desconhecido aborta antes de escrever.
  const estranhos = [...new Set(lidos.flatMap(entry => tenantsIn(entry.antes)))].filter(
    tenant => tenant !== from && tenant !== targetTenant
  )

  if (estranhos.length > 0) {
    return {
      backupDir: '',
      files: [],
      problems: [`tenant desconhecido encontrado: ${estranhos.join(', ')}`],
      rolledBack: false
    }
  }

  // Backup ANTES de qualquer escrita.
  const backupDir = join(userDataDir, 'b3po', `backup-tenant-${now}`)

  await mkdir(backupDir, { recursive: true })

  for (const entry of lidos) {
    if (entry.antes !== null) {
      await copyFile(entry.path, join(backupDir, entry.nome))
    }
  }

  for (const entry of lidos) {
    if (entry.antes !== null) {
      await writeJson(entry.path, entry.depois)
    }
  }

  const estoqueAntes = ((lidos.find(e => e.nome === 'inventory.json')?.antes as { movements?: InventoryMovement[] })?.movements ??
    []) as InventoryMovement[]
  const estoqueDepois = ((lidos.find(e => e.nome === 'inventory.json')?.depois as { movements?: InventoryMovement[] })?.movements ??
    []) as InventoryMovement[]

  const problems = verifyMigration(lidos, estoqueAntes, estoqueDepois, from, targetTenant)

  if (problems.length > 0) {
    // Restaurar do backup: o disco volta ao estado anterior, e o erro é reportado.
    for (const entry of lidos) {
      if (entry.antes !== null) {
        await copyFile(join(backupDir, entry.nome), entry.path)
      }
    }

    return { backupDir, files: lidos, problems, rolledBack: true }
  }

  // Confirmação independente do saldo, com o tenant novo como rótulo único.
  const drift = balanceDrift(estoqueAntes, estoqueDepois, targetTenant)

  if (drift.length > 0) {
    for (const entry of lidos) {
      if (entry.antes !== null) {
        await copyFile(join(backupDir, entry.nome), entry.path)
      }
    }

    return { backupDir, files: lidos, problems: [`saldo divergente: ${drift.join(', ')}`], rolledBack: true }
  }

  return { backupDir, files: lidos, problems: [], rolledBack: false }
}
