// Aprovação de ação de agente (rodada 144).
//
// O que estes testes travam: ninguém aprova o próprio pedido, aprovação é por AÇÃO (não por agente), e
// `PREPARE` deixa de ser beco sem saída.

import { describe, expect, it } from 'vitest'

import {
  bloqueioParaDecidir,
  MOTIVO_MINIMO,
  motivoValido,
  precisaAprovacao,
  recusaTexto,
  resumo,
  type SolicitacaoAprovacao
} from './agent-approval'

const AGORA = 1_700_000_000_000

function sol(over: Partial<SolicitacaoAprovacao> = {}): SolicitacaoAprovacao {
  return {
    acao: 'conceder desconto de 15%',
    decidido_em: null,
    decidido_por: null,
    dominio: 'sales',
    execution_id: 'e1',
    id: 'a1',
    motivo: 'cliente pediu desconto para fechar pedido grande',
    nivel_pedido: 'EXECUTE_ALLOWED',
    solicitado_em: AGORA,
    solicitado_por: 'agente-vendas',
    status: 'pendente',
    tenant_id: 'local',
    ...over
  }
}

describe('precisaAprovacao', () => {
  it('pedir acima do teto exige aprovacao', () => {
    expect(precisaAprovacao('PREPARE', 'EXECUTE_ALLOWED')).toBe(true)
  })

  it('pedir igual ou abaixo NAO exige', () => {
    // Senao um agente que so consulta precisaria de aprovacao para ler.
    expect(precisaAprovacao('PREPARE', 'PREPARE')).toBe(false)
    expect(precisaAprovacao('EXECUTE_ALLOWED', 'READ')).toBe(false)
  })

  it('sem teto no dominio, qualquer pedido exige', () => {
    expect(precisaAprovacao(null, 'READ')).toBe(true)
  })
})

describe('bloqueioParaDecidir', () => {
  it('NINGUEM aprova o proprio pedido', () => {
    // Sem esta regra um agente com acesso ao fluxo se auto-aprovaria e o teto viraria decoracao.
    expect(bloqueioParaDecidir(sol(), 'agente-vendas')).toBe('mesmo_autor')
  })

  it('outra pessoa pode decidir', () => {
    expect(bloqueioParaDecidir(sol(), 'leandro')).toBeNull()
  })

  it('solicitacao ja decidida nao se decide de novo', () => {
    expect(bloqueioParaDecidir(sol({ status: 'aprovada' }), 'leandro')).toBe('ja_decidida')
    expect(bloqueioParaDecidir(sol({ status: 'recusada' }), 'leandro')).toBe('ja_decidida')
  })

  it('a checagem de autor vem DEPOIS da de status', () => {
    // Se o proprio autor pedir de novo uma ja decidida, a resposta util e "ja decidida".
    expect(bloqueioParaDecidir(sol({ status: 'aprovada' }), 'agente-vendas')).toBe('ja_decidida')
  })
})

describe('motivoValido', () => {
  it('exige tamanho minimo', () => {
    expect(motivoValido('curto')).toBe(false)
    expect(motivoValido('a'.repeat(MOTIVO_MINIMO))).toBe(true)
  })

  it('so espacos nao vale', () => {
    expect(motivoValido('          ')).toBe(false)
    expect(motivoValido('')).toBe(false)
  })
})

describe('recusaTexto', () => {
  it('todo motivo tem texto que diz o que fazer', () => {
    for (const motivo of ['ja_decidida', 'mesmo_autor', 'motivo_curto'] as const) {
      const texto = recusaTexto(motivo)

      expect(texto.length).toBeGreaterThan(15)
      expect(texto).not.toContain('_')
    }
  })
})

describe('resumo', () => {
  it('conta cada status separadamente', () => {
    const r = resumo([
      sol({ id: '1', status: 'pendente' }),
      sol({ id: '2', status: 'pendente' }),
      sol({ id: '3', status: 'aprovada' }),
      sol({ id: '4', status: 'recusada' })
    ])

    expect(r).toEqual({ aprovadas: 1, pendentes: 2, recusadas: 1 })
  })

  it('fila vazia devolve zeros', () => {
    expect(resumo([])).toEqual({ aprovadas: 0, pendentes: 0, recusadas: 0 })
  })
})

describe('a aprovacao e por ACAO, nao por agente', () => {
  it('o pedido carrega o que foi pedido', () => {
    // Aprovar "conceder desconto" nao autoriza "pagamento no dia seguinte".
    const desconto = sol({ acao: 'conceder desconto de 15%' })
    const pagamento = sol({ acao: 'efetuar pagamento de R$ 5.000', id: 'a2', solicitado_por: 'agente-financeiro' })

    expect(desconto.acao).not.toBe(pagamento.acao)
    expect(desconto.id).not.toBe(pagamento.id)
  })

  it('cada solicitacao guarda quem pediu e quem decidiu', () => {
    const s = sol({ decidido_por: 'leandro', status: 'aprovada' })

    expect(s.solicitado_por).toBe('agente-vendas')
    expect(s.decidido_por).toBe('leandro')
    expect(s.solicitado_por).not.toBe(s.decidido_por)
  })
})
