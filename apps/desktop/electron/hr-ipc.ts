// RH pelo IPC, com a política exposta ao renderer.
//
// A tela precisa saber ANTES de tentar que desligar e mudar salário exigem aprovação. Sem isso o
// usuário digita o novo salário, clica em salvar e recebe `salario_exige_aprovacao` — que parece
// defeito, não política.
//
// `hermes:hr:policy` existe para isso: o canal devolve a exigência antes da tentativa, e a tela
// desabilita o botão com o motivo. A recusa no store continua sendo a garantia final, porque
// frontend não é autoridade.

import type { IpcMainInvokeEvent } from 'electron'

import type { Department, Employee } from './hr-store'
import { HR_OPERATIONS, canDecide, type HrOperation } from './hr-policy'
import type { IpcRegistrar } from './ipc-types'

export interface HrStoreLike {
  departments: (tenantId?: string) => Promise<Department[]>
  employees: (tenantId?: string, options?: { withSalary?: boolean }) => Promise<Employee[]>
  upsertDepartment: (input: unknown) => Promise<{ department: Department; departments: Department[] } | { error: string }>
  upsertEmployee: (input: unknown) => Promise<{ employee: Employee; employees: Employee[] } | { error: string }>
}

export function registerHrIpc(ipcMain: IpcRegistrar, store: HrStoreLike): void {
  ipcMain.handle(
    'hermes:hr:departments',
    async (): Promise<{ departments: Department[] }> => ({ departments: await store.departments() })
  )

  ipcMain.handle(
    'hermes:hr:employees',
    async (_event: IpcMainInvokeEvent, withSalary: unknown): Promise<{ employees: Employee[] }> => ({
      // Salario so sai quando pedido explicitamente: a tela padrao nao precisa dele.
      employees: await store.employees(undefined, { withSalary: withSalary === true })
    })
  )

  ipcMain.handle(
    'hermes:hr:saveDepartment',
    (_event: IpcMainInvokeEvent, payload: unknown) => store.upsertDepartment(payload)
  )

  ipcMain.handle('hermes:hr:saveEmployee', (_event: IpcMainInvokeEvent, payload: unknown) => store.upsertEmployee(payload))

  // A politica vem do backend para a tela poder avisar antes, e nao so falhar depois.
  ipcMain.handle(
    'hermes:hr:policy',
    async (_event: IpcMainInvokeEvent, operation: unknown, reason: unknown): Promise<{ reason: string; required: boolean }> => {
      const op = HR_OPERATIONS.includes(operation as HrOperation) ? (operation as HrOperation) : null

      if (!op) {
        return { reason: 'operacao_desconhecida', required: true }
      }

      return canDecide(op, typeof reason === 'string' ? reason : '')
    }
  )
}
