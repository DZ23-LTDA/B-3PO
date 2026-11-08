/**
 * A logística no renderer (r59 do GOAL V2).
 *
 * O QUE A TELA PODE E NÃO PODE FAZER
 *
 * `criar` e `transitar` são ações; `entregas` e `porPedido` são consulta. Nada aqui decide permissão — o
 * processo principal decide, e o renderer só descobre pela resposta.
 *
 * `ENTREGA_ERRO` traduz as recusas. Cada uma diz **o que fazer**, não o que falhou: `comprovante_obrigatorio`
 * não é um erro de sistema, é a informação de que falta o nome de quem recebeu.
 */

export const ENTREGA_STATUS = ['pendente', 'em_rota', 'entregue', 'recusada'] as const

export type EntregaStatus = (typeof ENTREGA_STATUS)[number]

export interface EntregaRow {
  created_at: number
  destino: string
  entregador: null | string
  comprovante: null | { recebido_em: number; recebedor: string }
  id: string
  order_id: string
  status: EntregaStatus
  tenant_id: string
  updated_at: number
}

interface Bridge {
  criar: (payload: Record<string, unknown>) => Promise<{ error: string } | { entrega: EntregaRow; entregas: EntregaRow[] }>
  entregas: (tenantId?: string) => Promise<{ entregas: EntregaRow[] }>
  porPedido: (orderId: string) => Promise<{ entrega: EntregaRow | null }>
  transitar: (payload: Record<string, unknown>) => Promise<{ error: string } | { entrega: EntregaRow; entregas: EntregaRow[] }>
}

function bridge(): Bridge | null {
  return (globalThis as { hermesDesktop?: { logistica?: Bridge } }).hermesDesktop?.logistica ?? null
}

export function logisticaDisponivel(): boolean {
  return bridge() !== null
}

export async function listarEntregas(): Promise<EntregaRow[]> {
  const api = bridge()

  if (!api) return []

  const r = await api.entregas()

  return Array.isArray(r?.entregas) ? r.entregas : []
}

/** A ligação com a venda: esta venda já saiu? `null` = não tem entrega — resposta, não falha. */
export async function entregaDoPedido(orderId: string): Promise<EntregaRow | null> {
  const api = bridge()

  if (!api || !orderId.trim()) return null

  const r = await api.porPedido(orderId)

  return r?.entrega ?? null
}

export async function criarEntrega(payload: {
  destino: string
  orderId: string
}): Promise<{ error: string } | { entregas: EntregaRow[] }> {
  const api = bridge()

  if (!api) return { error: 'logistica_indisponivel' }

  const r = await api.criar({ destino: payload.destino, order_id: payload.orderId })

  return 'error' in r ? r : { entregas: r.entregas }
}

export async function transitarEntrega(
  id: string,
  status: EntregaStatus,
  recebedor?: string
): Promise<{ error: string } | { entregas: EntregaRow[] }> {
  const api = bridge()

  if (!api) return { error: 'logistica_indisponivel' }

  const payload: Record<string, unknown> = { id, status }

  // Só manda `recebedor` quando há: um campo vazio no payload faria o canal recusar `entregue`, que é o
  // comportamento certo — mas enviá-lo vazio para `em_rota` apagaria a assunção do ator.
  if (recebedor && recebedor.trim()) payload['recebedor'] = recebedor.trim()

  const r = await api.transitar(payload)

  return 'error' in r ? r : { entregas: r.entregas }
}

/** As que precisam de ação — pendente ou em rota. */
export function entregasEmAberto(lista: readonly EntregaRow[]): EntregaRow[] {
  return lista.filter(e => e.status === 'pendente' || e.status === 'em_rota')
}

/**
 * O rótulo do status, em palavra.
 *
 * `em_rota` não é "pendente": uma está parada no depósito e a outra está na rua. Mostrar o código cru
 * obrigaria quem lê a traduzir — e a tela existe para não exigir isso.
 */
export const STATUS_LABEL: Record<EntregaStatus, string> = {
  em_rota: 'em rota',
  entregue: 'entregue',
  pendente: 'a sair',
  recusada: 'recusada'
}

export const ENTREGA_ERRO: Record<string, string> = {
  comprovante_obrigatorio: 'Informe quem recebeu a mercadoria. Sem isso não há comprovante.',
  destino_obrigatorio: 'Informe o endereço de entrega.',
  entrega_ja_existe: 'Esta venda já tem entrega registrada.',
  entrega_inexistente: 'Entrega não encontrada.',
  entrega_ja_finalizada: 'Esta entrega já terminou — entregue ou recusada não volta.',
  order_obrigatorio: 'Toda entrega precisa de uma venda.',
  status_invalido: 'Status desconhecido.',
  transicao_invalida: 'Essa mudança de status não é permitida neste ponto.'
}

export function entregaErroText(codigo: string): string {
  return ENTREGA_ERRO[codigo] ?? codigo
}

/** Data e hora legíveis, como na trilha de auditoria. */
export function quandoLabel(ms: number): string {
  try {
    return new Date(ms).toLocaleString('pt-BR')
  } catch {
    return String(ms)
  }
}
