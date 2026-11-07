// O grafo de dependências do plano (Sofia) — r18 do GOAL V2.
//
// Passo 2 dos cinco da spec (`docs/b3po/SOFIA-ORCHESTRATION-SPEC.md`). O passo 1 gravou `depende_de`
// como **única** representação de precedência e **nunca** gravou a ordem. Este arquivo é o outro lado
// desse contrato: a ordem é **derivada aqui**, a cada leitura, e não existe em disco.
//
// POR QUE FUNÇÃO PURA
//
// Porque o caso ruim é o que importa. Um plano com ciclo (`A → B → A`) **nunca termina** — e o store,
// corretamente, aceita o dado: ele grava planos, não valida grafos. Se a validação morasse no store, ela
// rodaria no `criar` e o plano ruim nunca chegaria a ser inspecionado; e testar o ciclo exigiria montar
// um plano real em disco.
//
// Aqui, `ordemTopologica` sobre um grafo cíclico devolve `null` — e há teste para isso sem tocar em
// arquivo nenhum.
//
// O QUE ESTE ARQUIVO **NÃO** FAZ
//
// Não decide se uma tarefa pode rodar: isso depende do **status** dela e do status das dependências, e
// é `tarefasProntas` quem responde. Verificar política continua sendo do `permission-guard`, e delegar
// continua sendo do passo 3.

import type { SofiaTarefa } from './sofia-store'

/**
 * O que impede um plano de ser executado.
 *
 * `ciclos` e `dependencias_orfas` são problemas **estruturais** — o plano não pode rodar como está.
 * `dependencias_orfas` é o caso de `depende_de: ['t9']` quando `t9` não existe: a tarefa esperaria por
 * algo que nunca vai acontecer.
 */
export interface DiagnosticoGrafo {
  ciclos: string[][]
  dependencias_orfas: { depende_de: string; tarefa_id: string }[]
  /** `true` quando o plano pode rodar. */
  valido: boolean
}

/** Só o que o grafo precisa saber de uma tarefa. Facilita testar sem montar o tipo inteiro. */
export type NoDoGrafo = Pick<SofiaTarefa, 'depende_de' | 'status' | 'tarefa_id'>

function mapa(tarefas: readonly NoDoGrafo[]): Map<string, NoDoGrafo> {
  return new Map(tarefas.map(t => [t.tarefa_id, t]))
}

/**
 * Encontra os ciclos por DFS com marcação de cor.
 *
 * Devolve **um** ciclo por componente, não todas as suas permutações: um `A→B→A` tem 3 rotações e
 * imprimir as 3 não ajuda quem vai corrigir o plano.
 */
function acharCiclos(tarefas: readonly NoDoGrafo[]): string[][] {
  const porId = mapa(tarefas)
  const branco = 0
  const cinza = 1
  const preto = 2
  const cor = new Map<string, number>(tarefas.map(t => [t.tarefa_id, branco]))
  const ciclos: string[][] = []
  const pilha: string[] = []

  function visitar(id: string): void {
    cor.set(id, cinza)
    pilha.push(id)

    for (const dep of porId.get(id)?.depende_de ?? []) {
      // Dependência órfã não é ciclo: quem aponta para fora do plano é diagnosticado à parte.
      if (!porId.has(dep)) continue

      const estado = cor.get(dep)

      if (estado === cinza) {
        // Achei o ciclo: recorta a pilha a partir de onde a dependência reapareceu.
        const inicio = pilha.lastIndexOf(dep)

        ciclos.push(pilha.slice(inicio))
      } else if (estado === branco) {
        visitar(dep)
      }
    }

    pilha.pop()
    cor.set(id, preto)
  }

  for (const t of tarefas) {
    if (cor.get(t.tarefa_id) === branco) visitar(t.tarefa_id)
  }

  return ciclos
}

/**
 * Diagnóstico completo do grafo.
 *
 * Um plano com ciclo **não** é "inválido" no sentido de dado corrompido: é um plano que não pode ser
 * executado. A distinção importa — o produto precisa mostrar o motivo, não recusar a existência.
 */
export function diagnosticarGrafo(tarefas: readonly NoDoGrafo[]): DiagnosticoGrafo {
  const porId = mapa(tarefas)
  const ciclos = acharCiclos(tarefas)
  const dependencias_orfas: { depende_de: string; tarefa_id: string }[] = []

  for (const t of tarefas) {
    for (const dep of t.depende_de) {
      if (!porId.has(dep)) dependencias_orfas.push({ depende_de: dep, tarefa_id: t.tarefa_id })
    }
  }

  return {
    ciclos,
    dependencias_orfas,
    valido: ciclos.length === 0 && dependencias_orfas.length === 0
  }
}

