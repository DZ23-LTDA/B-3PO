// O TRABALHO PONTUAL (r83 do GOAL V2).
//
// O QUE O §12 DEFINE
//
// Três tipos de trabalho:
//
//   ORGANIZAÇÃO PERMANENTE  → `companies-store` + `organization.ts` (r81)
//   PROJETO                 → `project.ts` + `project-store.ts` (r76–r80)
//   **TRABALHO PONTUAL**    → *"documento, pesquisa, apresentacao, analise, codigo ou artefato
//                              temporario"* — **não existia**
//
// A DECISÃO QUE DEFINE O TIPO
//
// **Trabalho pontual expira.**
//
// Uma organização não expira: ela é a empresa. Um projeto não expira: ele tem prazo, mas o prazo é **meta**,
// não **fim do objeto**. Um trabalho pontual **acaba** — e se ninguém o entregou, ele **deixa de existir**
// como trabalho para virar lixo na lista.
//
// **Sem expiração, um pedido de pesquisa de março fica na tela em dezembro** — e a lista deixa de ser uma
// lista de trabalho para virar um arquivo de arrependimentos.
//
// O QUE ELE **NÃO** PRECISA — e por que isso o distingue do projeto
//
// **Não precisa de critério de aceite.** O projeto precisa (r76: *"sem critério, pronto é uma opinião"*)
// porque **a conclusão dele é uma afirmação sobre o mundo**. Um trabalho pontual é uma entrega: existe ou não
// existe, e o corpo dela é a prova.
//
// O QUE ELE **NÃO** FAZ
//
// **Não vira projeto.** Promover é uma decisão separada, e ela **não é automática**: um trabalho que se revela
// maior que o esperado **termina** e alguém abre um projeto — o que preserva a história dos dois em vez de
// reescrever a do primeiro.
//
// **Não guarda o conteúdo entregue** — só o resumo e o ponteiro. O artefato vive onde o produto guarda
// artefatos (documentos, arquivos); duplicá-lo aqui criaria duas verdades sobre o mesmo arquivo.

import { randomUUID } from 'node:crypto'

export const TRABALHO_TIPOS = ['documento', 'pesquisa', 'apresentacao', 'analise', 'codigo', 'artefato'] as const

export type TrabalhoTipo = (typeof TRABALHO_TIPOS)[number]

export const TRABALHO_STATUS = ['pedido', 'entregue', 'descartado'] as const

export type TrabalhoStatus = (typeof TRABALHO_STATUS)[number]

export function isTrabalhoTipo(valor: unknown): valor is TrabalhoTipo {
  return typeof valor === 'string' && (TRABALHO_TIPOS as readonly string[]).includes(valor)
}

export function isTrabalhoStatus(valor: unknown): valor is TrabalhoStatus {
  return typeof valor === 'string' && (TRABALHO_STATUS as readonly string[]).includes(valor)
}

export const TIPO_LABEL: Record<TrabalhoTipo, string> = {
  analise: 'análise',
  apresentacao: 'apresentação',
  artefato: 'artefato',
  codigo: 'código',
  documento: 'documento',
  pesquisa: 'pesquisa'
}

/** Prazo padrão: 30 dias. Curto o bastante para não acumular, longo o bastante para caber na agenda. */
export const PRAZO_PADRAO_MS = 30 * 24 * 60 * 60 * 1000

export interface Entrega {
  /** Onde o artefato está. **Ponteiro**, não conteúdo — ver o cabeçalho. */
  onde: string
  resumo: string
}

export interface TrabalhoPontual {
  created_at: number
  entrega: Entrega | null
  /**
   * Quando deixa de ser trabalho.
   *
   * **Obrigatório.** É o que distingue este tipo dos outros dois, e o que impede a lista de virar arquivo.
   */
  expira_em: number
  id: string
  /** O que foi pedido, em uma frase. Vazio é recusado: um pedido sem pedido não é um pedido. */
  pedido: string
  status: TrabalhoStatus
  tenant_id: string
  tipo: TrabalhoTipo
  updated_at: number
}

export function expirado(t: TrabalhoPontual, agora: number = Date.now()): boolean {
  // Entregue e descartado **não expiram**: o desfecho já aconteceu, e apagá-lo apagaria o registro.
  return t.status === 'pedido' && t.expira_em <= agora
}

export type RecusaTrabalho =
  | 'descricao_obrigatoria'
  | 'entrega_obrigatoria'
  | 'prazo_invalido'
  | 'tipo_invalido'

