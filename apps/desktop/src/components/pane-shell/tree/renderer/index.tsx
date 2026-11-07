/**
 * Layout tree renderer (root).
 *
 * - `split` -> flex row/column; 1px seams between siblings double as resize
 *   sashes (the seam IS the boundary — junction-owned, never doubled). See
 *   tree-split.tsx.
 * - `group` -> a ZONE: header strip (tabs when stacked, minimize chevron) +
 *   the active pane's content, resolved from the contribution registry
 *   (`area: 'panes'`). Empty zones exist only in editor-authored trees. See
 *   tree-group.tsx.
 *
 * Dragging is FancyZones-style (drag-session.ts): the LAYOUT STAYS FIXED and
 * every zone lights up as a whole-region drop target; dropping moves the pane
 * into that zone (joining its tab stack). Structure changes (splitting/merging/
 * resizing zones) belong to the zone editor, not the drag.
 *
 * This file owns only the composition: the recursive tree, the narrow-viewport
 * overlays, the edit palette, and the zone editor. The pieces live in sibling
 * modules — track-model (sizing), drag-session (drag), tree-split / tree-group
 * (nodes), layout-picker + edit-bar (edit mode), narrow-overlays.
 */

import { useStore } from '@nanostores/react'
import { type ReactNode, useEffect } from 'react'

import { useI18n } from '@/i18n/context'

import { useLayoutEditHotkey } from '../../edit-mode'
import { publishWorkspaceGeometry } from '../../geometry'
import { $layoutTree, trackActiveTreeGroup } from '../store'
import { useTabKeyHints } from '../tab-key-hint-state'
import { ZoneEditor } from '../zone-editor'

import { TreeEditBar } from './edit-bar'
import { FloatingPanes } from './floating-panes'
import { KeepAlivePanes } from './keep-alive-panes'
import { NarrowOverlays } from './narrow-overlays'
import { TreeNode } from './tree-node'

export function LayoutTreeRoot({ children, titlebar = false }: { children?: ReactNode; titlebar?: boolean }) {
  const { t } = useI18n()
  const tree = useStore($layoutTree)

  useLayoutEditHotkey(true)
  useTabKeyHints()
  // Track the interacted zone so ⌘W closes the right tab even when nothing is
  // DOM-focused.
  useEffect(trackActiveTreeGroup, [])
  // Publish --workspace-left/right so chrome (titlebar title) aligns to the
  // main pane's geometry in plain CSS.
  useEffect(publishWorkspaceGeometry, [])

  return (
    /*
     * r92 — TENTADO E REVERTIDO: um `role="region"` neste root.
     *
     * A ideia parecia a terceira via do T-15: o `axe` acusava `region` em ~55 nós porque os tab
     * strips e os corpos de zona ficam fora de qualquer landmark, e um único landmark no root
     * cobriria todos eles — respeitando a objeção da r291 (que era contra um `region` por ZONA).
     *
     * Medido, funcionou para `region`: 57 -> 13 nós. E criou `landmark-main-is-top-level` em TODAS
     * as rotas, porque o `<main>` do chat vive DENTRO de uma zona desta árvore — a região passa a
     * envolvê-lo.
     *
     * A troca é ruim: `region` só significa "não alcançável pelo salto de landmark" (o conteúdo
     * continua no fluxo), enquanto `main` não-top-level pode quebrar o landmark MAIS importante
     * para leitores de tela. Revertido, e a causa estrutural ficou registrada no T-15.
     */
    /*
     * r97 — o root da árvore é o `<main>` do app.
     *
     * O `axe` acusava `region` em ~89 nós porque nada dentro da árvore de painéis estava em
     * landmark: o `<main>` ficava DENTRO de uma zona, e a árvore é irmã dele. Marcar a árvore como
     * `region` (r92) resolvia o `region` e criava `landmark-main-is-top-level` — troca ruim.
     *
     * Aqui a relação se inverte: a árvore inteira É o conteúdo principal do app, então ela vira o
     * `main` e o `<main>` interno sai. `main` passa a ser top-level, único, e todo o conteúdo —
     * tab strips, corpos de zona, páginas — fica dentro dele.
     *
     * Custo aceito: o `main` inclui os painéis laterais, que são PANES desta mesma árvore. Num app
     * de painéis o conteúdo principal é o workspace inteiro, não um dos painéis.
     */
    <main className="relative flex min-h-0 min-w-0 flex-1">
      {/* THE SEAM INVARIANT: boundaries are drawn by the tree (one sash
          hairline per seam) — content mounted in a zone must not paint its
          own edge chrome. App components (asides, the shadcn sidebar) carry
          edge borders + inset highlights for the OLD shell's geometry; this
          neutralizes all of them at the zone boundary, for every current and
          future pane, instead of per-pane class surgery. */}
      <style>{`
        [data-tree-group] :is(aside, [data-slot=sidebar]) {
          border-left-width: 0;
          border-right-width: 0;
          box-shadow: none;
        }
        /* Old-shell titlebar BANDS (chat's session header et al size to
           --titlebar-height, which is 0 inside zones): a zero-height band is
           non-functional but still paints its border-b — a stray hairline
           doubling the zone's top seam. Remove the band entirely. */
        [data-tree-group] header[class*="h-(--titlebar-height)"] {
          display: none;
        }
      `}</style>
      <KeepAlivePanes>
        {tree && (
          <TreeNode
            leftEdge={titlebar}
            node={tree}
            rightEdge={titlebar}
            root
            rootRow={tree.type === 'split' && tree.orientation === 'row'}
            topEdge={titlebar}
          />
        )}
        {tree && <NarrowOverlays />}
      </KeepAlivePanes>
      {tree && (
        <>
          {/* Non-tiling panes: fixed cards above the tree, outside every zone. */}
          <FloatingPanes />
          <TreeEditBar />
          <ZoneEditor />
          {children}
        </>
      )}
    </main>
  )
}
