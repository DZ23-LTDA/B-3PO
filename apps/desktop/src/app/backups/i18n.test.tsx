import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { TRANSLATIONS } from '@/i18n/catalog'

/**
 * A tela de backups em inglês e em português, **montada**.
 *
 * O restore é o canal mais destrutivo do app: ele sobrescreve dados de negócio. As frases que explicam
 * isso — o `confirm` com arquivo e data, a dica de que é reversível, e a mensagem de sucesso — não são
 * decoração: são o que impede um clique errado. Se elas caírem para o idioma errado (ou para uma chave
 * crua), quem opera perde a única explicação que tinha.
 */

const LISTA = {
  arquivos: [
    {
      nome: 'inventory.json',
      versoes: [
        { arquivo: 'inventory.1794000000000.json', bytes: 1638, quando: 1_794_000_000_000 },
        { arquivo: 'inventory.1793000000000.json', bytes: 1200, quando: 1_793_000_000_000 },
      ],
    },
    {
      nome: 'sales.json',
      versoes: [{ arquivo: 'sales.1794000000001.json', bytes: 1740, quando: 1_794_000_000_001 }],
    },
  ],
}

function instalarBridge() {
  ;(globalThis as unknown as Record<string, unknown>).hermesDesktop = {
    backup: {
      list: vi.fn(async () => LISTA),
      restore: vi.fn(async () => ({ arquivoSalvo: 'inventory.json', bytes: 1638, ok: true, versaoAplicada: 'x' })),
    },
  }
}

/** Provider e view do MESMO grafo de módulos — ver o comentário em `gas/view-i18n.test.tsx`. */
async function montar(locale: string) {
  const [{ I18nProvider }, mod] = await Promise.all([import('@/i18n'), import('./index')])

  return render(
    <I18nProvider configClient={null} initialLocale={locale}>
      <mod.BackupsView />
    </I18nProvider>
  )
}

describe('BackupsView', () => {
  beforeEach(() => {
    instalarBridge()
    vi.resetModules()
  })

  afterEach(() => {
    cleanup()
    delete (globalThis as unknown as Record<string, unknown>).hermesDesktop
  })

  it('em inglês, mostra título, intro e o resumo', async () => {
    await montar('en')

    await waitFor(() => expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Backups'))

    expect(screen.getByText(/Every write keeps the previous version/)).toBeTruthy()
    expect(screen.getByText('2 files · 3 versions')).toBeTruthy()
    expect(document.body.textContent).not.toContain('Cada gravação')
  })

  it('em inglês, a tabela de versões tem cabeçalhos traduzidos', async () => {
    await montar('en')

    await waitFor(() => expect(screen.getByText('2 files · 3 versions')).toBeTruthy())

    // abre a primeira lista
    screen.getAllByText('See versions')[0]!.click()

    await waitFor(() => expect(screen.getAllByText('Saved on').length).toBeGreaterThan(0))

    for (const cabecalho of ['Saved on', 'Size', 'Version']) {
      expect(screen.getAllByText(cabecalho).length).toBeGreaterThan(0)
    }

    expect(screen.getAllByText('Restore').length).toBeGreaterThan(0)
  })

  it('em pt-BR, a mesma tela mostra português', async () => {
    await montar('pt')

    await waitFor(() => expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Backups'))

    expect(screen.getByText(/Cada gravação guarda a versão anterior/)).toBeTruthy()
    expect(screen.getByText('2 arquivos · 3 versões')).toBeTruthy()
    expect(screen.getAllByText('Ver versões').length).toBeGreaterThan(0)
  })

  it('a confirmação cita ARQUIVO e DATA — não é um "tem certeza?"', () => {
    const en = TRANSLATIONS.en.settings.backups
    const pt = TRANSLATIONS.pt.settings.backups

    expect(en.confirmar('inventory.json', '06/11 18:20')).toBe(
      'Restore inventory.json to the version from 06/11 18:20?'
    )
    expect(pt.confirmar('inventory.json', '06/11 18:20')).toBe(
      'Restaurar inventory.json para a versão de 06/11 18:20?'
    )
    // e diz que é reversível
    expect(en.confirmarDica.toLowerCase()).toContain('undone')
    expect(pt.confirmarDica.toLowerCase()).toContain('desfeito')
  })

  it('o plural funciona nos dois idiomas', () => {
    expect(TRANSLATIONS.en.settings.backups.resumo(1, 1)).toBe('1 file · 1 version')
    expect(TRANSLATIONS.en.settings.backups.resumo(2, 5)).toBe('2 files · 5 versions')
    expect(TRANSLATIONS.pt.settings.backups.resumo(1, 1)).toBe('1 arquivo · 1 versão')
    expect(TRANSLATIONS.pt.settings.backups.resumo(3, 12)).toBe('3 arquivos · 12 versões')
  })
})
