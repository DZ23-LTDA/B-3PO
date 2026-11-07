/**
 * Empresas e filiais no renderer.
 *
 * A empresa é o tenant canônico. Cadastrá-la **não** migra os dados existentes — isso é um passo
 * separado, documentado em docs/b3po/audit/TENANT-MIGRATION.md.
 */

export interface CompanyRow {
  active: boolean
  cnpj: string
  currency: string
  id: string
  name: string
  timezone: string
  trade_name: string
}

export interface BranchRow {
  active: boolean
  address: string
  company_id: string
  id: string
  name: string
}

interface CompaniesBridge {
  branches: (companyId: string) => Promise<{ branches: BranchRow[] }>
  list: () => Promise<{ companies: CompanyRow[] }>
  saveBranch: (payload: Record<string, unknown>) => Promise<{ error: string } | { branches: BranchRow[] }>
  saveCompany: (payload: Record<string, unknown>) => Promise<{ error: string } | { companies: CompanyRow[] }>
}

function bridge(): CompaniesBridge | null {
  const host = (globalThis as { hermesDesktop?: { companies?: CompaniesBridge } }).hermesDesktop

  return host?.companies ?? null
}

export function companiesAvailable(): boolean {
  return bridge() !== null
}

export async function listCompanies(): Promise<CompanyRow[]> {
  const api = bridge()

  if (!api) return []

  const r = await api.list()

  return Array.isArray(r?.companies) ? r.companies : []
}

export async function listBranches(companyId: string): Promise<BranchRow[]> {
  const api = bridge()

  if (!api) return []

  const r = await api.branches(companyId)

  return Array.isArray(r?.branches) ? r.branches : []
}

export async function saveCompany(payload: Record<string, unknown>): Promise<{ error: string } | { companies: CompanyRow[] }> {
  const api = bridge()

  if (!api) return { error: 'empresas_indisponivel' }

  const r = await api.saveCompany(payload)

  return 'error' in r ? r : { companies: r.companies }
}

export async function saveBranch(payload: Record<string, unknown>): Promise<{ error: string } | { branches: BranchRow[] }> {
  const api = bridge()

  if (!api) return { error: 'empresas_indisponivel' }

  const r = await api.saveBranch(payload)

  return 'error' in r ? r : { branches: r.branches }
}

/** CNPJ só com dígitos, como o main guarda. */
export function cnpjDigits(texto: string): string {
  return texto.replace(/\D/g, '')
}
