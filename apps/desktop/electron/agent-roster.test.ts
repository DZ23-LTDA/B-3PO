// Agentes departamentais (rodada 142).
//
// O que estes testes travam: nenhum agente que mexe em dinheiro, pessoa ou Fisco passa de PREPARE; a
// comparação de nível é por ORDEM; e id errado não vira "o primeiro da lista".

import { describe, expect, it } from 'vitest'

import {
  AGENTES,
  agentePorId,
  NIVEIS,
  ordemDoNivel,
  podeExecutar,
  tetoNoDominio
} from './agent-roster'

describe('roster', () => {
  it('tem os 11 agentes do GOAL', () => {
    expect(AGENTES).toHaveLength(11)
  })

  it('os ids do GOAL estao todos presentes', () => {
    const ids = AGENTES.map(a => a.id)

    for (const esperado of [
      'business_manager',
      'sales',
      'support',
      'inventory',
      'finance',
      'scheduling',
      'marketing',
      'hr',
      'operations',
      'after_sales',
      'analytics'
    ]) {
      expect(ids).toContain(esperado)
    }
  })

  it('todo agente tem missao, le e ao menos uma capacidade', () => {
    for (const agente of AGENTES) {
      expect(agente.missao.length).toBeGreaterThan(10)
      expect(agente.le.length).toBeGreaterThan(0)
      expect(agente.capacidades.length).toBeGreaterThan(0)
    }
  })

  it('nao ha id repetido', () => {
    expect(new Set(AGENTES.map(a => a.id)).size).toBe(AGENTES.length)
  })

  it('todo nivel usado existe na lista do GOAL', () => {
    for (const agente of AGENTES) {
      for (const cap of agente.capacidades) {
        expect(NIVEIS).toContain(cap.nivel)
      }
    }
  })
})

describe('tetos que protegem dinheiro, pessoa e Fisco', () => {
  it('financeiro NUNCA executa pagamento', () => {
    const finance = agentePorId('finance')!

    // A checagem e por ACAO, nao por dominio: o teto de inance e EXECUTE_ALLOWED por causa de
    // "categorizar" e "alertar", e isso nao autoriza pagar.
    expect(podeExecutar(finance, 'finance', 'efetuar pagamento', 'EXECUTE_ALLOWED')).toBe(false)
    expect(podeExecutar(finance, 'finance', 'efetuar pagamento', 'PREPARE')).toBe(true)
    expect(podeExecutar(finance, 'finance', 'categorizar', 'EXECUTE_ALLOWED')).toBe(true)
    expect(finance.nuncaSozinho).toContain('pagamento')
  })

  it('RH NUNCA contrata nem demite', () => {
    const hr = agentePorId('hr')!

    expect(podeExecutar(hr, 'hr', 'preparar aviso', 'EXECUTE_ALLOWED')).toBe(false)
    expect(podeExecutar(hr, 'hr', 'consultar', 'READ')).toBe(true)
    expect(hr.nuncaSozinho).toContain('demitir')
  })

  it('marketing NUNCA publica sozinho', () => {
    const marketing = agentePorId('marketing')!

    expect(podeExecutar(marketing, 'marketing', 'publicar', 'EXECUTE_ALLOWED')).toBe(false)
    expect(podeExecutar(marketing, 'marketing', 'publicar', 'PREPARE')).toBe(true)
    expect(marketing.nuncaSozinho).toContain('publicação pública')
  })

  it('desconto acima do limite e PREPARE, mas fechar venda e execucao', () => {
    // O teto e POR CAPACIDADE: o mesmo agente tem os dois niveis dentro do dominio `sales`.
    const sales = agentePorId('sales')!
    const capacidades = sales.capacidades.filter(c => c.dominio === 'sales')

    // Tres capacidades no dominio: registrar pedido (executa), montar proposta e desconto (preparam).
    expect(capacidades.map(c => c.nivel).sort()).toEqual(['EXECUTE_ALLOWED', 'PREPARE', 'PREPARE'])
    // O desconto, especificamente, nunca executa sozinho.
    expect(podeExecutar(sales, 'sales', 'conceder desconto', 'EXECUTE_ALLOWED')).toBe(false)
  })

  it('estoque nao ajusta saldo sem contagem', () => {
    expect(agentePorId('inventory')!.nuncaSozinho).toContain('ajustar saldo sem contagem')
  })
})

describe('ordem do nivel', () => {
  it('segue a lista do GOAL', () => {
    expect(ordemDoNivel('READ')).toBe(0)
    expect(ordemDoNivel('RECOMMEND')).toBe(1)
    expect(ordemDoNivel('PREPARE')).toBe(2)
    expect(ordemDoNivel('EXECUTE_ALLOWED')).toBe(3)
    expect(ordemDoNivel('SUPERVISED_AUTONOMY')).toBe(4)
  })
})

describe('podeExecutar', () => {
  it('quem executa tambem le', () => {
    // Comparacao por ordem: um agente que so pudesse exatamente o seu nivel nao conseguiria consultar o que
    // precisa para decidir.
    const support = agentePorId('support')!

    expect(podeExecutar(support, 'desk', 'responder', 'EXECUTE_ALLOWED')).toBe(true)
    expect(podeExecutar(support, 'desk', 'responder', 'READ')).toBe(true)
  })

  it('quem so le NAO executa', () => {
    const analytics = agentePorId('analytics')!

    expect(podeExecutar(analytics, 'analytics', 'responder pergunta', 'READ')).toBe(true)
    expect(podeExecutar(analytics, 'analytics', 'responder pergunta', 'EXECUTE_ALLOWED')).toBe(false)
  })

  it('dominio onde o agente nao atua devolve false', () => {
    const hr = agentePorId('hr')!

    expect(podeExecutar(hr, 'finance', 'categorizar', 'READ')).toBe(false)
  })
})

describe('tetoNoDominio', () => {
  it('devolve o MAIOR nivel do dominio', () => {
    // `sales` tem EXECUTE_ALLOWED e PREPARE; o teto e o maior.
    expect(tetoNoDominio(agentePorId('sales')!, 'sales')).toBe('EXECUTE_ALLOWED')
  })

  it('dominio ausente devolve null, nao READ', () => {
    // `READ` afirmaria que o agente pode consultar; null diz a verdade.
    expect(tetoNoDominio(agentePorId('hr')!, 'finance')).toBeNull()
  })
})

describe('agentePorId', () => {
  it('acha pelo id exato', () => {
    expect(agentePorId('finance')?.nome).toBeDefined()
  })

  it('id errado devolve undefined, nao o primeiro da lista', () => {
    expect(agentePorId('nao_existe')).toBeUndefined()
    expect(agentePorId('')).toBeUndefined()
  })
})
