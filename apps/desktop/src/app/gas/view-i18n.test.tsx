import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * As telas novas **montadas** em inglês.
 *
 * POR QUE ESTE ARQUIVO EXISTE (e o que o `i18n.test.tsx` do lado não cobre)
 *
 * O teste anterior prova o **resolvedor** e a **forma dos dados** — chave existe, variante em inglês,
 * nenhum acento. Ele **não** prova que `GasView` **usa** aquela chave: se amanhã alguém trocar
 * `{copy.title}` por `Vasilhames` fixo, os 8 testes continuam verdes.
 *
 * Aqui o componente é montado de verdade, com o `I18nProvider` forçado em `en` e o bridge do Electron
 * mockado com dados reais (um vasilhame em comodato, um perdido, um medidor com duas leituras). Se
 * algum texto voltar a ser hardcoded em português, estes testes falham.
 *
 * O bridge é mockado porque `gas`/`medidores` falam IPC — em teste não há processo principal. O mock
 * devolve **a forma exata** do contrato (`gas-store.ts` / `meter-store.ts`), que é o que a tela consome.
 */

const GAS_LIST = {
  saldo: { em_comodato: 1, em_estoque: 1, perdidos: 1, por_tipo: { botijao_13: 2 } },
  vasilhames: [
    {
      customer_id: null,
      deposit_cents: 0,
      delivered_at: 0,
      id: 'v1',
      kind: 'botijao_13' as const,
      lost_reason: '',
      returned_at: null,
      serial: 'SN-1',
      status: 'estoque' as const,
      updated_at: 1,
    },
    {
      customer_id: '5511999990000',
      deposit_cents: 0,
      delivered_at: 1_700_000_000_000,
      id: 'v2',
      kind: 'botijao_45' as const,
      lost_reason: '',
      returned_at: null,
      serial: 'SN-2',
      status: 'comodato' as const,
      updated_at: 1,
    },
    {
      customer_id: null,
      deposit_cents: 0,
      delivered_at: 0,
      id: 'v3',
      kind: 'galao_20' as const,
      lost_reason: 'cliente mudou de cidade',
      returned_at: null,
      serial: '',
      status: 'perdido' as const,
      updated_at: 1,
    },
  ],
}

const MED_LIST = {
  consumos: [
    {
      anterior: { id: 'l1', medidor_id: 'm1', read_at: 1_000, reading_milli: 10_000 },
      atual: { id: 'l2', medidor_id: 'm1', read_at: 2_000, reading_milli: 12_100 },
      consumo_milli: 2_100,
      medidor_id: 'm1',
    },
  ],
  leituras: [],
  medidores: [{ customer_id: '5511999990000', id: 'm1', installed_at: 1, kind: 'hidrometro' as const, serial: 'HID-1' }],
}

function instalarBridge() {
  const host = globalThis as unknown as Record<string, unknown>

  host.hermesDesktop = {
    crmContacts: undefined,
    gas: {
      cadastrar: vi.fn(async () => ({ error: 'indisponivel' })),
      devolver: vi.fn(async () => ({ error: 'indisponivel' })),
      doCliente: vi.fn(async () => ({ vasilhames: [] })),
      entregar: vi.fn(async () => ({ error: 'indisponivel' })),
      list: vi.fn(async () => GAS_LIST),
      perder: vi.fn(async () => ({ error: 'indisponivel' })),
    },
    medidores: {
      cadastrar: vi.fn(async () => ({ error: 'indisponivel' })),
      leitura: vi.fn(async () => ({ error: 'indisponivel' })),
      list: vi.fn(async () => MED_LIST),
    },
  }
}

/**
 * Monta a view com o provider do MESMO grafo de módulos.
 *
 * `vi.resetModules()` limpa o registro — então um `I18nProvider` importado no topo do arquivo
 * pertence a uma instância de `@/i18n/context` DIFERENTE da que a view (importada depois) enxerga. Dois
 * contextos React diferentes = a view não recebe o locale e cai no default em inglês. Foi exatamente
 * esse o defeito da primeira versão deste teste: os casos `pt-BR` mostravam "Cylinders".
 */
async function montar(view: () => Promise<{ default?: never } & Record<string, unknown>>, nome: string, locale: string) {
  const [{ I18nProvider }, mod] = await Promise.all([import('@/i18n'), view()])
  const View = (mod as Record<string, React.ComponentType>)[nome]!

  return render(
    <I18nProvider configClient={null} initialLocale={locale}>
      <View />
    </I18nProvider>
  )
}

