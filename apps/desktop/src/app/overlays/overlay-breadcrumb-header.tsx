import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { ChevronRight } from '@/lib/icons'
import { cn } from '@/lib/utils'

import { PAGE_INSET_X } from '../layout-constants'

import type { OverlayNavGroup, OverlayNavLink } from './overlay-split-layout'

interface OverlayBreadcrumbHeaderProps {
  child?: OverlayNavLink
  /** A child's own sub-page (third nav level). */
  grandchild?: OverlayNavLink
  group: OverlayNavGroup
  rootLabel: string
  trailing?: ReactNode
}

/**
 * r22 do V4 — o título da página é `<h1>`, não `<span>`.
 *
 * O DEFEITO QUE ISTO CORRIGE
 *
 * Medido: a tela de **configurações** (`app/settings/index.tsx`, 584 linhas, doze painéis) tinha
 * **zero** elementos `h1/h2/h3`. Todos os títulos eram `<div>`/`<span>` estilizados.
 *
 * Consequência para quem usa leitor de tela: **não há navegação por heading** — o atalho mais usado
 * para percorrer uma página. O `axe` acusava `page-has-heading-one` em `/settings` e estava certo.
 *
 * Este cabeçalho é comum às telas de sobreposição, e o elemento com `aria-current="page"` **já é o
 * título da página** — estava só com a tag errada. `h1` aqui dá a âncora que faltava, **sem mudar um
 * pixel**: mesmas classes, mesmo lugar.
 */
export function OverlayBreadcrumbHeader({
  child,
  grandchild,
  group,
  rootLabel,
  trailing
}: OverlayBreadcrumbHeaderProps) {
  return (
    <div className={cn('mb-3 flex shrink-0 items-start justify-between gap-3', PAGE_INSET_X)}>
      <nav aria-label={group.label} className="flex min-w-0 items-center gap-1.5 text-xs text-(--ui-text-tertiary)">
        <span className="shrink-0">{rootLabel}</span>
        <ChevronRight aria-hidden className="size-3 shrink-0" />
        {child ? (
          <>
            <Button onClick={group.onSelect} size="inline" variant="text">
              {group.label}
            </Button>
            <ChevronRight aria-hidden className="size-3 shrink-0" />
            {grandchild ? (
              <>
                <Button className="min-w-0 truncate" onClick={child.onSelect} size="inline" variant="text">
                  {child.label}
                </Button>
                <ChevronRight aria-hidden className="size-3 shrink-0" />
                <h1 aria-current="page" className="m-0 truncate text-foreground">
                  {grandchild.label}
                </h1>
              </>
            ) : (
              <h1 aria-current="page" className="m-0 truncate text-foreground">
                {child.label}
              </h1>
            )}
          </>
        ) : (
          <h1 aria-current="page" className="m-0 truncate text-foreground">
            {group.label}
          </h1>
        )}
      </nav>
      {trailing && <div className="flex shrink-0 items-center">{trailing}</div>}
    </div>
  )
}
