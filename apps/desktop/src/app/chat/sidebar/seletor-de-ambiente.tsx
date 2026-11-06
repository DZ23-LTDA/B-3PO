/**
 * O seletor de ambiente da barra lateral (r267).
 *
 * POR QUE ELE ESTÁ AQUI, E NÃO EM `/ambiente`
 *
 * A r124 fez uma TELA em `/ambiente` que mostra os dois ambientes lado a lado com os módulos
 * de cada um. Ela explica bem — e é o lugar errado para a decisão, porque **a decisão precisa
 * estar onde a pessoa está**: quem quer trocar o menu não deveria navegar até uma página de
 * documentação para isso.
 *
 * A referência visual da missão final põe o seletor no TOPO da barra, acima dos itens, com o
 * rótulo "Modo de Trabalho". Esta é essa posição.
 *
 * O QUE ELE **NÃO** FAZ
 *
 * **Não autoriza.** `lib/ambiente.ts` diz desde a r121, e o `store/ambiente.ts` repete: trocar
 * de ambiente **troca o que a barra mostra**, nunca o que a pessoa pode fazer.
 * `permission-guard` continua sendo a única porta, e `nav-rbac` filtra por cima do que este
 * seletor escolhe.
 *
 * POR QUE `<select>` NATIVO
 *
 * Seis opções cabem num controle nativo, e o nativo já funciona com teclado, com leitor de
 * tela e com o tema do sistema. Um popover próprio custaria o `Tab`, o `Esc` e o `aria-*` que
 * o `<select>` dá de graça — e a barra lateral já tem itens demais para navegar.
 */

import { useStore } from '@nanostores/react'

import { AMBIENTE_LABEL, AMBIENTES } from '@/lib/ambiente'
import { $ambiente, setAmbiente } from '@/store/ambiente'

export function SeletorDeAmbiente() {
  const ativo = useStore($ambiente)

  return (
    <label className="mb-2 flex flex-col gap-1 px-2">
      <span className="text-[0.625rem] font-semibold tracking-wider text-(--ui-text-tertiary) uppercase">
        Modo de Trabalho
      </span>
      <select
        aria-label="Modo de trabalho"
        className="w-full rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-[0.8125rem] font-medium text-foreground"
        data-b3po-foco
        onChange={event => setAmbiente(event.target.value)}
        value={ativo}
      >
        {AMBIENTES.map(ambiente => (
          <option key={ambiente} value={ambiente}>
            {AMBIENTE_LABEL[ambiente]}
          </option>
        ))}
      </select>
    </label>
  )
}
