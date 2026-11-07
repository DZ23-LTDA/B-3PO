// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'

/**
 * r3 do V4 — os CINCO estados da home, montados.
 *
 * POR QUE ESTE TESTE EXISTE
 *
 * A decisão de produto de 07/11 põe uma obrigação que não é cosmética: **"não transformar falhas de
 * API em zeros enganosos"**, e diferenciar *disponível*, *vazio*, *carregando*, *erro* e
 * *indisponível*.
 *
 * A tentativa de provar isso **em runtime** falhou, e vale registrar por quê: as pontes do Electron
 * são expostas por `contextBridge`, que **congela** o objeto — atribuir `hermesDesktop.agents.roster
 * = ...` é silenciosamente ignorado. Ou seja: não dá para forçar a falha mexendo na ponte viva.
 *
 * A prova certa é no componente, com o módulo de API trocado. É isso que estes testes fazem — e cada
 * um afirma **o que o usuário vê**, não como o estado é guardado.
 */

const agentesMock = vi.hoisted(() => ({ fn: vi.fn() }))
const projetosMock = vi.hoisted(() => ({ fn: vi.fn() }))
const planosMock = vi.hoisted(() => ({ fn: vi.fn() }))

vi.mock('@/api/agents', () => ({ listarAgentesComEstado: agentesMock.fn }))
vi.mock('@/api/projetos', () => ({
  listarProjetosComEstado: projetosMock.fn,
  STATUS_LABEL: { ativo: 'em andamento', cancelado: 'cancelado', concluido: 'concluído', planejado: 'a começar' }
}))
vi.mock('@/api/sofia', () => ({ listarPlanosComEstado: planosMock.fn }))

/** O hero carrega asset; a tela sob teste não é o hero. */
vi.mock('@/components/chat/brand-hero', () => ({
  BRAND_HERO_ALT: 'mascote',
  BrandHero: () => null
}))

const agente = { capacidades: [], id: 'a1', le: [], limites: {}, missao: 'missão do agente', nome: 'Agente Um', nuncaSozinho: [] }
const projeto = { created_at: 1, id: 'p1', nome: 'Projeto Um', status: 'ativo', updated_at: 2 }

async function montar() {
  const mod = await import('./home-b3po')
  const { I18nProvider } = await import('@/i18n')

  return render(
    <MemoryRouter>
      <I18nProvider configClient={null} initialLocale="pt">
        <mod.HomeB3po />
      </I18nProvider>
    </MemoryRouter>
  )
}

beforeEach(() => {
  agentesMock.fn.mockReset()
  projetosMock.fn.mockReset()
  planosMock.fn.mockReset()
})

afterEach(cleanup)

describe('estado ERRO — falha de leitura NÃO vira zero', () => {
  beforeEach(() => {
    agentesMock.fn.mockResolvedValue({ agentes: [], erro: 'ponte caiu', estado: 'erro' })
    projetosMock.fn.mockResolvedValue({ erro: 'ponte caiu', estado: 'erro', projetos: [] })
    planosMock.fn.mockResolvedValue({ erro: 'ponte caiu', estado: 'erro', planos: [] })
  })

  it('mostra a mensagem de falha, o detalhe e o botão de tentar de novo', async () => {
    await montar()

    await waitFor(() => {
      expect(screen.getAllByText('Não foi possível carregar agora.').length).toBeGreaterThan(0)
    })

    // o detalhe vem da ponte, não é inventado pela tela
    expect(screen.getAllByText('ponte caiu').length).toBeGreaterThan(0)

    // o caminho de saída existe
    expect(screen.getAllByRole('button', { name: /Tentar de novo/i }).length).toBeGreaterThan(0)
  })

  it('os indicadores viram travessão — e NÃO zero', async () => {
    await montar()

    await waitFor(() => {
      // TRES indicadores, e todos tem de virar travessao
      expect(screen.getAllByText('—', { selector: 'dd' })).toHaveLength(3)
    })

    // a falha não pode produzir a afirmação "0 agentes"
    expect(screen.queryByText('0', { selector: 'dd' })).toBeNull()
  })
})

describe('estado VAZIO — a lista respondeu e está vazia', () => {
  beforeEach(() => {
    agentesMock.fn.mockResolvedValue({ agentes: [], estado: 'ok' })
    projetosMock.fn.mockResolvedValue({ estado: 'ok', projetos: [] })
    planosMock.fn.mockResolvedValue({ estado: 'ok', planos: [] })
  })

  it('oferece criar o primeiro item, com destino real', async () => {
    await montar()

    await waitFor(() => {
      expect(screen.getByText(/Nenhum agente cadastrado ainda/i)).toBeTruthy()
    })

    expect(screen.getByText(/Nenhum projeto cadastrado ainda/i)).toBeTruthy()
    expect(screen.getByText(/A Sofia ainda não tem plano/i)).toBeTruthy()
  })

  it('vazio é 0 de verdade — aqui o 0 é uma afirmação sobre o produto', async () => {
    await montar()

    await waitFor(() => {
      expect(screen.getAllByText('0', { selector: 'dd' }).length).toBeGreaterThan(0)
    })
  })
})

