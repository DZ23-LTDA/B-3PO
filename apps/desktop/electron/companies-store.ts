// Empresas e filiais — a base do multitenancy.
//
// Hoje todos os domínios gravam `tenant_id = 'local'`. Este store cria o registro canônico que vai
// substituir essa constante: com empresa cadastrada, o tenant passa a ser o id dela.
//
// O que ele **não** faz ainda: trocar o tenant de dados existentes. `DEFAULT_TENANT` continua sendo
// `local` até a migração de dados, que precisa de backup e rollback — e é por isso que ela é uma
// decisão separada, não um efeito colateral de cadastrar empresa.
//
// Regras que protegem o dado:
// - CNPJ único: duas empresas com o mesmo CNPJ são a mesma empresa, e aceitar as duas cria dois
//   lugares para lançar a mesma despesa.
// - Empresa com filial ativa não é removida por engano: filial órfã some da tela e continua no disco.

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

export interface Company {
  active: boolean
  cnpj: string
  created_at: number
  currency: string
  id: string
  name: string
  timezone: string
  trade_name: string
  updated_at: number
}

export interface Branch {
  active: boolean
  address: string
  company_id: string
  created_at: number
  id: string
  name: string
  updated_at: number
}

export interface CompaniesFile {
  branches: Branch[]
  companies: Company[]
  schema_version: 1
}

function empty(): CompaniesFile {
  return { branches: [], companies: [], schema_version: 1 }
}

export function companiesStorePath(userDataDir: string): string {
  return join(userDataDir, 'b3po', 'companies.json')
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function normalizeCompany(input: unknown, now: number): { error: string } | { company: Company } {
  const raw = (input ?? {}) as Record<string, unknown>
  const name = text(raw['name'])

  if (!name) {
    return { error: 'name_required' }
  }

  return {
    company: {
      active: raw['active'] === undefined ? true : raw['active'] === true,
      cnpj: text(raw['cnpj']).replace(/\D/g, ''),
      created_at: typeof raw['created_at'] === 'number' ? raw['created_at'] : now,
      currency: (text(raw['currency']) || 'BRL').toUpperCase(),
      id: text(raw['id']) || `emp_${now}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      timezone: text(raw['timezone']) || 'America/Sao_Paulo',
      trade_name: text(raw['trade_name']),
      updated_at: now
    }
  }
}

export function normalizeBranch(input: unknown, now: number): { error: string } | { branch: Branch } {
  const raw = (input ?? {}) as Record<string, unknown>
  const name = text(raw['name'])
  const company = text(raw['company_id'])

  if (!company) {
    return { error: 'company_required' }
  }

  if (!name) {
    return { error: 'name_required' }
  }

  return {
    branch: {
      active: raw['active'] === undefined ? true : raw['active'] === true,
      address: text(raw['address']),
      company_id: company,
      created_at: typeof raw['created_at'] === 'number' ? raw['created_at'] : now,
      id: text(raw['id']) || `fil_${now}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      updated_at: now
    }
  }
}

export function parseCompanies(raw: string): CompaniesFile {
  try {
    const parsed = JSON.parse(raw) as Partial<CompaniesFile>
    const companies = Array.isArray(parsed?.companies)
      ? parsed.companies.filter(entry => !!entry && typeof entry.id === 'string' && typeof entry.name === 'string')
      : []
    const branches = Array.isArray(parsed?.branches)
      ? parsed.branches.filter(
          entry => !!entry && typeof entry.id === 'string' && typeof entry.company_id === 'string'
        )
      : []

    return { branches, companies, schema_version: 1 }
  } catch {
    return empty()
  }
}

/** Filiais de uma empresa. */
export function branchesOf(branches: readonly Branch[], companyId: string): Branch[] {
  return branches.filter(branch => branch.company_id === companyId).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}

export class CompaniesStore {
  constructor(private readonly filePath: string) {}

  async list(): Promise<Company[]> {
    const file = await this.read()

    return [...file.companies].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  }

  async branches(companyId: string): Promise<Branch[]> {
    return branchesOf((await this.read()).branches, companyId)
  }

  async upsertCompany(input: unknown): Promise<{ companies: Company[]; company: Company } | { error: string }> {
    const normalized = normalizeCompany(input, Date.now())

    if ('error' in normalized) {
      return normalized
    }

    const file = await this.read()
    const company = normalized.company

    // CNPJ vazio não participa da unicidade: empresa sem CNPJ cadastrado é permitida.
    if (
      company.cnpj &&
      file.companies.some(entry => entry.id !== company.id && entry.cnpj === company.cnpj)
    ) {
      return { error: 'cnpj_duplicado' }
    }

    const indice = file.companies.findIndex(entry => entry.id === company.id)

    if (indice >= 0) {
      file.companies[indice] = { ...company, created_at: file.companies[indice]!.created_at }
    } else {
      file.companies.push(company)
    }

    await this.write(file)

    return { companies: await this.list(), company }
  }

  async upsertBranch(input: unknown): Promise<{ branch: Branch; branches: Branch[] } | { error: string }> {
    const normalized = normalizeBranch(input, Date.now())

    if ('error' in normalized) {
      return normalized
    }

    const file = await this.read()
    const branch = normalized.branch

    // Filial apontando para empresa inexistente seria um registro que ninguém alcança.
    if (!file.companies.some(company => company.id === branch.company_id)) {
      return { error: 'empresa_nao_encontrada' }
    }

    const indice = file.branches.findIndex(entry => entry.id === branch.id)

    if (indice >= 0) {
      file.branches[indice] = { ...branch, created_at: file.branches[indice]!.created_at }
    } else {
      file.branches.push(branch)
    }

    await this.write(file)

    return { branch, branches: branchesOf(file.branches, branch.company_id) }
  }

  private async read(): Promise<CompaniesFile> {
    try {
      return parseCompanies(await readFile(this.filePath, 'utf8'))
    } catch {
      return empty()
    }
  }

  private async write(file: CompaniesFile): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true })
    const temp = `${this.filePath}.tmp`
    await writeFile(temp, JSON.stringify(file, null, 2), 'utf8')
    await rename(temp, this.filePath)
  }
}
