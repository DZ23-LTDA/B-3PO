import { backupRotativo } from './store-backup'
// RH: departamentos e colaboradores.
//
// O GOAL é explícito sobre o que este domínio NÃO pode fazer sozinho: "contratações, demissões,
// salários e decisões que afetem pessoas exigem aprovação humana" e "não permitir decisões
// discriminatórias automatizadas".
//
// Por isso o domínio é dividido em dois: o **registro** (quem existe, em que departamento, com que
// cargo) e a **política** (`hr-policy.ts`), que diz o que exige aprovação antes de virar fato. Um
// agente pode organizar o quadro e preparar uma proposta de mudança; ele não muda salário nem
// desliga ninguém.
//
// Dado sensível: salário não sai em listagem por padrão. Quem precisa do valor pede explicitamente —
// listagem que carrega salário para toda tela é vazamento esperando acontecer.

import { WriteQueue } from './write-queue'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { DEFAULT_TENANT } from './catalog-store'
import { cents } from './money'

export const EMPLOYEE_STATUSES = ['ativo', 'ferias', 'afastado', 'desligado'] as const

export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number]

export interface Department {
  active: boolean
  created_at: number
  id: string
  name: string
  tenant_id: string
  updated_at: number
}

export interface Employee {
  created_at: number
  department_id: string
  /** Cargo. Texto livre de propósito: cargo não é entidade deste domínio ainda. */
  job_title: string
  hired_at: number
  id: string
  name: string
  notes: string
  /** Só existe quando pedido explicitamente. `null` = não carregado, não "sem salário". */
  salary_cents: null | number
  status: EmployeeStatus
  tenant_id: string
  updated_at: number
}

export interface HrFile {
  departments: Department[]
  employees: Employee[]
  schema_version: 1
}

function empty(): HrFile {
  return { departments: [], employees: [], schema_version: 1 }
}

export function hrStorePath(userDataDir: string): string {
  return join(userDataDir, 'b3po', 'hr.json')
}

