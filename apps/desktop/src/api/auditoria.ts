/**
 * A trilha de auditoria no renderer (r36 do GOAL V2).
 *
 * O QUE A TELA PRECISA SABER, E QUE NÃO PODE INVENTAR
 *
 * `descartadas` vem junto de propósito: se o ledger truncou, quem lê precisa saber **quantas saíram**.
 * Uma lista que começa na "mais antiga que restou" sem dizê-lo daria a impressão de **histórico completo**.
 *
 * E não há função de escrita aqui — a trilha é **append-only**, e um cliente que pudesse apagar uma
 * entrada faria dela um registro que não serve como prova.
 */

export interface AuditRow {
  action: string
  actorId: string
  allowed: boolean
  at: number
  reason: string
  resource: string
  tenant_id: string
}

export interface AuditListing {
  descartadas: number
  entries: AuditRow[]
}

interface Bridge {
  listar: (payload: Record<string, unknown>) => Promise<{ descartadas: number; entries: AuditRow[] }>
}

function bridge(): Bridge | null {
  return (globalThis as { hermesDesktop?: { auditoria?: Bridge } }).hermesDesktop?.auditoria ?? null
}

export function auditoriaDisponivel(): boolean {
  return bridge() !== null
}

/** As decisões, mais recentes primeiro. */
export async function listarAuditoria(limite?: number): Promise<AuditListing | null> {
  const api = bridge()

  if (!api) return null

  const r = await api.listar(limite ? { limite } : {})

  return { descartadas: r?.descartadas ?? 0, entries: Array.isArray(r?.entries) ? r.entries : [] }
}

/** Data e hora legíveis. A trilha é lida por quem investiga — ISO truncado é pior de escanear. */
export function quandoLabel(ms: number): string {
  try {
    return new Date(ms).toLocaleString('pt-BR')
  } catch {
    return String(ms)
  }
}

/** O veredito em palavra, não em booleano. "false" não diz a ninguém o que aconteceu. */
export function vereditoLabel(allowed: boolean): string {
  return allowed ? 'permitido' : 'negado'
}

/**
 * O motivo, traduzido.
 *
 * Os códigos vêm do `rbac`/`permission-guard`. Mostrar `sem_ator` cru para quem investiga obriga a
 * procurar o que significa — e a trilha existe para ser entendida.
 */
export const MOTIVO_LABEL: Record<string, string> = {
  abaixo_do_nivel: 'nível insuficiente',
  bot_sem_escopo: 'agente sem escopo no domínio',
  humano_apenas: 'ação exclusiva de humano',
  nivel_insuficiente: 'nível insuficiente',
  sem_ator: 'chamada sem identidade',
  sem_nivel: 'ator sem nível efetivo'
}

export function motivoLabel(motivo: string): string {
  if (!motivo) return '—'

  return MOTIVO_LABEL[motivo] ?? motivo
}
