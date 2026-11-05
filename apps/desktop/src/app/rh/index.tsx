import { useCallback, useEffect, useState } from 'react'

import {
  EMPLOYEE_STATUS_LABELS,
  hrAvailable,
  hrPolicy,
  listDepartments,
  listEmployees,
  saveDepartment,
  saveEmployee,
  type DepartmentRow,
  type EmployeeRow
} from '@/api/hr'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/ui/loader'
import { useI18n } from '@/i18n/context'

import { DesligamentoPanel } from './desligamento-panel'

/**
 * RH.
 *
 * Duas coisas que esta tela faz de propósito:
 *
 * 1. **Salário não é carregado por padrão.** Há um botão para revelar; a lista sem ele não traz o
 *    valor. Dado sensível não vem de carona numa tela que não precisa dele.
 * 2. **Avisa antes, não depois.** Ao escolher "desligado" no status, a tela pergunta ao backend se a
 *    operação exige aprovação e desabilita o botão com o motivo. Deixar o usuário digitar tudo e
 *    receber `desligamento_exige_aprovacao` faria a política parecer defeito.
 */
export function RhView() {
  const { t } = useI18n()
  const copy = t.settings.rh

  const [departments, setDepartments] = useState<null | DepartmentRow[]>(null)
  const [employees, setEmployees] = useState<EmployeeRow[]>([])
  const [failure, setFailure] = useState<null | string>(null)
  const [aviso, setAviso] = useState('')
  const [comSalario, setComSalario] = useState(false)
  const [saving, setSaving] = useState(false)

  const [depNome, setDepNome] = useState('')
  const [nome, setNome] = useState('')
  const [cargo, setCargo] = useState('')
  const [depId, setDepId] = useState('')
  const [status, setStatus] = useState('ativo')

  const disponivel = hrAvailable()

  const carregar = useCallback(async () => {
    try {
      setDepartments(await listDepartments())
      setEmployees(await listEmployees(comSalario))
      setFailure(null)
    } catch {
      setFailure(copy.loadFailed)
      setDepartments([])
    }
  }, [comSalario, copy.loadFailed])

  useEffect(() => {
    if (disponivel) void carregar()
  }, [carregar, disponivel])

  // O aviso vem do backend quando o status escolhido exige aprovação.
  useEffect(() => {
    if (!disponivel || status === 'ativo' || status === 'ferias') {
      setAviso('')

      return
    }

    const operacao = status === 'desligado' ? 'desligar' : 'afastar'

    void hrPolicy(operacao).then(r => setAviso(r.required ? `${copy.approvalNeeded} — ${traduzir(r.reason)}` : ''))
  }, [status, disponivel, copy.approvalNeeded])

  function traduzir(chave: string): string {
    const mapa: Record<string, string> = {
      decision_required: copy.approvalNeeded,
      decisao_sobre_pessoa: copy.decisionAboutPerson,
      motivo_vedado: copy.forbiddenReason,
      operacao_desconhecida: copy.unknownOperation
    }

    if (chave.startsWith('motivo_vedado')) {
      return `${copy.forbiddenReason}: ${chave.split(':')[1] ?? ''}`
    }

    return mapa[chave] ?? chave
  }

  const erroDe = (chave: string): string => {
    const mapa: Record<string, string> = {
      departamento_nao_encontrado: copy.departmentRequired,
      department_required: copy.departmentRequired,
      desligamento_exige_aprovacao: copy.approvalNeeded,
      name_required: copy.nameRequired,
      salario_exige_aprovacao: copy.approvalNeeded
    }

    return mapa[chave] ?? chave
  }

  async function cadastrarDepartamento() {
    if (!depNome.trim()) {
      setFailure(copy.nameRequired)

      return
    }

    setSaving(true)

    try {
      const r = await saveDepartment({ name: depNome.trim() })

      if ('error' in r) {
        setFailure(erroDe(r.error))
      } else {
        setDepartments(r.departments)
        setDepNome('')
        setFailure(null)
      }
    } finally {
      setSaving(false)
    }
  }

  async function cadastrarColaborador() {
    if (!nome.trim() || !depId) {
      setFailure(!nome.trim() ? copy.nameRequired : copy.departmentRequired)

      return
    }

    setSaving(true)

    try {
      const r = await saveEmployee({ department_id: depId, job_title: cargo.trim(), name: nome.trim(), status })

      if ('error' in r) {
        setFailure(erroDe(r.error))
      } else {
        setEmployees(r.employees)
        setNome('')
        setCargo('')
        setStatus('ativo')
        setFailure(null)
      }
    } finally {
      setSaving(false)
    }
  }

  const campo = (rotulo: string, valor: string, aoMudar: (v: string) => void) => (
    <label className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
      <span className="text-(--ui-text-tertiary)">{rotulo}</span>
      <input
        className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)"
        onChange={event => aoMudar(event.target.value)}
        value={valor}
      />
    </label>
  )

  const bloqueado = aviso !== ''

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-6 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-foreground">{copy.title}</h1>
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">{copy.hint}</p>
      </header>

      {!disponivel ? (
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">{copy.unavailable}</p>
      ) : (
        <>
          {/* Desligamento: avalia o checklist e diz o que falta. Nao desliga ninguem — quem decide e uma pessoa. */}
          <DesligamentoPanel
            copy={{
              blocked: copy.offboardingBlocked,
              checkAll: copy.offboardingCheck,
              done: copy.offboardingDone,
              hint: copy.offboardingHint,
              pending: copy.offboardingPending,
              title: copy.offboardingTitle
            }}
          />

          <section className="grid gap-2 rounded-lg border border-(--ui-border) p-4 sm:grid-cols-2">
            {campo(copy.departmentName, depNome, setDepNome)}
            <div className="flex items-end">
              <Button disabled={saving} onClick={() => void cadastrarDepartamento()} variant="ghost">
                {copy.addDepartment}
              </Button>
            </div>
          </section>

          <section className="grid gap-2 rounded-lg border border-(--ui-border) p-4 sm:grid-cols-2 lg:grid-cols-4">
            {campo(copy.name, nome, setNome)}
            {campo(copy.jobTitle, cargo, setCargo)}
            <label className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
              <span className="text-(--ui-text-tertiary)">{copy.department}</span>
              <select
                className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)"
                onChange={event => setDepId(event.target.value)}
                value={depId}
              >
                <option value="">{copy.pickDepartment}</option>
                {(departments ?? []).map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
              <span className="text-(--ui-text-tertiary)">{copy.status}</span>
              <select
                className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)"
                onChange={event => setStatus(event.target.value)}
                value={status}
              >
                {Object.entries(EMPLOYEE_STATUS_LABELS).map(([valor, rotulo]) => (
                  <option key={valor} value={valor}>
                    {rotulo}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <Button disabled={saving || bloqueado} onClick={() => void cadastrarColaborador()}>
                {copy.addEmployee}
              </Button>
            </div>
          </section>

          {aviso ? (
            <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-warning, #d09b2c)">{aviso}</p>
          ) : null}

          {failure ? (
            <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-danger)">{failure}</p>
          ) : null}

          <div className="flex items-center justify-between">
            <span className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
              {copy.salaryHidden}
            </span>
            <Button onClick={() => setComSalario(v => !v)} variant="ghost">
              {comSalario ? copy.hideSalary : copy.showSalary}
            </Button>
          </div>

          {departments === null ? (
            <Loader />
          ) : employees.length === 0 ? (
            <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">{copy.empty}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {employees.map(employee => {
                const dep = (departments ?? []).find(d => d.id === employee.department_id)

                return (
                  <li
                    className="flex items-center justify-between gap-3 rounded-lg border border-(--ui-border) px-3 py-2"
                    key={employee.id}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{employee.name}</span>
                      <span className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
                        {employee.job_title || '—'} · {dep?.name ?? '—'} · {EMPLOYEE_STATUS_LABELS[employee.status] ?? employee.status}
                        {employee.salary_cents !== null ? ` · ${(employee.salary_cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : ''}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
