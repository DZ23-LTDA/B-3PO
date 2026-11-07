/**
 * O cabeçalho de seção da barra lateral (r265).
 *
 * POR QUE ESTE ARQUIVO EXISTE
 *
 * O agrupamento que a missão final pede — "Operação do Negócio", "Comércio e Operações",
 * "Crescimento", "Automação e Inteligência", "Configuração" — existia como **comentário** no
 * plugin desde a r92, porque o contrato do SDK não tinha campo de grupo. A r265 acrescentou
 * `group?: string` e o render.
 *
 * **Renderizado inline em `sidebar/index.tsx`, ele custou 26 linhas e +2 de complexidade
 * ciclomática naquele arquivo** — e o `scripts/check` recusou: o arquivo está acima do teto
 * e **só pode descer**. O próprio gate recomenda a saída: mover para um irmão tópico.
 *
 * A decisão que fica registrada aqui: **`mostraGrupo` não é uma condição de render, é uma
 * função pura da lista.** Ela mora neste arquivo, testável sem montar React — e o componente
 * de cabeçalho é burro de propósito.
 */

import type * as React from 'react'
import { Fragment } from 'react'

import type { InterfaceTier } from '@/store/interface-mode'
import type { SidebarNavItem } from '@/app/types'

/**
 * Se o item no índice `indice` deve abrir uma seção nova.
 *
 * **A regra é uma comparação com o ANTERIOR, não um agrupamento prévio** — de propósito:
 * assim `order` continua sendo a única fonte de verdade da sequência, e não há uma segunda
 * lista de grupos para manter em sincronia com a primeira.
 *
 * - **Item sem grupo** nunca abre seção (é uma linha solta, como todas eram antes da r265).
 * - **Primeiro item do grupo** abre; os seguintes herdam a seção já aberta.
 * - **Grupo que reaparece depois de outro** abre de novo — a barra lê de cima para baixo, e
 *   repetir o cabeçalho é mais honesto do que fingir que as duas metades são contíguas.
 *
 * @param grupos Os grupos de cada item, na ordem em que a barra vai desenhar.
 * @param indice A posição do item na lista.
 */
export function abreSecao(grupos: readonly (string | undefined)[], indice: number): boolean {
  const atual = grupos[indice]
  if (!atual) return false
  return atual !== grupos[indice - 1]
}

/**
 * O cabeçalho de uma seção.
 *
 * **Não é um botão.** `aria-hidden` porque o leitor de tela já anuncia cada item pelo próprio
 * rótulo: repetir a seção como landmark seria ruído. **Também não entra na ordem de `Tab`** —
 * um cabeçalho focável rouba uma parada de quem navega pelo teclado.
 */
export function NavGroupHeader({ label }: { label: string }) {
  return (
    <div
      aria-hidden="true"
      className="mt-3 mb-1 px-2 text-[0.6875rem] font-semibold tracking-wide text-(--ui-text-tertiary) uppercase select-none first:mt-0"
    >
      {label}
    </div>
  )
}

/**
 * O par `{ cabeçalho, item }` que o `map` da barra devolve.
 *
 * Existe para o `index.tsx` não precisar de `Fragment` nem de uma condição no meio do seu
 * próprio `return` — que é o que empurrou a complexidade dele para 25.
 */
export function NavRowWithHeader({
  children,
  item,
  indice,
  itens
}: {
  children: React.ReactNode
  item: { group?: string }
  indice: number
  itens: readonly { group?: string }[]
}) {
  return (
    <Fragment>
      {abreSecao(itens.map(i => i.group), indice) && item.group ? (
        <NavGroupHeader label={item.group} />
      ) : null}
      {children}
    </Fragment>
  )
}

/**
 * Converte as contribuicoes de `sidebar.nav` nas linhas que a barra desenha (r265).
 *
 * **Mora aqui, e nao no `index.tsx`, porque aquele arquivo esta acima do teto** que o
 * `scripts/check` mantem - so pode encolher. Esta funcao e pura: recebe as contribuicoes e
 * um render de icone, devolve linhas; nao monta React nem conhece rota.
 *
 * **Descarta o que nao navega**: contribuicao sem `path` absoluto ou sem rotulo nao vira
 * linha - uma linha que nao leva a lugar nenhum e um botao morto (proibido pela missao).
 */
export function linhasDeContribuicoes(
  contribuicoes: readonly { id: string; data?: unknown }[],
  icone: (codicon: string) => React.ComponentType<{ className?: string }>
): SidebarNavItem[] {
  const saida: SidebarNavItem[] = []

  for (const c of contribuicoes) {
    const data = c.data as
      | Partial<{ codicon: string; label: string; path: string; tier: InterfaceTier; group: string }>
      | undefined

    if (!data?.path?.startsWith('/') || !data.label) continue

    saida.push({
      id: c.id,
      label: data.label,
      icon: icone(data.codicon || 'plug'),
      route: data.path,
      ...(data.tier ? { tier: data.tier } : {}),
      ...(data.group ? { group: data.group } : {})
    })
  }

  return saida
}