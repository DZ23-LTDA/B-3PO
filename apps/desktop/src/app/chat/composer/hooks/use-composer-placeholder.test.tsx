import { render, screen, waitFor } from '@testing-library/react'
import { type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'

import { I18nProvider, type I18nConfigClient } from '@/i18n'

import { useComposerPlaceholder } from './use-composer-placeholder'

function Probe(): ReactNode {
  const placeholder = useComposerPlaceholder({ disabled: false, reconnecting: false, sessionId: null })

  return <span data-testid="placeholder">{placeholder}</span>
}

function wrap(configClient: I18nConfigClient) {
  return render(
    <I18nProvider configClient={configClient}>
      <Probe />
    </I18nProvider>
  )
}

describe('useComposerPlaceholder', () => {
  it('re-escolhe o placeholder quando o idioma resolve depois do mount', async () => {
    const configClient: I18nConfigClient = {
      getConfig: async () => ({ display: { language: 'pt' } }),
      saveConfig: async () => ({ ok: true })
    }

    wrap(configClient)

    // Textos de `pt.composer.newSessionPlaceholders` — nenhum deles existe no catálogo inglês.
    const PT_STARTERS = [
      'O que vamos construir?',
      'Dê uma tarefa ao B-3PO',
      'No que você está pensando?',
      'Descreva o que precisa',
      'O que vamos resolver?',
      'Pergunte qualquer coisa',
      'Comece com um objetivo'
    ]

    // O locale resolve depois do primeiro paint; sem re-rolar, o texto fica no inglês do mount.
    await waitFor(() => {
      expect(PT_STARTERS).toContain(screen.getByTestId('placeholder').textContent)
    })
  })
})