describe('estado OK — dados reais aparecem', () => {
  beforeEach(() => {
    agentesMock.fn.mockResolvedValue({ agentes: [agente], estado: 'ok' })
    projetosMock.fn.mockResolvedValue({ estado: 'ok', projetos: [projeto] })
    planosMock.fn.mockResolvedValue({ estado: 'ok', planos: [] })
  })

  it('lista o agente e o projeto que a API devolveu', async () => {
    await montar()

    await waitFor(() => {
      expect(screen.getByText('Agente Um')).toBeTruthy()
    })

    expect(screen.getByText('Projeto Um')).toBeTruthy()
  })

  it('conta o projeto ativo no indicador', async () => {
    await montar()

    await waitFor(() => {
      // 1 agente · 1 projeto ativo · 0 concluídos
      const valores = screen.getAllByRole('definition').map(d => d.textContent?.trim())

      expect(valores).toContain('1')
    })
  })
})

describe('estado INDISPONÍVEL — a ponte não existe', () => {
  beforeEach(() => {
    agentesMock.fn.mockResolvedValue({ agentes: [], estado: 'indisponivel' })
    projetosMock.fn.mockResolvedValue({ estado: 'indisponivel', projetos: [] })
    planosMock.fn.mockResolvedValue({ estado: 'indisponivel', planos: [] })
  })

  it('diz que está indisponível, e não finge lista vazia', async () => {
    await montar()

    await waitFor(() => {
      expect(screen.getAllByText('Indisponível nesta versão.').length).toBeGreaterThan(0)
    })

    // ausência de ponte não é um convite a criar: não aparece "nenhum agente cadastrado"
    expect(screen.queryByText(/Nenhum agente cadastrado ainda/i)).toBeNull()
  })
})

describe('os seis modos continuam sendo o primeiro ato', () => {
  beforeEach(() => {
    agentesMock.fn.mockResolvedValue({ agentes: [], estado: 'ok' })
    projetosMock.fn.mockResolvedValue({ estado: 'ok', projetos: [] })
    planosMock.fn.mockResolvedValue({ estado: 'ok', planos: [] })
  })

  it('renderiza os seis, com estado pressionado no ativo', async () => {
    await montar()

    await waitFor(() => {
      expect(screen.getByText('Engenharia')).toBeTruthy()
    })

    for (const nome of ['Empresa', 'Engenharia', 'Automação', 'IA e Agentes', 'Estratégico', 'Administração']) {
      expect(screen.getByText(nome), `${nome} ausente`).toBeTruthy()
    }

    // o grupo de escolha tem nome acessível
    expect(screen.getByRole('group', { name: /Escolher modo de trabalho/i })).toBeTruthy()
  })
})

describe('as linhas sao ACAO, nao decoracao (r11 do V4)', () => {
  beforeEach(() => {
    agentesMock.fn.mockResolvedValue({ agentes: [agente], estado: 'ok' })
    projetosMock.fn.mockResolvedValue({ estado: 'ok', projetos: [projeto] })
    planosMock.fn.mockResolvedValue({ estado: 'ok', planos: [] })
  })

  /*
   * r11 do V4 — o contrato MUDOU, e para melhor.
   *
   * A primeira versao deste teste exigia que a linha do agente fosse um `<button>`. Descobri que nao
   * existe tela de detalhe de um agente embutido: o roster sao 11 definicoes do produto
   * (`agent-roster.ts`) e nenhuma rota os lista. Um botao ali seria **rota morta** — o mesmo defeito
   * que o "Ver todos" tinha ao apontar para `/agents` (que mostra ATOres, nao o roster).
   *
   * O que a linha tem de fazer agora: existir como texto legivel. E o "Ver todos" tem de EXPANDIR.
   */
  it('o agente aparece como texto — sem botao que nao leva a lugar nenhum', async () => {
    await montar()

    await waitFor(() => {
      expect(screen.getByText('Agente Um')).toBeTruthy()
    })

    expect(screen.queryByRole('button', { name: /Agente Um/ })).toBeNull()
  })

  it('o nome do projeto e um botao', async () => {
    await montar()

    await waitFor(() => {
      expect(screen.getByText('Projeto Um')).toBeTruthy()
    })

    expect(screen.getByRole('button', { name: /Projeto Um/ })).toBeTruthy()
  })
})
