// O PROJETO — o plano que sobrevive ao reinício (r76 do GOAL V2).
//
// O QUE O §12 PEDE
//
// Três tipos de trabalho: **organização permanente**, **projeto** e **trabalho pontual**.
//
//   Organização  → `companies-store` (existe desde antes)
//   Tarefa       → `sofia-store` + `sofia-grafo` (existem desde r17–r18)
//   **Projeto**  → **não existia**
//
// A organização guarda o que a empresa **é**; a tarefa guarda o que **precisa ser feito**. **Faltava o que
// liga as duas**: o objetivo com prazo, escopo e critério de aceite — e sem ele, um conjunto de tarefas é
// uma lista, não um projeto.
//
// O QUE ESTE ARQUIVO **NÃO** FAZ
//
// **Não guarda tarefas.** Um projeto tem `tarefas` no grafo, não aqui: a tarefa vive na `sofia-store` desde a
// r17, e duplicá-la criaria duas verdades sobre o mesmo trabalho.
//
// **Não decide quem trabalha.** `equipe` é uma lista de ids de ator; se um deles pode agir é `rbac.ts`.
//
// **Não define dependência.** Isso é `sofia-grafo` — e é por isso que `podeIniciar` **recebe** as tarefas em
// vez de buscá-las.

import type { DiagnosticoGrafo, NoDoGrafo } from './sofia-grafo'
import { diagnosticarGrafo } from './sofia-grafo'

export const PROJETO_STATUS = ['rascunho', 'ativo', 'concluido', 'cancelado'] as const

export type ProjetoStatus = (typeof PROJETO_STATUS)[number]

export interface Projeto {
  /**
   * Quanto foi reservado para o projeto, em centavos.
   *
   * `null` é **"não definido"**, não zero. Um projeto sem orçamento e um projeto com orçamento zero são
   * coisas diferentes — e o relatório precisa poder dizer qual é qual.
   */
  orcamento_cents: null | number
  created_at: number
  /**
   * Critérios de aceite.
   *
   * Uma lista de frases, **não** uma nota. Projeto sem critério não tem como ser declarado pronto — e é a
   * diferença entre "terminamos" e "terminamos o que combinamos".
   */
  criterios: string[]
  entregaveis: string[]
  /** Ids de ator. Vazio é permitido: trabalho solo de quem criou. */
  equipe: string[]
  id: string
  nome: string
  /**
   * O que o projeto existe para fazer.
   *
   * **Obrigatório.** Um projeto sem objetivo tem tarefas e não tem direção; é a diferença entre um plano e
   * uma lista de afazeres.
   */
  objetivo: string
  /** O que **não** está incluído. Opcional, e mais útil que o escopo positivo na maioria das vezes. */
  escopo: string
  prazo: null | number
  status: ProjetoStatus
  tenant_id: string
  updated_at: number
}

export function isProjetoStatus(valor: unknown): valor is ProjetoStatus {
  return typeof valor === 'string' && (PROJETO_STATUS as readonly string[]).includes(valor)
}

export type RecusaProjeto =
  | 'nome_obrigatorio'
  | 'objetivo_obrigatorio'
  | 'prazo_invalido'
  | 'orcamento_invalido'
  | 'status_invalido'

/**
 * Normaliza um projeto novo.
 *
 * **Nasce em `rascunho`**, não em `ativo`: um projeto recém-criado ainda não tem tarefa nem responsável, e
 * marcá-lo ativo faria o painel mostrar como "em andamento" algo que ninguém começou.
 */
export function normalizarProjeto(
  input: unknown,
  contexto: { agora: number; id: string; tenant_id: string }
): { error: RecusaProjeto } | { projeto: Projeto } {
  const raw = (input ?? {}) as Record<string, unknown>

  const nome = typeof raw['nome'] === 'string' ? raw['nome'].trim() : ''

  if (!nome) return { error: 'nome_obrigatorio' }

  const objetivo = typeof raw['objetivo'] === 'string' ? raw['objetivo'].trim() : ''

  if (!objetivo) return { error: 'objetivo_obrigatorio' }

  const prazo = raw['prazo']

  if (prazo !== null && prazo !== undefined && (typeof prazo !== 'number' || !Number.isFinite(prazo))) {
    return { error: 'prazo_invalido' }
  }

  const orcamento = raw['orcamento_cents']

  // Negativo é recusado, zero é aceito: "não temos verba" é um orçamento; "devemos ao projeto" não é.
  if (orcamento !== null && orcamento !== undefined && (typeof orcamento !== 'number' || !Number.isFinite(orcamento) || orcamento < 0)) {
    return { error: 'orcamento_invalido' }
  }

  const texto = (valor: unknown): string[] =>
    Array.isArray(valor) ? valor.filter((v): v is string => typeof v === 'string' && v.trim().length > 0).map(v => v.trim()) : []

  return {
    projeto: {
      orcamento_cents: typeof orcamento === 'number' ? Math.trunc(orcamento) : null,
      created_at: contexto.agora,
      criterios: texto(raw['criterios']),
      entregaveis: texto(raw['entregaveis']),
      equipe: texto(raw['equipe']),
      id: contexto.id,
      nome,
      objetivo,
      escopo: typeof raw['escopo'] === 'string' ? raw['escopo'].trim() : '',
      prazo: typeof prazo === 'number' ? Math.trunc(prazo) : null,
      status: 'rascunho',
      tenant_id: contexto.tenant_id,
      updated_at: contexto.agora
    }
  }
}