export function normalizarTrabalho(
  input: unknown,
  contexto: { agora: number; id?: string; prazo_ms?: number; tenant_id: string }
): { error: RecusaTrabalho } | { trabalho: TrabalhoPontual } {
  const raw = (input ?? {}) as Record<string, unknown>

  if (!isTrabalhoTipo(raw['tipo'])) return { error: 'tipo_invalido' }

  const pedido = typeof raw['pedido'] === 'string' ? raw['pedido'].trim() : ''

  if (!pedido) return { error: 'descricao_obrigatoria' }

  const prazo = contexto.prazo_ms ?? PRAZO_PADRAO_MS

  if (!Number.isFinite(prazo) || prazo <= 0) return { error: 'prazo_invalido' }

  return {
    trabalho: {
      created_at: contexto.agora,
      entrega: null,
      expira_em: contexto.agora + Math.trunc(prazo),
      id: contexto.id ?? `tp-${randomUUID()}`,
      pedido,
      status: 'pedido',
      tenant_id: contexto.tenant_id,
      tipo: raw['tipo'],
      updated_at: contexto.agora
    }
  }
}

/**
 * As transições.
 *
 *   pedido → entregue     a coisa existe, e o corpo é a prova
 *   pedido → descartado   não vai mais ser feito, ou não faz mais sentido
 *
 * **Entregue exige `onde` e `resumo`.** Uma entrega sem lugar não é uma entrega — é uma promessa de
 * entrega, e o status diria que já existe.
 *
 * **Entregue e descartado são finais.** Voltar apagaria o desfecho — e o desfecho é o único registro que um
 * trabalho pontual deixa.
 */
export function mudarTrabalho(
  trabalho: TrabalhoPontual,
  novo: TrabalhoStatus,
  entrega: unknown,
  agora: number
): { error: 'entrega_incompleta' | 'trabalho_finalizado' | 'trabalho_vencido' } | { trabalho: TrabalhoPontual } {
  if (trabalho.status !== 'pedido') return { error: 'trabalho_finalizado' }

  if (novo === 'pedido') return { trabalho }

  if (novo === 'descartado') {
    return { trabalho: { ...trabalho, status: 'descartado', updated_at: agora } }
  }

  // Entregar um trabalho vencido é permitido — vencer não é motivo para não aceitar o que ficou pronto. Mas
  // quem chama precisa saber que ele estava fora do prazo, e por isso a expiração é consultada **depois**
  // (em `expirado`) e não bloqueia aqui.
  const e = (entrega ?? {}) as Record<string, unknown>
  const onde = typeof e['onde'] === 'string' ? e['onde'].trim() : ''
  const resumo = typeof e['resumo'] === 'string' ? e['resumo'].trim() : ''

  if (!onde || !resumo) return { error: 'entrega_incompleta' }

  return {
    trabalho: {
      ...trabalho,
      entrega: { onde, resumo },
      status: 'entregue',
      updated_at: agora
    }
  }
}

/**
 * Os que ainda são trabalho.
 *
 * **Expirados ficam de fora** — e isso é a função existindo. Quem quiser vê-los usa `vencidos`, que é uma
 * pergunta diferente e tem nome próprio.
 */
export function emAberto(trabalhos: readonly TrabalhoPontual[], agora: number = Date.now()): TrabalhoPontual[] {
  return trabalhos.filter(t => t.status === 'pedido' && !expirado(t, agora))
}

export function vencidos(trabalhos: readonly TrabalhoPontual[], agora: number = Date.now()): TrabalhoPontual[] {
  return trabalhos.filter(t => expirado(t, agora))
}

/**
 * O resumo para a tela.
 *
 * **Vencidos são ditos em voz própria**: eles **não contam mais como trabalho**, mas continuam no arquivo —
 * e alguém precisa decidir se ainda fazem sentido.
 */
export function resumoDosTrabalhos(trabalhos: readonly TrabalhoPontual[], agora: number = Date.now()): string {
  const abertos = emAberto(trabalhos, agora).length
  const vencidosTotal = vencidos(trabalhos, agora).length
  const entregues = trabalhos.filter(t => t.status === 'entregue').length

  const partes: string[] = []

  if (abertos > 0) partes.push(`${abertos} em aberto`)
  if (entregues > 0) partes.push(`${entregues} entregue(s)`)
  // A vencida é dita separada: ela NÃO conta como trabalho, e alguém precisa resolver.
  if (vencidosTotal > 0) partes.push(`${vencidosTotal} vencido(s) para descartar`)

  return partes.length === 0 ? 'Nenhum trabalho pontual.' : partes.join(' · ') + '.'
}
