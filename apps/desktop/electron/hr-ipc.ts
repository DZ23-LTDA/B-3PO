// RH pelo IPC, com a política exposta ao renderer.
//
// A tela precisa saber ANTES de tentar que desligar e mudar salário exigem aprovação. Sem isso o
// usuário digita o novo salário, clica em salvar e recebe `salario_exige_aprovacao` — que parece
// defeito, não política.
//
// `hermes:hr:policy` existe para isso: o canal devolve a exigência antes da tentativa, e a tela
// desabilita o botão com o motivo. A recusa no store continua sendo a garantia final, porque
// frontend não é autoridade.
//
// PERMISSÃO (r221)
//
// RH é o domínio com dado pessoal mais sensível do produto: nome, cargo, salário (`withSalary`). `read` para as
// consultas — inclusive `policy`, `offboarding` e `treinamentos`, que são cálculo puro sobre o que o chamador
// manda e não tocam o disco. `execute` só nas duas escritas.
//
// Nota deliberada: `employees` com `withSalary: true` continua sendo `read`. Salário é leitura do cadastro, não
// execução — e esconder do nível READ o que a política já mostra seria segurança de fachada.

import type { IpcMainInvokeEvent } from 'electron'

import type { Department, Employee } from './hr-store'
import { HR_OPERATIONS, canDecide, type HrOperation } from './hr-policy'
import type { IpcRegistrar } from './ipc-types'
import { exigirAtor } from './permission-guard'
import type { Actor } from './rbac'
import { avaliarOffboarding, treinamentosImpeditivos, type ChecklistOffboarding, type Treinamento } from './hr-lifecycle'

export interface HrStoreLike {
  departments: (tenantId?: string) => Promise<Department[]>
  employees: (tenantId?: string, options?: { withSalary?: boolean }) => Promise<Employee[]>
  upsertDepartment: (input: unknown) => Promise<{ department: Department; departments: Department[] } | { error: string }>
  upsertEmployee: (input: unknown) => Promise<{ employee: Employee; employees: Employee[] } | { error: string }>
}

export interface HrIpcDeps {
  /** Ator resolvido no processo principal. `null` recusa. */
  actorOf: () => Promise<Actor | null>
}

type Denied = { error: 'sem_permissao'; reason: string }

export function registerHrIpc(ipcMain: IpcRegistrar, store: HrStoreLike, deps: HrIpcDeps): void {
  ipcMain.handle(
    'hermes:hr:departments',
    async (): Promise<Denied | { departments: Department[] }> =>
      exigirAtor(deps.actorOf, 'read', 'hr', async () => ({ departments: await store.departments() }))
  )

  ipcMain.handle(
    'hermes:hr:employees',
    async (_event: IpcMainInvokeEvent, withSalary: unknown): Promise<Denied | { employees: Employee[] }> =>
      exigirAtor(deps.actorOf, 'read', 'hr', async () => ({
        // Salario so sai quando pedido explicitamente: a tela padrao nao precisa dele.
        employees: await store.employees(undefined, { withSalary: withSalary === true })
      }))
  )

  ipcMain.handle(
    'hermes:hr:saveDepartment',
    async (_event: IpcMainInvokeEvent, payload: unknown) =>
      exigirAtor(deps.actorOf, 'execute', 'hr', async () => store.upsertDepartment(payload))
  )

  ipcMain.handle(
    'hermes:hr:saveEmployee',
    async (_event: IpcMainInvokeEvent, payload: unknown) =>
      exigirAtor(deps.actorOf, 'execute', 'hr', async () => store.upsertEmployee(payload))
  )

  // A politica vem do backend para a tela poder avisar antes, e nao so falhar depois.
  ipcMain.handle(
    'hermes:hr:policy',
    async (_event: IpcMainInvokeEvent, operation: unknown, reason: unknown) =>
      exigirAtor(deps.actorOf, 'read', 'hr', async () => {
        const op = HR_OPERATIONS.includes(operation as HrOperation) ? (operation as HrOperation) : null

        if (!op) {
          return { reason: 'operacao_desconhecida', required: true }
        }

        return canDecide(op, typeof reason === 'string' ? reason : '')
      })
  )
  // Offboarding: avalia o checklist de devolucao e diz o que falta, com os pendentes nomeados.
  //
  // NAO encerra o desligamento: quem decide isso e uma pessoa. O canal responde "pode encerrar?" e "o que
  // falta" — as duas perguntas que o RH precisa responder antes de assinar.
  ipcMain.handle(
    'hermes:hr:offboarding',
    async (_event: IpcMainInvokeEvent, payload: unknown) =>
      exigirAtor(deps.actorOf, 'read', 'hr', async () => {
        const raw = (payload ?? {}) as Record<string, unknown>
        const checklist: ChecklistOffboarding = {
          concluidos: Array.isArray(raw['concluidos']) ? raw['concluidos'] : [],
          exigidos: Array.isArray(raw['exigidos']) ? raw['exigidos'] : []
        }

        const resultado = avaliarOffboarding(checklist)

        // Narrowing por `in`: o discriminante `pode_encerrar` nao bastou para o TS estreitar aqui.
        if (!('pendentes' in resultado)) {
          return { bloqueia_acesso: false, pendentes: [] as string[], pode_encerrar: true }
        }

        return {
          bloqueia_acesso: resultado.pendentes.includes('acesso_sistemas'),
          pendentes: resultado.pendentes,
          pode_encerrar: false
        }
      })
  )

  // Treinamentos: quais obrigatorios estao pendentes ou vencidos numa data de referencia.
  //
  // `agora` vem no payload em vez de sair do relogio: dois relatorios do mesmo dia tem que concordar.
  ipcMain.handle(
    'hermes:hr:treinamentos',
    async (_event: IpcMainInvokeEvent, payload: unknown) =>
      exigirAtor(deps.actorOf, 'read', 'hr', async () => {
        const raw = (payload ?? {}) as Record<string, unknown>
        const treinamentos = Array.isArray(raw['treinamentos']) ? (raw['treinamentos'] as Treinamento[]) : []
        const agora = Number(raw['agora'])
        const referencia = Number.isFinite(agora) && agora > 0 ? agora : Date.now()

        return { impeditivos: treinamentosImpeditivos(treinamentos, referencia) }
      })
  )
}