/**
 * As transições de status.
 *
 *   rascunho  → ativo        alguém começou
 *   ativo     → concluido    os critérios foram cumpridos
 *   ativo     → cancelado    parou antes
 *   rascunho  → cancelado    nunca começou
 *
 * **`concluido` só a partir de `ativo`.** Um projeto em rascunho que nunca começou não pode ser "concluído":
 * isso registraria como entrega algo que ninguém fez.
 *
 * **`concluido` e `cancelado` são finais.** Reabrir apagaria o desfecho — e o desfecho é o que os relatórios
 * contam.
 */
export function mudarProjeto(
  projeto: Projeto,
  novo: ProjetoStatus,
  agora: number
): { error: 'transicao_invalida' | 'projeto_finalizado' | 'sem_criterios' } | { projeto: Projeto } {
  if (projeto.status === 'concluido' || projeto.status === 'cancelado') return { error: 'projeto_finalizado' }

  if (novo === 'concluido') {
    // **Sem critério, ninguém declara pronto.** A r45 mostrou que um fluxo "completo" sem prova é uma
    // afirmação; o critério é o que transforma a afirmação em verificação.
    if (projeto.criterios.length === 0) return { error: 'sem_criterios' }

    if (projeto.status !== 'ativo') return { error: 'transicao_invalida' }
  }

  if (novo === 'ativo' && projeto.status !== 'rascunho') return { error: 'transicao_invalida' }

  if (novo === 'rascunho') return { error: 'transicao_invalida' }

  return { projeto: { ...projeto, status: novo, updated_at: agora } }
}

/**
 * O projeto pode começar a rodar?
 *
 * Junta o que existe: o grafo da r18 diagnostica o plano; este arquivo decide se o **projeto** está pronto
 * para ele.
 */
export function podeIniciar(
  projeto: Projeto,
  tarefas: readonly NoDoGrafo[]
): { motivo: 'diagnostico' | 'sem_tarefas' | 'status' | 'sem_objetivo'; ok: false; diagnostico?: DiagnosticoGrafo } | { ok: true } {
  // Um projeto sem objetivo não deveria existir; se existir (dado antigo), não roda.
  if (!projeto.objetivo.trim()) return { motivo: 'sem_objetivo', ok: false }

  if (projeto.status === 'concluido' || projeto.status === 'cancelado') return { motivo: 'status', ok: false }

  if (tarefas.length === 0) return { motivo: 'sem_tarefas', ok: false }

  const diagnostico = diagnosticarGrafo(tarefas)

  // Ciclo ou dependência órfã: o plano **não pode** rodar. É a mesma regra da r18 — e ela vale aqui porque
  // um projeto é um plano com nome.
  if (diagnostico.ciclos.length > 0 || diagnostico.dependencias_orfas.length > 0) {
    return { diagnostico, motivo: 'diagnostico', ok: false }
  }

  return { ok: true }
}

/**
 * O que está pendente no projeto, para o painel.
 *
 * **Não conta como "pronto" o que não tem critério**: um projeto ativo sem critério é dito assim, em vez de
 * mostrado como 100%.
 */
export function situacaoDoProjeto(projeto: Projeto, tarefas: readonly NoDoGrafo[]): string {
  const total = tarefas.length
  const prontas = tarefas.filter(t => t.status === 'concluida').length

  const partes: string[] = [`${prontas} de ${total} tarefa(s)`]

  if (projeto.criterios.length === 0) {
    // A ausência é dita, não escondida: sem critério não há como declarar pronto.
    partes.push('sem critério de aceite')
  }

  if (projeto.prazo !== null) {
    partes.push(projeto.prazo < Date.now() ? 'prazo vencido' : 'no prazo')
  }

  return partes.join(' · ')
}