describe('GasView montada em inglês', () => {
  beforeEach(() => {
    instalarBridge()
    // o bridge é lido no import de `@/api/gas` via globalThis, então recarregamos os módulos
    vi.resetModules()
  })

  afterEach(() => {
    cleanup()
    delete (globalThis as unknown as Record<string, unknown>).hermesDesktop
  })

  it('mostra o título, a intro e os três saldos em inglês', async () => {
    await montar(() => import('./index'), 'GasView', 'en')

    await waitFor(() => expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Cylinders'))

    expect(screen.getByText(/A cylinder that leaves with the customer/)).toBeTruthy()
    expect(screen.getByText('At the dealer')).toBeTruthy()
    expect(screen.getByText('With the customer')).toBeTruthy()
    expect(screen.getByText('Lost')).toBeTruthy()
    // nada em português na tela
    expect(document.body.textContent).not.toContain('Na revenda')
    expect(document.body.textContent).not.toContain('Entrada de vasilhame')
  })

  it('traduz os cabeçalhos da tabela e as ações', async () => {
    await montar(() => import('./index'), 'GasView', 'en')

    await waitFor(() => expect(screen.getByText('Cylinder intake')).toBeTruthy())

    for (const cabecalho of ['Type', 'Serial', 'State', 'Customer', 'Actions']) {
      expect(screen.getAllByText(cabecalho).length).toBeGreaterThan(0)
    }

    // ações: um vasilhame em estoque oferece "Hand over"; um em comodato oferece "Collect"/"Write off"
    expect(screen.getByText('Hand over')).toBeTruthy()
    expect(screen.getByText('Collect')).toBeTruthy()
    expect(screen.getByText('Write off')).toBeTruthy()
  })

  it('traduz o rótulo do tipo e do status vindos do modelo', async () => {
    await montar(() => import('./index'), 'GasView', 'en')

    await waitFor(() => expect(screen.getByText('Cylinder intake')).toBeTruthy())

    // kind botijao_45 -> "45 kg" · status comodato -> "with the customer"
    expect(screen.getAllByText('45 kg').length).toBeGreaterThan(0)
    expect(screen.getAllByText('with the customer').length).toBeGreaterThan(0)
    expect(screen.getAllByText('lost').length).toBeGreaterThan(0)
  })

  it('em pt-BR a MESMA tela mostra português', async () => {
    await montar(() => import('./index'), 'GasView', 'pt')

    await waitFor(() => expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Vasilhames'))
    expect(screen.getByText('Na revenda')).toBeTruthy()
    expect(screen.getByText('Entrada de vasilhame')).toBeTruthy()
  })
})

describe('MedidoresView montada em inglês', () => {
  beforeEach(() => {
    instalarBridge()
    vi.resetModules()
  })

  afterEach(() => {
    cleanup()
    delete (globalThis as unknown as Record<string, unknown>).hermesDesktop
  })

  it('mostra título, intro e a seção de leitura em inglês', async () => {
    await montar(() => import('../medidores'), 'MedidoresView', 'en')

    await waitFor(() => expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Meters'))

    expect(screen.getByText(/Water is billed by the difference/)).toBeTruthy()
    expect(screen.getByText('New meter')).toBeTruthy()
    expect(screen.getByText('Record reading')).toBeTruthy()
    expect(document.body.textContent).not.toContain('Novo medidor')
  })

  it('traduz os cabeçalhos e o consumo calculado', async () => {
    await montar(() => import('../medidores'), 'MedidoresView', 'en')

    await waitFor(() => expect(screen.getByText('New meter')).toBeTruthy())

    for (const cabecalho of ['Meter', 'Customer', 'Consumption', 'Current reading', 'Previous']) {
      expect(screen.getAllByText(cabecalho).length).toBeGreaterThan(0)
    }

    // 2100 milésimos -> "2,100 m³" e "2.100 L"
    expect(document.body.textContent).toContain('2,100 m³')
  })

  it('em pt-BR a MESMA tela mostra português', async () => {
    await montar(() => import('../medidores'), 'MedidoresView', 'pt')

    await waitFor(() => expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Medidores'))
    expect(screen.getByText('Novo medidor')).toBeTruthy()
  })
})
