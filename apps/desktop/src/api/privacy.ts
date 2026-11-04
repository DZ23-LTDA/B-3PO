/**
 * Pedido do titular (LGPD) no renderer.
 *
 * O que a tela mostra e o que ela NÃO faz:
 *
 * - Exporta e mostra o que existe sobre um telefone (art. 18, I — acesso).
 * - Anonimiza sob confirmação explícita (art. 18, VI — eliminação, na forma decidida pelo proprietário:
 *   apaga o que identifica, preserva o fato fiscal).
 *
 * Não há botão de "apagar tudo": uma venda é fato contábil, e apagá-la quebraria o financeiro. A tela diz
 * isso no lugar do botão que não existe, para a ausência ser uma decisão visível e não uma falta.
 */

export interface PrivacyTotals {
  contatos: number
  conversas: number
  mensagens: number
  oportunidades: number
  tarefas: number
}

export interface PrivacyExport {
  gerado_em: number
  telefone: string
  totais: PrivacyTotals
}

export type PrivacyResult =
  | { error: string }
  | { export: PrivacyExport }
  | { alcance: PrivacyTotals; telefone: string }
  | { marcador: string; substituidos: number }

function bridge() {
  return (window as unknown as { hermes?: { privacy?: Record<string, (arg: unknown) => Promise<unknown>> } }).hermes
    ?.privacy
}

export function privacyAvailable(): boolean {
  return Boolean(bridge()?.export)
}

export async function exportTitular(telefone: string): Promise<PrivacyResult> {
  const chamada = bridge()?.export

  if (!chamada) return { error: 'ponte_indisponivel' }

  return (await chamada(telefone)) as PrivacyResult
}

export async function previewEliminacao(telefone: string): Promise<PrivacyResult> {
  const chamada = bridge()?.preview

  if (!chamada) return { error: 'ponte_indisponivel' }

  return (await chamada(telefone)) as PrivacyResult
}

export async function anonymizeTitular(telefone: string): Promise<PrivacyResult> {
  const chamada = bridge()?.anonymize

  if (!chamada) return { error: 'ponte_indisponivel' }

  // `confirmar: true` é o que o canal exige. Sem ele o backend recusa — a confirmação não é só da tela.
  return (await chamada({ confirmar: true, telefone })) as PrivacyResult
}

const MOTIVOS: Record<string, string> = {
  anonimizacao_incompleta: 'A gravação falhou no meio. Nada foi apagado; tente de novo.',
  confirmacao_obrigatoria: 'A confirmação não chegou ao servidor.',
  pedido_invalido: 'Pedido em formato inesperado.',
  ponte_indisponivel: 'Esta versão do aplicativo não expõe o pedido do titular.',
  telefone_invalido: 'Informe o telefone com DDD (mínimo 8 dígitos).',
  titular_sem_dados: 'Não há dados deste telefone no CRM.'
}

export function privacyErrorText(codigo: string): string {
  const chave = String(codigo).split(':')[0] ?? ''

  return MOTIVOS[chave] ?? 'Não foi possível concluir o pedido.'
}
