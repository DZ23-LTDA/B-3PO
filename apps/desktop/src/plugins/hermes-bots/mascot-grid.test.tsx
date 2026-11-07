/**
 * Grade de mascotes: 20 botões acessíveis, seleção única e nenhum id inventado.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { MascotGrid } from './mascot-grid'
import { MASCOTS } from './mascots'

afterEach((): void => {
  cleanup()
})

describe('MascotGrid', () => {
  it('renderiza os 20 mascotes com nome acessível', () => {
    render(<MascotGrid onSelect={() => undefined} />)

    for (const mascot of MASCOTS) {
      expect(screen.getByRole('button', { name: mascot.name })).toBeTruthy()
    }

    expect(screen.getAllByRole('button')).toHaveLength(20)
  })

  it('marca o selecionado com aria-pressed e nenhum outro', () => {
    render(<MascotGrid onSelect={() => undefined} selectedId="cortex" />)

    const pressed = screen.getAllByRole('button').filter(button => button.getAttribute('aria-pressed') === 'true')
    expect(pressed).toHaveLength(1)
    expect(pressed[0]?.getAttribute('aria-label')).toBe('Cortex')
  })

  it('devolve o mascote completo ao clicar', () => {
    const onSelect = vi.fn()
    render(<MascotGrid onSelect={onSelect} />)

    fireEvent.click(screen.getByRole('button', { name: 'Nexus' }))

    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect.mock.calls[0][0]).toMatchObject({ id: 'nexus', name: 'Nexus' })
  })

  it('não marca nada quando o id selecionado não existe', () => {
    render(<MascotGrid onSelect={() => undefined} selectedId="nao-existe" />)

    const pressed = screen.getAllByRole('button').filter(button => button.getAttribute('aria-pressed') === 'true')
    expect(pressed).toHaveLength(0)
  })
})
