/**
 * RH no renderer.
 *
 * A política de aprovação vem do backend (`hermes:hr:policy`) para a tela avisar ANTES da tentativa.
 * A recusa no store continua sendo a garantia: frontend não é autoridade.
 */

export interface DepartmentRow {
  active: boolean
  id: string
  name: string
}

export interface EmployeeRow {
  department_id: string
  id: string
  job_title: string
  name: string
  /** `null` = não carregado (ou ausente). Nunca significa "sem salário". */
  salary_cents: null | number
  status: string
}

export interface PolicyAnswer {
  reason: string
  required: boolean
}

interface HrBridge {
  departments: () => Promise<{ departments: DepartmentRow[] }>
  employees: (withSalary: boolean) => Promise<{ employees: EmployeeRow[] }>
  policy: (operation: string, reason: string) => Promise<PolicyAnswer>
  saveDepartment: (payload: Record<string, unknown>) => Promise<{ error: string } | { departments: DepartmentRow[] }>
  saveEmployee: (payload: Record<string, unknown>) => Promise<{ error: string } | { employees: EmployeeRow[] }>
}

function bridge(): HrBridge | null {
  const host = (globalThis as { hermesDesktop?: { hr?: HrBridge } }).hermesDesktop

  return host?.hr ?? null
}

export function hrAvailable(): boolean {
  return bridge() !== null
}

export async function listDepartments(): Promise<DepartmentRow[]> {
  const api = bridge()

  if (!api) return []

  const r = await api.departments()

  return Array.isArray(r?.departments) ? r.departments : []
}

export async function listEmployees(withSalary = false): Promise<EmployeeRow[]> {
  const api = bridge()

  if (!api) return []

  const r = await api.employees(withSalary)

  return Array.isArray(r?.employees) ? r.employees : []
}

export async function saveDepartment(
  payload: Record<string, unknown>
): Promise<{ error: string } | { departments: DepartmentRow[] }> {
  const api = bridge()

  if (!api) return { error: 'rh_indisponivel' }

  const r = await api.saveDepartment(payload)

  return 'error' in r ? r : { departments: r.departments }
}

export async function saveEmployee(
  payload: Record<string, unknown>
): Promise<{ error: string } | { employees: EmployeeRow[] }> {
  const api = bridge()

  if (!api) return { error: 'rh_indisponivel' }

  const r = await api.saveEmployee(payload)

  return 'error' in r ? r : { employees: r.employees }
}

/** Pergunta ao backend se a operação exige aprovação — antes de tentar. */
export async function hrPolicy(operation: string, reason = ''): Promise<PolicyAnswer> {
  const api = bridge()

  if (!api) return { reason: 'rh_indisponivel', required: true }

  return api.policy(operation, reason)
}

export const EMPLOYEE_STATUS_LABELS: Record<string, string> = {
  afastado: 'afastado',
  ativo: 'ativo',
  desligado: 'desligado',
  ferias: 'férias'
}
