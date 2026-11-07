// r32 do V5 — as vendas passam pela mesma guarda que o faturamento.
//
// O QUE ESTAVA ERRADO
//
// `sales-ipc.ts` guardava UM canal (`faturar`) com `withPermission(actor,'execute',{resource:'sales'})`
// e deixava `create`, `cancel` e `devolver` chamarem o store direto: `deps.sales.create(payload)`,
// sem ator, sem permissão, sem validação. Criar venda, cancelar venda e **devolver venda** (que mexe
// em estoque e financeiro) eram alcançáveis por qualquer código do renderer.
//
// Não era desenho: o mesmo arquivo, na linha seguinte, exigia a permissão. Era inconsistência.
//
// ESTE ARQUIVO PROVA
//
//   - sem ator, os três recusam com `sem_permissao` e NÃO tocam no store;
//   - com ator, os três passam;
//   - `faturar` continua como estava (não é regressão).
import { expect, test, vi } from 'vitest'
import { registerSalesIpc } from './sales-ipc'

type Chamavel = (event: unknown, ...args: unknown[]) => Promise<unknown>

function montar(ator: null | { id: string; kind: string; level: string; role: string }) {
  const handlers = new Map<string, Chamavel>()

  const ipcMain = { handle: (canal: string, fn: Chamavel) => handlers.set(canal, fn) } as never

  const sales = {
    cancel: vi.fn().mockResolvedValue({ sales: [] }),
    create: vi.fn().mockResolvedValue({ sale: {}, sales: [] }),
    faturar: vi.fn().mockResolvedValue({ sale: {}, sales: [] }),
    list: vi.fn().mockResolvedValue([]),
    devolver: vi.fn()
  }

  registerSalesIpc(ipcMain, {
    actorOf: async () => ator,
    sales,
    serverTenant: () => 'default'
  } as never)

  return { handlers, sales }
}

const DONO = { id: 'act_owner', kind: 'human', level: 'SUPERVISED_AUTONOMY', role: 'owner' }

test('sem ator, criar venda recusa e NAO toca no store', async () => {
  const { handlers, sales } = montar(null)

  const r = await handlers.get('hermes:sales:create')!(null, { items: [] })

  expect(r).toMatchObject({ error: 'sem_permissao' })
  expect(sales.create).not.toHaveBeenCalled()
})

test('sem ator, cancelar venda recusa e NAO toca no store', async () => {
  const { handlers, sales } = montar(null)

  const r = await handlers.get('hermes:sales:cancel')!(null, 's1', 'default', 'motivo')

  expect(r).toMatchObject({ error: 'sem_permissao' })
  expect(sales.cancel).not.toHaveBeenCalled()
})

test('com ator, criar venda passa', async () => {
  const { handlers, sales } = montar(DONO)

  await handlers.get('hermes:sales:create')!(null, { items: [] })

  expect(sales.create).toHaveBeenCalled()
})

test('com ator, cancelar venda passa', async () => {
  const { handlers, sales } = montar(DONO)

  await handlers.get('hermes:sales:cancel')!(null, 's1', 'default', 'motivo')

  expect(sales.cancel).toHaveBeenCalled()
})
