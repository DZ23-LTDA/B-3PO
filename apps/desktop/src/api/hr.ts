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
  offboarding: (payload: Record<string, unknown>) => Promise<{
    bloqueia_acesso: boolean
    pendentes: string[]
    pode_encerrar: boolean
  }>
  policy: (operation: string, reason: string) => Promise<PolicyAnswer>
  saveDepartment: (payload: Record<string, unknown>) => Promise<{ error: string } | { departments: DepartmentRow[] }>
  saveEmployee: (payload: Record<string, unknown>) => Promise<{ error: string } | { employees: EmployeeRow[] }>
  treinamentos: (payload: Record<string, unknown>) => Promise<{ impeditivos: { id: string; situacao: string }[] }>
}

function bridge(): HrBridge | null {
  const host = (globalThis as { hermesDesktop?: { hr?: HrBridge } }).hermesDesktop

  return host?.hr ?? null
}

/** Itens que a empresa exige de volta no desligamento. */
export type ItemDevolucao = 'acesso_sistemas' | 'cracha' | 'equipamento' | 'ferramentas' | 'veiculo' | 'documentos_confidenciais'

export interface ResultadoOffboarding {
  /** `true` quando o pendente e acesso a sistemas — o unico que continua permitindo agir em nome da empresa. */
  bloqueia_acesso: boolean
  pendentes: string[]
  pode_encerrar: boolean
}

/**
 * Avalia o checklist de desligamento. Devolve o que falta, com os itens nomeados.
 *
 * Sem preload, devolve "nada a fazer" em vez de lancar: a tela de RH roda em teste e em navegador sem Electron.
 */
export async function avaliarOffboarding(
  exigidos: readonly ItemDevolucao[],
  concluidos: readonly ItemDevolucao[]
): Promise<ResultadoOffboarding> {
  const api = bridge()

  if (!api) return { bloqueia_acesso: false, pendentes: [], pode_encerrar: true }

  return api.offboarding({ concluidos, exigidos })
}

/**
 * Treinamentos obrigatorios pendentes ou vencidos.
 *
 * `agora` e parametro e nao relogio: dois relatorios do mesmo dia tem que concordar.
 */
export async function treinamentosImpeditivos(
  treinamentos: readonly { concluido_em: number | null; id: string; obrigatorio: boolean; validade_dias: number | null }[],
  agora: number
): Promise<{ id: string; situacao: string }[]> {
  const api = bridge()

  if (!api) return []

  const r = await api.treinamentos({ agora, treinamentos })

  return Array.isArray(r?.impeditivos) ? r.impeditivos : []
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
