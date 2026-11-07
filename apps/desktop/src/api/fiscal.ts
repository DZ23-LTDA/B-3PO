/**
 * Documento fiscal no renderer.
 *
 * A ponte fica em `hermesDesktop.fiscal` (não em `hermes`) — o erro da r99.
 *
 * O que a tela NUNCA faz: dizer "nota autorizada" por conta própria. `homologacao` vem do registro do
 * servidor; quando é `true`, o rótulo é "homologação" e não há promessa de validade fiscal.
 */

/**
 * Mínimo de caracteres da justificativa de cancelamento (regra da NF-e).
 *
 * Duplicado aqui de propósito: o renderer não importa de lectron/. O valor é o MESMO do backend, e se
 * divergir o servidor recusa — a tela só antecipa o aviso, não decide.
 */
export const MOTIVO_MINIMO = 15

export const FISCAL_KINDS = ['nfe', 'nfce', 'nfse'] as const
export type FiscalKind = (typeof FISCAL_KINDS)[number]

export const KIND_LABEL: Record<FiscalKind, string> = {
  nfce: 'NFC-e (consumidor)',
  nfe: 'NF-e',
  nfse: 'NFS-e (serviço)'
}

export const STATUS_LABEL: Record<string, string> = {
  autorizado: 'Autorizada',
  cancelado: 'Cancelada',
  pendente: 'Pendente',
  rejeitado: 'Rejeitada'
}

export interface FiscalRow {
  chave: string
  homologacao: boolean
  id: string
  kind: FiscalKind
  mensagem: string
  numero: string
  ref: string
  status: string
  url_danfe: string
}

export interface FiscalStatus {
  faltando: string[]
  homologado: boolean
  id: string
  nome: string
}

interface Ponte {
  cancelar?: (pedido: unknown) => Promise<unknown>
  emitir?: (pedido: unknown) => Promise<unknown>
  list?: () => Promise<unknown>
  status?: () => Promise<unknown>
}

function bridge(): Ponte | undefined {
  return (globalThis as { hermesDesktop?: { fiscal?: Ponte } }).hermesDesktop?.fiscal
}

export function fiscalAvailable(): boolean {
  const b = bridge()

  return Boolean(b?.emitir && b?.list && b?.status)
}

export async function listFiscal(): Promise<FiscalRow[]> {
  const chamar = bridge()?.list

  if (!chamar) return []

  const r = (await chamar()) as { documents?: FiscalRow[] }

  return r.documents ?? []
}

export async function fiscalStatus(): Promise<FiscalStatus | null> {
  const chamar = bridge()?.status

  if (!chamar) return null

  return (await chamar()) as FiscalStatus
}

export async function emitirNota(saleId: string, kind: FiscalKind = 'nfe'): Promise<{ error: string } | { record: FiscalRow }> {
  const chamar = bridge()?.emitir

  if (!chamar) return { error: 'ponte_indisponivel' }

  const r = (await chamar({ kind, sale_id: saleId })) as { error?: string; record?: FiscalRow; existing?: boolean }

  return r.error ? { error: r.error } : { record: r.record as FiscalRow }
}

export async function cancelarNota(saleId: string, motivo: string): Promise<{ error: string } | { record: FiscalRow }> {
  const chamar = bridge()?.cancelar

  if (!chamar) return { error: 'ponte_indisponivel' }

  const r = (await chamar({ motivo, sale_id: saleId })) as { error?: string; record?: FiscalRow }

  return r.error ? { error: r.error } : { record: r.record as FiscalRow }
}

const MOTIVOS: Record<string, string> = {
  chave_de_outro_provedor: 'Este documento foi emitido por outro emissor e não pode ser tratado aqui.',
  documento_nao_autorizado: 'Só documento autorizado pode ser cancelado.',
  documento_nao_encontrado: 'Esta venda ainda não tem nota emitida.',
  motivo_obrigatorio: 'Informe o motivo do cancelamento.',
  nao_configurado: 'O emissor está escolhido, mas falta a credencial. Veja Configurações › Fiscal.',
  pedido_invalido: 'Pedido em formato inesperado.',
  ponte_indisponivel: 'Esta versão do aplicativo não emite nota fiscal.',
  venda_obrigatoria: 'Selecione a venda.'
}

export function fiscalErrorText(codigo: string): string {
  return MOTIVOS[codigo.split(':')[0] ?? ''] ?? 'Não foi possível concluir agora.'
}
