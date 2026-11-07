// O ambiente ativo — a preferência que o seletor da tela usa (r123 do GOAL V2).
//
// A CAMADA QUE FALTAVA
//
// A r121 escreveu a REGRA (`lib/ambiente.ts`: quais grupos em qual ambiente, e o que fica de fora).
// A r122 tornou os grupos REAIS (campo em `ItemDeMenu`, 23 de 23, com 6 testes).
//
// Faltava uma coisa entre a regra e a tela: **onde a escolha fica guardada**.
//
// POR QUE ESTA PREFERÊNCIA É DO WINDOW, E NÃO DO BACKEND
//
// `apps/desktop/AGENTS.md`: "decida o estado pela AUTORIDADE". O ambiente é **o que esta janela mostra na
// barra lateral** — não muda dado, não muda permissão, não é compartilhado com outra sessão do mesmo
// perfil. Um segundo Desktop aberto no mesmo `userData` pode estar em outro ambiente, e **os dois estão
// certos**.
//
// Então ele vive no `localStorage` — como `chat-text-scale` e `session-list-density` — e **não no
// `ui-preferences` do main**. Persistir no main faria **uma janela decidir pela outra**.
//
// O QUE ELE NÃO É
//
// **Não é permissão.** Trocar de ambiente não autoriza nada: `permission-guard` continua sendo a única
// porta (r121 diz a mesma coisa, e o teste repete).

import { atom } from 'nanostores'

import { persistString, storedString } from '@/lib/storage'

import { type Ambiente, AMBIENTES, isAmbiente } from '@/lib/ambiente'
import { aplicarIdentidadeDoAmbiente } from '@/lib/ambiente-identidade'

/** Versionado: uma mudança de forma não lê o valor antigo como se fosse novo. */
const KEY = 'hermes.desktop.b3po-ambiente.v1'

/**
 * O padrão é `'empresa'`.
 *
 * **Não é neutro**: é o ambiente de quem abre o produto para tocar o negócio, que é a maioria — e é o que
 * o §13:417 põe primeiro. Quem constrói troca uma vez, e a escolha fica.
 */
const PADRAO: Ambiente = 'empresa'

function normalizar(valor: unknown): Ambiente {
  return isAmbiente(valor) ? valor : PADRAO
}

export const $ambiente = atom<Ambiente>(normalizar(storedString(KEY)))

// r103: a identidade visual acompanha o estado. O atributo vai para o `<html>` no boot (antes da
// primeira pintura da barra) e é reaplicado em toda troca — inclusive quando outra janela troca e
// `recarregarAmbiente` roda.
aplicarIdentidadeDoAmbiente($ambiente.get())

export function setAmbiente(valor: unknown): void {
  const ambiente = normalizar(valor)

  $ambiente.set(ambiente)
  aplicarIdentidadeDoAmbiente(ambiente)
  persistString(KEY, ambiente)
}

/**
 * Avança para o próximo ambiente, em ciclo (r271).
 *
 * **A r123 escreveu esta função para DOIS ambientes**: `empresa ? engenharia : empresa`. Com
 * seis, ela virava um interruptor que só conhecia duas posições — quem estivesse em `ia` apertava
 * e caía em `empresa`, e `automacao`, `estrategico` e `administracao` eram **inalcançáveis por
 * aqui**.
 *
 * **Ciclar é a semântica que o nome promete**: alternar entre as opções que EXISTEM, não entre as
 * que existiam quando a função foi escrita. A ordem é a de `AMBIENTES`, que é a ordem em que a
 * pessoa entra.
 */
export function alternarAmbiente(): void {
  const indice = AMBIENTES.indexOf($ambiente.get())

  // `indexOf` de um valor fora da lista devolve -1, e `(-1 + 1) % 6` é 0 — o primeiro, que é o
  // destino certo para um estado que não deveria existir.
  setAmbiente(AMBIENTES[(indice + 1) % AMBIENTES.length])
}

/**
 * Relê o que está gravado.
 *
 * **Existe para o caso de outra janela ter trocado**: o `localStorage` é compartilhado no mesmo perfil, e
 * o evento `storage` só dispara em OUTRAS abas — não na que escreveu.
 */
export function recarregarAmbiente(): void {
  const ambiente = normalizar(storedString(KEY))

  $ambiente.set(ambiente)
  aplicarIdentidadeDoAmbiente(ambiente)
}

export const AMBIENTE_STORAGE_KEY = KEY