/**
 * A ordem de execução, derivada — ou `null` quando há ciclo.
 *
 * Kahn: uma tarefa entra na fila quando todas as suas dependências já saíram. Empate é resolvido pela
 * **ordem do array original**, para a saída ser determinística — um teste que depende de `Math.random`
 * não prova nada.
 */
export function ordemTopologica(tarefas: readonly NoDoGrafo[]): null | string[] {
  const porId = mapa(tarefas)
  const pendentes = new Map<string, number>()
  const dependentes = new Map<string, string[]>()

  for (const t of tarefas) {
    // Dependência órfã nunca vai satisfazer: contá-la deixaria a tarefa presa para sempre, e a ordem
    // devolveria `null` como se houvesse ciclo. Diagnóstico separado, ordem separada.
    const deps = t.depende_de.filter(d => porId.has(d))

    pendentes.set(t.tarefa_id, deps.length)

    for (const d of deps) {
      const lista = dependentes.get(d) ?? []

      lista.push(t.tarefa_id)
      dependentes.set(d, lista)
    }
  }

  const fila = tarefas.filter(t => (pendentes.get(t.tarefa_id) ?? 0) === 0).map(t => t.tarefa_id)
  const ordem: string[] = []

  while (fila.length > 0) {
    const id = fila.shift() as string

    ordem.push(id)

    for (const dependente of dependentes.get(id) ?? []) {
      const resta = (pendentes.get(dependente) ?? 1) - 1

      pendentes.set(dependente, resta)

      if (resta === 0) fila.push(dependente)
    }
  }

  return ordem.length === tarefas.length ? ordem : null
}

/** `true` quando todas as dependências de `id` terminaram. Dependência órfã nunca terminou. */
export function dependenciasSatisfeitas(tarefa: NoDoGrafo, tarefas: readonly NoDoGrafo[]): boolean {
  const porId = mapa(tarefas)

  return tarefa.depende_de.every(dep => porId.get(dep)?.status === 'concluida')
}

/**
 * As tarefas que podem ser delegadas agora.
 *
 * Critérios, os três: status `pendente` (ou `pronta`), o grafo permite, e nenhuma dependência pendente.
 *
 * `bloqueada` fica de fora de propósito: é o status que diz "não é para tentar". Uma tarefa bloqueada
 * por decisão humana não volta à fila só porque as dependências terminaram.
 */
export function tarefasProntas(tarefas: readonly NoDoGrafo[]): string[] {
  const porId = mapa(tarefas)

  return tarefas
    .filter(t => t.status === 'pendente' || t.status === 'pronta')
    .filter(t => t.depende_de.every(dep => porId.get(dep)?.status === 'concluida'))
    .map(t => t.tarefa_id)
}

/**
 * Quantos níveis de dependência a tarefa tem.
 *
 * Serve para o limite de profundidade que o GOAL exige do multiagente. `null` quando há ciclo — a
 * profundidade de um ciclo é infinita, e devolver um número seria mentira.
 */
export function profundidade(tarefaId: string, tarefas: readonly NoDoGrafo[]): null | number {
  const porId = mapa(tarefas)
  const memo = new Map<string, number>()

  function medir(id: string, visitando: Set<string>): null | number {
    if (visitando.has(id)) return null // ciclo

    const guardado = memo.get(id)

    if (guardado !== undefined) return guardado

    const deps = (porId.get(id)?.depende_de ?? []).filter(d => porId.has(d))

    if (deps.length === 0) {
      memo.set(id, 0)

      return 0
    }

    let maior = 0
    const proximo = new Set(visitando).add(id)

    for (const dep of deps) {
      const valor = medir(dep, proximo)

      if (valor === null) return null

      maior = Math.max(maior, valor)
    }

    memo.set(id, maior + 1)

    return maior + 1
  }

  return porId.has(tarefaId) ? medir(tarefaId, new Set()) : null
}

/** A maior profundidade do plano. `null` quando há ciclo. */
export function profundidadeDoPlano(tarefas: readonly NoDoGrafo[]): null | number {
  let maior = 0

  for (const t of tarefas) {
    const p = profundidade(t.tarefa_id, tarefas)

    if (p === null) return null

    maior = Math.max(maior, p)
  }

  return maior
}
