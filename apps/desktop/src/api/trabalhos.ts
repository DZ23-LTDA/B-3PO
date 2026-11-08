/**
 * O trabalho pontual no renderer (r86 do GOAL V2).
 *
 * O TERCEIRO TIPO DO §12, e o único que **expira**.
 *
 * A TELA NÃO CALCULA A EXPIRAÇÃO
 *
 * `expirado` vem do processo principal, que compara `expira_em` com o relógio **dele**. Se a tela fizesse a
 * conta, um renderer com relógio adiantado mostraria vencido o que ainda vale — e a pessoa descartaria
 * trabalho vivo.
 *
 * `vencidos` é uma **consulta separada**, não um filtro local: no processo principal, ele é a mesma função
 * que decide o que a faxina pega.
 */

export const TRABALHO_TIPOS = ['documento', 'pesquisa', 'apresentacao', 'analise', 'codigo', 'artefato'] as const

export type TrabalhoTipo = (typeof TRABALHO_TIPOS)[number]

export const TRABALHO_STATUS = ['pedido', 'entregue', 'descartado'] as const

export type TrabalhoStatus = (typeof TRABALHO_STATUS)[number]

export interface TrabalhoRow {
  created_at: number
  entrega: null | { onde: string; resumo: string }
  expira_em: number
  id: string
  pedido: string
  status: TrabalhoStatus
  tenant_id: string
  tipo: TrabalhoTipo
  updated_at: number
}

/** O que a tela mostra no lugar do tipo cru. */
export const TIPO_LABEL: Record<TrabalhoTipo, string> = {
  analise: 'análise',
  apresentacao: 'apresentação',
  artefato: 'artefato',
  codigo: 'código',
  documento: 'documento',
  pesquisa: 'pesquisa'
}

export const STATUS_LABEL: Record<TrabalhoStatus, string> = {
  descartado: 'descartado',
  entregue: 'entregue',
  pedido: 'pedido'
}

/**
 * As recusas, traduzidas para o que fazer.
 *
 * `entrega_incompleta` é a que mais importa: ela **não é um erro de sistema** — é a informação de que **falta
 * dizer onde a coisa está**.
 */
export const TRABALHO_ERRO: Record<string, string> = {
  entrega_incompleta:
    'Diga onde o resultado está e resuma-o em uma frase. Sem isso não há entrega, só promessa.',
  descricao_obrigatoria: 'Escreva o que precisa ser feito.',
  prazo_invalido: 'O prazo não é válido.',
  status_invalido: 'Estado inválido.',
  trabalho_finalizado: 'Entregue ou descartado não volta.',
  trabalho_inexistente: 'Este trabalho não existe mais.',
  trabalho_obrigatorio: 'Trabalho não informado.',
  tipo_invalido: 'Tipo de trabalho inválido.'
}

export function trabalhoErroText(codigo: string): string {
  return TRABALHO_ERRO[codigo] ?? `Não foi possível: ${codigo}`
}

interface Bridge {
  abertos: (tenantId?: string) => Promise<{ error: string } | { trabalhos: TrabalhoRow[] }>
  criar: (payload: Record<string, unknown>) => Promise<{ error: string } | { trabalho: TrabalhoRow; trabalhos: TrabalhoRow[] }>
  descartarVencidos: (tenantId?: string) => Promise<{ descartados: number; trabalhos: TrabalhoRow[] }>
  listar: (tenantId?: string) => Promise<{ error: string } | { trabalhos: TrabalhoRow[] }>
  mudar: (payload: Record<string, unknown>) => Promise<{ error: string } | { trabalho: TrabalhoRow; trabalhos: TrabalhoRow[] }>
  vencidos: (tenantId?: string) => Promise<{ error: string } | { trabalhos: TrabalhoRow[] }>
}

function bridge(): Bridge | null {
  return (globalThis as { hermesDesktop?: { trabalhos?: Bridge } }).hermesDesktop?.trabalhos ?? null
}

export function trabalhosDisponivel(): boolean {
  return bridge() !== null
}

export async function listarTrabalhos(): Promise<TrabalhoRow[]> {
  const api = bridge()

  if (!api) return []

  const r = await api.listar()

  return 'trabalhos' in r ? r.trabalhos : []
}

export async function trabalhosAbertos(): Promise<TrabalhoRow[]> {
  const api = bridge()

  if (!api) return []

  const r = await api.abertos()

  return 'trabalhos' in r ? r.trabalhos : []
}

export async function trabalhosVencidos(): Promise<TrabalhoRow[]> {
  const api = bridge()

  if (!api) return []

  const r = await api.vencidos()

  return 'trabalhos' in r ? r.trabalhos : []
}

export async function criarTrabalho(input: {
  pedido: string
  tipo: TrabalhoTipo
}): Promise<{ error: string } | { trabalho: TrabalhoRow; trabalhos: TrabalhoRow[] }> {
  const api = bridge()

  if (!api) return { error: 'indisponivel' }

  return api.criar(input)
}

export async function entregarTrabalho(
  id: string,
  onde: string,
  resumo: string
): Promise<{ error: string } | { trabalho: TrabalhoRow; trabalhos: TrabalhoRow[] }> {
  const api = bridge()

  if (!api) return { error: 'indisponivel' }

  return api.mudar({ entrega: { onde, resumo }, id, status: 'entregue' })
}

export async function descartarTrabalho(
  id: string
): Promise<{ error: string } | { trabalho: TrabalhoRow; trabalhos: TrabalhoRow[] }> {
  const api = bridge()

  if (!api) return { error: 'indisponivel' }

  return api.mudar({ id, status: 'descartado' })
}

/** A faxina — **ação**, não efeito de leitura. Devolve **quantos** saíram. */
export async function descartarVencidos(): Promise<{ descartados: number; trabalhos: TrabalhoRow[] }> {
  const api = bridge()

  if (!api) return { descartados: 0, trabalhos: [] }

  return api.descartarVencidos()
}

/**
 * Quantos dias faltam.
 *
 * `null` quando já venceu ou quando o trabalho não é mais pedido — **a ausência é dita**, em vez de virar
 * "0 dias", que pareceria "vence hoje" e não "venceu há três semanas".
 */
export function diasRestantes(t: TrabalhoRow, agora: number = Date.now()): null | number {
  if (t.status !== 'pedido') return null

  const restante = t.expira_em - agora

  if (restante <= 0) return null

  return Math.max(1, Math.ceil(restante / (24 * 60 * 60 * 1000)))
}

/** "vence em 12 dias" · "vence hoje" · "venceu" · "" — a frase que a tela mostra. */
export function prazoLabel(t: TrabalhoRow, agora: number = Date.now()): string {
  if (t.status !== 'pedido') return ''

  if (t.expira_em <= agora) return 'venceu'

  const dias = diasRestantes(t, agora)

  if (dias === null) return 'venceu'

  return dias <= 1 ? 'vence hoje' : `vence em ${dias} dias`
}

export function quandoLabel(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '—'

  const d = new Date(ms)

  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}