function texto(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function normalizeDepartment(input: unknown, now: number): { department: Department } | { error: string } {
  const raw = (input ?? {}) as Record<string, unknown>
  const name = texto(raw['name'])

  if (!name) {
    return { error: 'name_required' }
  }

  return {
    department: {
      active: raw['active'] === undefined ? true : raw['active'] === true,
      created_at: typeof raw['created_at'] === 'number' ? raw['created_at'] : now,
      id: texto(raw['id']) || `dep_${now}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      tenant_id: texto(raw['tenant_id']) || DEFAULT_TENANT,
      updated_at: now
    }
  }
}

export function normalizeEmployee(
  input: unknown,
  now: number,
  departments: readonly Department[]
): { employee: Employee } | { error: string } {
  const raw = (input ?? {}) as Record<string, unknown>
  const name = texto(raw['name'])

  if (!name) {
    return { error: 'name_required' }
  }

  const departmentId = texto(raw['department_id'])
  const tenant = texto(raw['tenant_id']) || DEFAULT_TENANT

  if (!departmentId) {
    return { error: 'department_required' }
  }

  // Departamento precisa existir NO MESMO tenant: funcionário apontando para departamento de outra
  // empresa é vazamento entre tenants, não erro de digitação tolerável.
  const existe = departments.some(d => d.id === departmentId && d.tenant_id === tenant)

  if (!existe) {
    return { error: 'departamento_nao_encontrado' }
  }

  const status = EMPLOYEE_STATUSES.includes(raw['status'] as EmployeeStatus) ? (raw['status'] as EmployeeStatus) : 'ativo'

  return {
    employee: {
      created_at: typeof raw['created_at'] === 'number' ? raw['created_at'] : now,
      department_id: departmentId,
      hired_at: typeof raw['hired_at'] === 'number' ? raw['hired_at'] : now,
      id: texto(raw['id']) || `emp_${now}_${Math.random().toString(36).slice(2, 8)}`,
      job_title: texto(raw['job_title']),
      name,
      notes: texto(raw['notes']),
      // `null` aqui significa "nao carregado". O valor so entra quando quem chamou pede.
      salary_cents: raw['salary_cents'] === undefined || raw['salary_cents'] === null ? null : cents(raw['salary_cents']),
      status,
      tenant_id: tenant,
      updated_at: now
    }
  }
}

export function parseHr(raw: string): HrFile {
  try {
    const parsed = JSON.parse(raw) as Partial<HrFile>

    if (!parsed || !Array.isArray(parsed.employees)) {
      return empty()
    }

    return {
      departments: Array.isArray(parsed.departments) ? parsed.departments.filter(d => d && typeof d.id === 'string') : [],
      employees: parsed.employees.filter(e => e && typeof e.id === 'string' && typeof e.name === 'string'),
      schema_version: 1
    }
  } catch {
    return empty()
  }
}

/** Lista sem salário. É a forma padrão — quem precisa do valor pede por `withSalary`. */
export function employeesFor(
  employees: readonly Employee[],
  tenantId: string = DEFAULT_TENANT,
  options: { withSalary?: boolean } = {}
): Employee[] {
  return employees
    .filter(e => e.tenant_id === tenantId)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    .map(e => (options.withSalary ? e : { ...e, salary_cents: null }))
}

/** Quantos ativos por departamento — indicador de quadro, sem dado pessoal. */
export function headcountByDepartment(employees: readonly Employee[], tenantId: string = DEFAULT_TENANT): Record<string, number> {
  const contagem: Record<string, number> = {}

  for (const e of employees) {
    if (e.tenant_id !== tenantId || e.status === 'desligado') continue

    contagem[e.department_id] = (contagem[e.department_id] ?? 0) + 1
  }

  return contagem
}

export class HrStore {
  constructor(private readonly filePath: string) {}

  /** Fila de escrita (r238): read -> valida -> write nao era serializado. Ver write-queue.ts. */
  private readonly fila = new WriteQueue()

  async departments(tenantId: string = DEFAULT_TENANT): Promise<Department[]> {
    const file = await this.read()

    return file.departments
      .filter(d => d.tenant_id === tenantId && d.active)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  }

  async employees(tenantId: string = DEFAULT_TENANT, options: { withSalary?: boolean } = {}): Promise<Employee[]> {
    return employeesFor((await this.read()).employees, tenantId, options)
  }

  async upsertDepartment(input: unknown): Promise<{ departments: Department[]; department: Department } | { error: string }> {
    return this.fila.serializar(() => this.upsertDepartmentSerializado(input))
  }

  private async upsertDepartmentSerializado(input: unknown): Promise<{ departments: Department[]; department: Department } | { error: string }> {
    const normalized = normalizeDepartment(input, Date.now())

    if ('error' in normalized) {
      return normalized
    }

    const file = await this.read()
    const department = normalized.department
    const indice = file.departments.findIndex(d => d.id === department.id)

    if (indice >= 0) {
      file.departments[indice] = { ...department, created_at: file.departments[indice]!.created_at }
    } else {
      file.departments.push(department)
    }

    await this.write(file)

    return { department, departments: await this.departments(department.tenant_id) }
  }

  /**
   * Grava um colaborador.
   *
   * Mudança de `status` para `desligado` e mudança de `salary_cents` **não** passam por aqui: quem
   * chama precisa da aprovação registrada em `hr-policy`. Este método recusa essas duas transições
   * quando o registro já existe, para que não exista caminho que as faça em silêncio.
   */
  async upsertEmployee(input: unknown): Promise<{ employee: Employee; employees: Employee[] } | { error: string }> {
    return this.fila.serializar(() => this.upsertEmployeeSerializado(input))
  }

  private async upsertEmployeeSerializado(input: unknown): Promise<{ employee: Employee; employees: Employee[] } | { error: string }> {
    const file = await this.read()
    const normalized = normalizeEmployee(input, Date.now(), file.departments)

    if ('error' in normalized) {
      return normalized
    }

    const employee = normalized.employee
    const existente = file.employees.find(e => e.id === employee.id)

    if (existente) {
      if (existente.status !== 'desligado' && employee.status === 'desligado') {
        return { error: 'desligamento_exige_aprovacao' }
      }

      if (existente.salary_cents !== null && employee.salary_cents !== null && existente.salary_cents !== employee.salary_cents) {
        return { error: 'salario_exige_aprovacao' }
      }
    }

    const indice = file.employees.findIndex(e => e.id === employee.id)

    if (indice >= 0) {
      file.employees[indice] = { ...employee, created_at: file.employees[indice]!.created_at }
    } else {
      file.employees.push(employee)
    }

    await this.write(file)

    return { employee, employees: await this.employees(employee.tenant_id) }
  }

  private async read(): Promise<HrFile> {
    try {
      return parseHr(await readFile(this.filePath, 'utf8'))
    } catch {
      return empty()
    }
  }

  private async write(file: HrFile): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true })
    const temp = `${this.filePath}.tmp`
    await writeFile(temp, JSON.stringify(file, null, 2), 'utf8')
    await backupRotativo(this.filePath)
    await rename(temp, this.filePath)
  }
}
