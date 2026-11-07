import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { canDecide, forbiddenReason, mayPrepare, requiresApproval } from './hr-policy'
import { HrStore, employeesFor, headcountByDepartment, hrStorePath, parseHr, type Employee } from './hr-store'
import type { Actor } from './rbac'

async function withStore<T>(run: (store: HrStore) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'b3po-hr-'))

  try {
    return await run(new HrStore(hrStorePath(dir)))
  } finally {
    await rm(dir, { force: true, recursive: true })
  }
}

const bot = (over: Partial<Actor> = {}): Actor => ({
  id: 'b1',
  kind: 'bot',
  level: 'SUPERVISED_AUTONOMY',
  role: 'bot',
  scopes: ['hr'],
  ...over
})

describe('departamentos e colaboradores', () => {
  it('exige nome no departamento', async () => {
    await withStore(async store => {
      expect(await store.upsertDepartment({ name: ' ' })).toEqual({ error: 'name_required' })
    })
  })

  it('cadastra colaborador no departamento e lista por nome', async () => {
    await withStore(async store => {
      const d = await store.upsertDepartment({ name: 'Operações' })
      if (!('department' in d)) return

      await store.upsertEmployee({ department_id: d.department.id, name: 'Zeca', salary_cents: '3.500,00' })
      await store.upsertEmployee({ department_id: d.department.id, name: 'Ana' })

      expect((await store.employees()).map(e => e.name)).toEqual(['Ana', 'Zeca'])
    })
  })

  it('exige departamento existente e do mesmo tenant', async () => {
    await withStore(async store => {
      await expect(store.upsertEmployee({ name: 'Ana' })).resolves.toEqual({ error: 'department_required' })
      await expect(store.upsertEmployee({ department_id: 'nao-existe', name: 'Ana' })).resolves.toEqual({
        error: 'departamento_nao_encontrado'
      })

      const outra = await store.upsertDepartment({ name: 'Outra empresa', tenant_id: 'emp_2' })
      if (!('department' in outra)) return

      // Departamento de outro tenant nao serve: seria vazamento entre empresas.
      await expect(
        store.upsertEmployee({ department_id: outra.department.id, name: 'Ana', tenant_id: 'local' })
      ).resolves.toEqual({ error: 'departamento_nao_encontrado' })
    })
  })

  it('SALARIO NAO SAI na listagem por padrao', async () => {
    await withStore(async store => {
      const d = await store.upsertDepartment({ name: 'TI' })
      if (!('department' in d)) return

      await store.upsertEmployee({ department_id: d.department.id, name: 'Ana', salary_cents: 500000 })

      const semSalario = await store.employees()

      expect(semSalario[0]!.salary_cents).toBeNull()

      const comSalario = await store.employees('local', { withSalary: true })

      expect(comSalario[0]!.salary_cents).toBe(500000)
    })
  })

  it('recusa desligar pelo caminho comum', async () => {
    await withStore(async store => {
      const d = await store.upsertDepartment({ name: 'TI' })
      if (!('department' in d)) return

      const criado = await store.upsertEmployee({ department_id: d.department.id, name: 'Ana' })
      if (!('employee' in criado)) return

      const r = await store.upsertEmployee({ id: criado.employee.id, department_id: d.department.id, name: 'Ana', status: 'desligado' })

      expect(r).toEqual({ error: 'desligamento_exige_aprovacao' })
    })
  })

  it('recusa mudar salario pelo caminho comum', async () => {
    await withStore(async store => {
      const d = await store.upsertDepartment({ name: 'TI' })
      if (!('department' in d)) return

      const criado = await store.upsertEmployee({ department_id: d.department.id, name: 'Ana', salary_cents: 500000 })
      if (!('employee' in criado)) return

      const r = await store.upsertEmployee({ department_id: d.department.id, id: criado.employee.id, name: 'Ana', salary_cents: 900000 })

      expect(r).toEqual({ error: 'salario_exige_aprovacao' })
    })
  })

  it('headcount ignora desligado', () => {
    const base: Employee = {
      created_at: 0,
      department_id: 'd1',
      hired_at: 0,
      id: 'e',
      job_title: '',
      name: 'X',
      notes: '',
      salary_cents: null,
      status: 'ativo',
      tenant_id: 'local',
      updated_at: 0
    }

    expect(headcountByDepartment([base, { ...base, id: 'f' }, { ...base, id: 'g', status: 'desligado' }])).toEqual({ d1: 2 })
  })

  it('employeesFor filtra por tenant', () => {
    const base: Employee = {
      created_at: 0,
      department_id: 'd1',
      hired_at: 0,
      id: 'e',
      job_title: '',
      name: 'X',
      notes: '',
      salary_cents: 100,
      status: 'ativo',
      tenant_id: 'local',
      updated_at: 0
    }

    expect(employeesFor([base, { ...base, id: 'f', tenant_id: 'emp_2' }])).toHaveLength(1)
  })

  it('arquivo corrompido vira vazio', () => {
    expect(parseHr('nao e json')).toEqual({ departments: [], employees: [], schema_version: 1 })
  })
})

describe('politica de aprovacao', () => {
  it('marcar ponto e cargo NAO exigem aprovacao', () => {
    expect(requiresApproval('cadastrar_colaborador').required).toBe(false)
    expect(requiresApproval('alterar_cargo').required).toBe(false)
  })

  it('salario, desligamento e afastamento EXIGEM', () => {
    for (const op of ['alterar_salario', 'desligar', 'afastar'] as const) {
      expect(requiresApproval(op).required).toBe(true)
    }
  })

  it('bot pode PREPARAR no escopo hr, mas nao fora dele', () => {
    expect(mayPrepare(bot(), 'desligar')).toBe(true)
    expect(mayPrepare(bot({ scopes: ['inventory'] }), 'desligar')).toBe(false)
  })

  it('aceita humano sem restricao de escopo', () => {
    expect(mayPrepare({ id: 'u1', kind: 'human', level: 'READ', role: 'viewer' }, 'desligar')).toBe(true)
  })

  it('motivo vedado e recusado e nomeado', () => {
    expect(forbiddenReason('por causa da idade')).toBe('idade')
    expect(forbiddenReason('redução por gênero')).toBe('genero')
    expect(forbiddenReason('corte de custos')).toBe('')
  })

  it('canDecide bloqueia decisao apoiada em motivo vedado', () => {
    const r = canDecide('desligar', 'por causa da idade')

    expect(r.required).toBe(true)
    expect(r.reason).toBe('motivo_vedado:idade')
  })

  it('LIMITACAO CONHECIDA: sinonimo nao e pego pela lista literal', () => {
    // "velho" nao casa com "idade". A lista e barreira minima, nao classificador, e isto esta aqui
    // para que ninguem leia `canDecide` como garantia de decisao justa. A garantia real e a
    // aprovacao humana obrigatoria; a lista so impede o obvio.
    expect(canDecide('desligar', 'muito velho para a funcao').reason).toBe('decisao_sobre_pessoa')
  })

  it('canDecide aceita motivo legitimo, mas ainda exige aprovacao', () => {
    expect(canDecide('desligar', 'fim do contrato temporario')).toEqual({
      reason: 'decisao_sobre_pessoa',
      required: true
    })
  })
})
