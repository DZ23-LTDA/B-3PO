/**
 * O projeto no renderer (r79 do GOAL V2).
 *
 * O QUE A TELA PODE E NÃO PODE FAZER
 *
 * `criar` e `mudar` são ações; `listar` e `ativos` são consulta. **Nada aqui decide status**: o processo
 * principal recusa as transições inválidas, e o renderer só descobre pela resposta.
 *
 * O QUE ESTE ARQUIVO **NÃO** FAZ
 *
 * **Não valida critério de aceite.** A tela pode esconder o botão "concluir" quando `criterios` está vazio,
 * mas isso é **conveniência** — a recusa de verdade está em `project.ts`, e continua valendo se alguém
 * chamar o canal direto.
 */

export const PROJETO_STATUS = ['rascunho', 'ativo', 'concluido', 'cancelado'] as const

export type ProjetoStatus = (typeof PROJETO_STATUS)[number]

export interface ProjetoRow {
  orcamento_cents: null | number
  created_at: number
  criterios: string[]
  entregaveis: string[]
  equipe: string[]
  id: string
  nome: string
  objetivo: string
  prazo: null | number
  escopo: string
  status: ProjetoStatus
  tenant_id: string
  updated_at: number
}

/** O que a tela mostra no lugar do status cru. */
export const STATUS_LABEL: Record<ProjetoStatus, string> = {
  ativo: 'em andamento',
  cancelado: 'cancelado',
  concluido: 'concluído',
  // **"a começar", e não "rascunho".** Rascunho sugere texto não salvo; o projeto está salvo e ninguém
  // começou — que é outra coisa.
  rascunho: 'a começar'
}

/**
 * As recusas, traduzidas para o que fazer.
 *
 * `sem_criterios` é a que mais importa: ela **não é um erro de sistema** — é a informação de que o projeto
 * ainda não disse o que é "pronto".
 */
export const PROJETO_ERRO: Record<string, string> = {
  nome_obrigatorio: 'Dê um nome ao projeto.',
  objetivo_obrigatorio: 'Escreva para que o projeto existe. Sem isso ele tem tarefas e não tem direção.',
  orcamento_invalido: 'O orçamento não pode ser negativo.',
  prazo_invalido: 'A data do prazo não é válida.',
  projeto_finalizado: 'Concluído ou cancelado não volta.',
  projeto_inexistente: 'Este projeto não existe mais.',
  projeto_obrigatorio: 'Projeto não informado.',
  sem_criterios:
    'Antes de concluir, escreva como saber que terminou. Sem critério de aceite, "pronto" é uma opinião.',
  status_invalido: 'Estado inválido.',
  transicao_invalida: 'Este projeto não pode ir para esse estado agora.'
}

export function projetoErroText(codigo: string): string {
  // A ausência é dita, não traduzida para "erro inesperado": se o código é novo, mostrar o código ajuda a
  // achar o que faltou traduzir.
  return PROJETO_ERRO[codigo] ?? `Não foi possível: ${codigo}`
}

interface Bridge {
  ativos: (tenantId?: string) => Promise<{ error: string } | { projetos: ProjetoRow[] }>
  criar: (payload: Record<string, unknown>) => Promise<{ error: string } | { projeto: ProjetoRow; projetos: ProjetoRow[] }>
  listar: (tenantId?: string) => Promise<{ error: string } | { projetos: ProjetoRow[] }>
  mudar: (payload: Record<string, unknown>) => Promise<{ error: string } | { projeto: ProjetoRow; projetos: ProjetoRow[] }>
  podeIniciar: (payload: Record<string, unknown>) => Promise<{ motivo?: string; ok: boolean }>
}

function bridge(): Bridge | null {
  return (globalThis as { hermesDesktop?: { projetos?: Bridge } }).hermesDesktop?.projetos ?? null
}

export function projetosDisponivel(): boolean {
  return bridge() !== null
}

export async function listarProjetos(): Promise<ProjetoRow[]> {
  const api = bridge()

  if (!api) return []

  const r = await api.listar()

  return 'projetos' in r ? r.projetos : []
}

export async function projetosAtivos(): Promise<ProjetoRow[]> {
  const api = bridge()

  if (!api) return []

  const r = await api.ativos()

  return 'projetos' in r ? r.projetos : []
}

export async function criarProjeto(input: {
  criterios?: string[]
  entregaveis?: string[]
  equipe?: string[]
  nome: string
  objetivo: string
  orcamento_cents?: null | number
  prazo?: null | number
  escopo?: string
}): Promise<{ error: string } | { projeto: ProjetoRow; projetos: ProjetoRow[] }> {
  const api = bridge()

  if (!api) return { error: 'indisponivel' }

  return api.criar(input)
}

export async function mudarProjeto(
  id: string,
  status: ProjetoStatus
): Promise<{ error: string } | { projeto: ProjetoRow; projetos: ProjetoRow[] }> {
  const api = bridge()

  if (!api) return { error: 'indisponivel' }

  return api.mudar({ id, status })
}

/**
 * Dá para começar? — a mesma pergunta que o processo principal responde, com o mesmo grafo.
 *
 * A tela **não recalcula**: quem decide é `podeIniciar`, e ela aceita as tarefas porque o projeto não as
 * guarda (elas são da `sofia-store`, r17).
 */
export async function podeIniciarProjeto(id: string, tarefas: unknown[] = []): Promise<{ motivo?: string; ok: boolean }> {
  const api = bridge()

  if (!api) return { motivo: 'indisponivel', ok: false }

  return api.podeIniciar({ id, tarefas })
}

/** "5 de 8 tarefas · sem critério de aceite" — a mesma frase do processo principal, dita na tela. */
export function situacaoDoProjeto(p: ProjetoRow, tarefas: readonly { status?: string }[] = []): string {
  const total = tarefas.length
  const feitas = tarefas.filter(t => t.status === 'concluida').length

  const partes: string[] = [total > 0 ? `${feitas} de ${total} tarefa(s)` : 'sem tarefas']

  // A ausência de critério é dita: sem ela não há como declarar pronto, e esconder isso faria o botão
  // "concluir" parecer disponível.
  if (p.criterios.length === 0) partes.push('sem critério de aceite')

  if (p.prazo !== null) partes.push(p.prazo < Date.now() ? 'prazo vencido' : 'no prazo')

  return partes.join(' · ')
}

export function quandoLabel(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '—'

  const d = new Date(ms)

  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}
