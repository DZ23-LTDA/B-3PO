// Fontes de condicao para a varredura.
//
// Cada condicao e perguntada ao DONO do dominio — `service-desk` sabe o que esta atrasado, `finance`
// sabe o que esta vencendo. Este modulo nao calcula prazo nem atraso: ele traduz a resposta do dono para
// a forma que a varredura entende.
//
// A janela de vencimento e uma DECISAO DE PRODUTO, nao um detalhe: "conta.vencendo" e util quando avisa
// ANTES do vencimento, nao depois. VENCIMENTO_JANELA_DIAS existe para ser ajustada, e o valor esta numa
// constante so para que ajustar seja uma mudanca visivel.

import type { FinanceEntry } from './finance-store'
import type { Ticket } from './service-desk-store'
import { isOverdue } from './service-desk-store'
import type { Condition } from './automation-sweep'

/** Conta a vencer dentro desta janela dispara `conta.vencendo`. */
export const VENCIMENTO_JANELA_DIAS = 3

const JANELA_MS = VENCIMENTO_JANELA_DIAS * 86_400_000

/**
 * Tickets abertos cujo prazo ja passou.
 *
 * Usa `isOverdue` do proprio dominio: se a regra de atraso mudar la, a varredura acompanha sem que
 * ninguem precise lembrar deste arquivo.
 */
export function overdueConditions(
  tickets: readonly Ticket[],
  tenantId: string,
  now: number = Date.now()
): Condition[] {
  return tickets
    .filter(t => t.tenant_id === tenantId && isOverdue(t, now))
    .map(t => ({ entity_id: t.id, tenant_id: t.tenant_id, trigger: 'ticket.atrasado' as const }))
}

/**
 * Contas a pagar abertas que vencem na janela — e tambem as ja vencidas.
 *
 * A ja vencida entra porque "vence em 2 dias" e "venceu ha 2 dias" precisam de acao dos dois jeitos, e
 * um aviso que so cobre o futuro deixa a divida atrasada sem alerta nenhum.
 */
export function dueSoonConditions(
  entries: readonly FinanceEntry[],
  tenantId: string,
  now: number = Date.now()
): Condition[] {
  return entries
    .filter(e => {
      if (e.tenant_id !== tenantId) return false
      // Liquidada nao esta "vencendo": ja aconteceu. `pago` cobre pagamento e `cancelado` tira do ar.
      if (e.status !== 'aberto') return false
      if (e.kind !== 'pagar') return false

      return e.due_at > 0 && e.due_at <= now + JANELA_MS
    })
    .map(e => ({ entity_id: e.id, tenant_id: e.tenant_id, trigger: 'conta.vencendo' as const }))
}
