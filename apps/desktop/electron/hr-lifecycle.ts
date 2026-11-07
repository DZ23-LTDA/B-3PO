// Ciclo de vida do colaborador: desligamento e treinamento (rodada 187).
//
// O PROBLEMA QUE ISTO RESOLVE
//
// O GOAL §19 pede offboarding e treinamentos. A r183 mediu que nenhum dos dois existia. Sao as duas pontas do
// mesmo problema: **o que a pessoa precisa saber para exercer a funcao** e **o que precisa ser devolvido quando
// sai**.
//
// POR QUE O DESLIGAMENTO NAO E UM `DELETE`
//
// Demitir alguem nao apaga o registro: a folha, os documentos e o historico disciplinar continuam existindo
// por obrigacao legal. O desligamento e um EVENTO com data e checklist — e as pendencias dele importam mais que
// o status, porque um acesso que continua ativo depois da saida e o risco real.

export type ItemDevolucao =
  | 'acesso_sistemas'
  | 'cracha'
  | 'equipamento'
  | 'ferramentas'
  | 'veiculo'
  | 'documentos_confidenciais'

export type ChecklistOffboarding = {
  /** Itens que a empresa considera obrigatorios para este colaborador. */
  exigidos: readonly ItemDevolucao[]
  /** Itens ja devolvidos ou revogados. */
  concluidos: readonly ItemDevolucao[]
}

export type ResultadoOffboarding =
  | { pode_encerrar: true }
  | {
      // `pendentes` vai junto de proposito: "faltam 3 itens" nao ajuda ninguem a agir; "faltam acesso a
      // sistemas e cracha" sim.
      motivo: 'pendencias'
      pendentes: ItemDevolucao[]
      pode_encerrar: false
    }

/**
 * O desligamento pode ser encerrado?
 *
 * Regras:
 *
 * 1. Item concluido que nao estava exigido NAO conta a favor: alguem devolveu o cracha, mas o acesso ao sistema
 *    continua aberto, e o checklist nao pode parecer completo por causa disso.
 * 2. Sem itens exigidos, o checklist esta completo — nao ha o que devolver.
 * 3. A ordem dos pendentes segue a dos exigidos, para o relatorio nao mudar de forma entre execucoes.
 */
export function avaliarOffboarding(checklist: ChecklistOffboarding): ResultadoOffboarding {
  const concluidos = new Set(checklist.concluidos)
  const pendentes = checklist.exigidos.filter(item => !concluidos.has(item))

  if (pendentes.length === 0) {
    return { pode_encerrar: true }
  }

  return { motivo: 'pendencias', pendentes, pode_encerrar: false }
}

/** Uma pendencia que bloqueia a saida e do tipo que continua dando acesso a empresa. */
export function bloqueiaPorAcesso(pendentes: readonly ItemDevolucao[]): boolean {
  // Veiculo ou cracha sao perda patrimonial; acesso a sistemas e o unico que continua permitindo agir em nome
  // da empresa depois que a pessoa foi desligada.
  return pendentes.includes('acesso_sistemas')
}

export type Treinamento = {
  /** Validade em dias. `null` = nao vence. */
  validade_dias: number | null
  /** Quando foi concluido, em ms. `null` = nao concluido. */
  concluido_em: number | null
  id: string
  /** Torna o treinamento obrigatorio para a funcao. */
  obrigatorio: boolean
}

export type SituacaoTreinamento =
  | { id: string; situacao: 'ok' }
  | { id: string; dias_restantes: number; situacao: 'vencendo' }
  | { id: string; situacao: 'vencido'; vencido_ha_dias: number }
  | { id: string; situacao: 'pendente' }

const DIA_MS = 24 * 60 * 60 * 1000

/**
 * Situacao de um treinamento numa data de referencia.
 *
 * `agora` e parametro, nao relogio: um teste que usa a hora real nasce flaky e um relatorio que usa a hora real
 * muda de resposta entre duas execucoes do mesmo dia (a licao da r145, onde `listar` sem `agora` fez fixtures
 * nascerem expiradas).
 *
 * `dias_restantes` usa `Math.ceil`: 2,4 dias para vencer ainda e "3 dias" para quem vai agendar, nao "2".
 */
export function situacaoDoTreinamento(
  treinamento: Treinamento,
  agora: number,
  janelaAvisoDias = 30
): SituacaoTreinamento {
  if (treinamento.concluido_em === null) {
    return { id: treinamento.id, situacao: 'pendente' }
  }

  if (treinamento.validade_dias === null) {
    return { id: treinamento.id, situacao: 'ok' }
  }

  const venceEm = treinamento.concluido_em + treinamento.validade_dias * DIA_MS
  const restanteMs = venceEm - agora

  if (restanteMs <= 0) {
    return {
      id: treinamento.id,
      situacao: 'vencido',
      vencido_ha_dias: Math.floor(Math.abs(restanteMs) / DIA_MS)
    }
  }

  const dias = Math.ceil(restanteMs / DIA_MS)

  return dias <= janelaAvisoDias ? { id: treinamento.id, dias_restantes: dias, situacao: 'vencendo' } : { id: treinamento.id, situacao: 'ok' }
}

/** Treinamentos obrigatorios que impedem a pessoa de exercer a funcao hoje. */
export function treinamentosImpeditivos(
  treinamentos: readonly Treinamento[],
  agora: number
): SituacaoTreinamento[] {
  return treinamentos
    .filter(t => t.obrigatorio)
    .map(t => situacaoDoTreinamento(t, agora))
    .filter(s => s.situacao === 'pendente' || s.situacao === 'vencido')
}
