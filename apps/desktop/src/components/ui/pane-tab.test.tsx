import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ContextMenu, ContextMenuTrigger, HERMES_CONTEXT_MENU_TRIGGER_ATTR } from './context-menu'
import { PaneTab, PaneTabLabel } from './pane-tab'

afterEach(cleanup)

describe('PaneTab close gestures', () => {
  it('middle-click closes — pointer events only, no auxclick', () => {
    const onClose = vi.fn()
    render(
      <PaneTab onClose={onClose}>
        <PaneTabLabel>tab</PaneTabLabel>
      </PaneTab>
    )

    const tab = screen.getByText('tab')
    fireEvent.pointerDown(tab, { button: 1 })
    fireEvent.pointerUp(tab, { button: 1 })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('⌘-click (metaKey + button 0) closes — the Mac middle-click equivalent', () => {
    const onClose = vi.fn()
    render(
      <PaneTab onClose={onClose}>
        <PaneTabLabel>tab</PaneTabLabel>
      </PaneTab>
    )

    fireEvent.pointerDown(screen.getByText('tab'), { button: 0, metaKey: true })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('⌘-click preempts the shell drag/activate pointerdown handler', () => {
    const onClose = vi.fn()
    const onPointerDown = vi.fn()
    render(
      <PaneTab onClose={onClose} onPointerDown={onPointerDown}>
        <PaneTabLabel>tab</PaneTabLabel>
      </PaneTab>
    )

    fireEvent.pointerDown(screen.getByText('tab'), { button: 0, metaKey: true })
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onPointerDown).not.toHaveBeenCalled()
  })

  it('⌘-click swallows the follow-up activation click (capture phase)', () => {
    const onClose = vi.fn()
    const onActivate = vi.fn()
    render(
      <PaneTab onClose={onClose}>
        <PaneTabLabel as="button" onClick={onActivate}>
          tab
        </PaneTabLabel>
      </PaneTab>
    )

    fireEvent.click(screen.getByText('tab'), { button: 0, metaKey: true })
    expect(onActivate).not.toHaveBeenCalled()
  })

  it('plain left-click neither closes nor blocks activation', () => {
    const onClose = vi.fn()
    const onActivate = vi.fn()
    const onPointerDown = vi.fn()
    render(
      <PaneTab onClose={onClose} onPointerDown={onPointerDown}>
        <PaneTabLabel as="button" onClick={onActivate}>
          tab
        </PaneTabLabel>
      </PaneTab>
    )

    fireEvent.pointerDown(screen.getByText('tab'), { button: 0 })
    fireEvent.click(screen.getByText('tab'), { button: 0 })
    expect(onClose).not.toHaveBeenCalled()
    expect(onPointerDown).toHaveBeenCalledTimes(1)
    expect(onActivate).toHaveBeenCalledTimes(1)
  })

  it('does nothing without an onClose (uncloseable workspace tab)', () => {
    const onPointerDown = vi.fn()
    render(
      <PaneTab onPointerDown={onPointerDown}>
        <PaneTabLabel>tab</PaneTabLabel>
      </PaneTab>
    )

    fireEvent.pointerDown(screen.getByText('tab'), { button: 0, metaKey: true })
    expect(onPointerDown).toHaveBeenCalledTimes(1)
  })
})

describe('PaneTab hover close button', () => {
  it('clicking the ✕ closes without activating or dragging the tab', () => {
    const onClose = vi.fn()
    const onActivate = vi.fn()
    const onPointerDown = vi.fn()
    const { container } = render(
      <PaneTab onClose={onClose} onPointerDown={onPointerDown}>
        <PaneTabLabel as="button" onClick={onActivate}>
          tab
        </PaneTabLabel>
      </PaneTab>
    )

    // r293: o ✕ saiu da arvore ARIA (`aria-hidden`) porque e o MESMO gesto do Delete, nao um
    // segundo controle — deixa-lo nomeado dentro do role="tab" era `nested-interactive`.
    // O clique continua funcionando; so nao e mais encontrado por role.
    const close = container.querySelector('[data-slot="pane-tab-close"]')
    expect(close).not.toBeNull()
    fireEvent.pointerDown(close!, { button: 0 })
    fireEvent.click(close!, { button: 0 })
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onActivate).not.toHaveBeenCalled()
    expect(onPointerDown).not.toHaveBeenCalled()
  })

  it('r293: Delete e Backspace fecham, e o atalho e anunciado', () => {
    const onClose = vi.fn()
    render(
      <PaneTab onClose={onClose} role="tab" tabIndex={0}>
        <PaneTabLabel as="button">tab</PaneTabLabel>
      </PaneTab>
    )

    const tab = screen.getByRole('tab')
    expect(tab.getAttribute('aria-keyshortcuts')).toBe('Delete')

    fireEvent.keyDown(tab, { key: 'Delete' })
    expect(onClose).toHaveBeenCalledTimes(1)

    fireEvent.keyDown(tab, { key: 'Backspace' })
    expect(onClose).toHaveBeenCalledTimes(2)

    // Uma tecla que nao fecha nao dispara o onClose.
    fireEvent.keyDown(tab, { key: 'a' })
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('r97: o ✕ é afordância de mouse — presente, clicável e FORA da árvore acessível', () => {
    const { container } = render(
      <PaneTab onClose={() => {}} role="tab">
        <PaneTabLabel as="button">tab</PaneTabLabel>
      </PaneTab>
    )

    /*
     * Antes (r293) o ✕ era `<button aria-label="Close">` DENTRO de `role="tab"`, e o `axe-core`
     * recusava — `nested-interactive`. A r293 tentou `aria-hidden` e o próprio `axe` explicou por
     * que não bastava: o elemento continuava focável no DOM.
     *
     * A r97 resolveu tirando a INTERATIVIDADE: `<span aria-hidden>` sem `tabindex` e sem role não
     * é controle nem para a ARIA nem para o `axe`. Estas asserções travam os DOIS lados:
     * o mouse mantém o ✕, e a árvore acessível não ganha um segundo controle.
     */
    const fechar = container.querySelector('[data-slot="pane-tab-close"]')

    expect(fechar, 'o ✕ continua existindo para o mouse').not.toBeNull()
    expect(fechar!.getAttribute('aria-hidden')).not.toBeNull()
    expect(fechar!.tagName).toBe('SPAN')

    // E não é alcançável como controle: nem por role, nem por tab.
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull()
    expect(fechar!.getAttribute('tabindex')).toBeNull()

    // O caminho equivalente de teclado continua anunciado na aba (ver o teste do r293 acima).
    expect(screen.getByRole('tab').getAttribute('aria-keyshortcuts')).toBe('Delete')
  })

  it('renders no ✕ without an onClose', () => {
    render(
      <PaneTab>
        <PaneTabLabel>tab</PaneTabLabel>
      </PaneTab>
    )

    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull()
  })

  it('renders no ✕ on a vertical rail tab (middle/⌘-click only there)', () => {
    const onClose = vi.fn()
    render(
      <PaneTab onClose={onClose} vertical>
        <PaneTabLabel>tab</PaneTabLabel>
      </PaneTab>
    )

    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull()
  })
})

describe('PaneTab under a context-menu trigger', () => {
  // The trigger's injected data-slot used to replace ours, so the close-width and
  // label-mask rules keyed on [data-slot='pane-tab'] stopped matching session tabs.
  it('keeps its own data-slot and the menu marker', () => {
    render(
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <PaneTab onClose={vi.fn()}>
            <PaneTabLabel>tab</PaneTabLabel>
          </PaneTab>
        </ContextMenuTrigger>
      </ContextMenu>
    )

    const tab = screen.getByText('tab').closest('[data-closeable]')

    expect(tab?.getAttribute('data-slot')).toBe('pane-tab')
    expect(tab?.hasAttribute(HERMES_CONTEXT_MENU_TRIGGER_ATTR)).toBe(true)
  })
})
