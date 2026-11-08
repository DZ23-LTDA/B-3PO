// O orquestrador de tarefas (r22 do GOAL V2, §12).
//
// AS TRÊS COISAS QUE ESTES TESTES IMPEDEM
//
//   1. **prioridade furando dependência** — uma tarefa crítica que depende de uma normal tem de esperar.
//      Furar isso quebraria o plano e o resultado sairia errado, não só fora de ordem.
//   2. **retry infinito** — backoff sem teto vira horas na décima tentativa; sem limite de tentativas,
//      nunca desiste.
//   3. **timeout em tarefa que não começou** — `iniciada_em` ausente significa "nunca rodou"; cancelar
//      ali mataria trabalho que nem saiu da fila.

import { describe, expect, it } from 'vitest'

import {
  esperaAntesDeRetentar,
  estourouTimeout,
  filaDeDelegacao,
  podeRetentar,
  pesoDaPrioridade,
  resumoDoPlano,
  RETRY_PADRAO,
  tarefasEstouradas,
  type TarefaOrquestravel
} from './sofia-orquestrador'

function t(
  id: string,
  extra: Partial<TarefaOrquestravel> = {},
  depende: string[] = [],
  status: TarefaOrquestravel['status'] = 'pendente'
): TarefaOrquestravel {
  return { depende_de: depende, status, tarefa_id: id, ...extra }
}

describe('prioridade não fura dependência', () => {
  it('crítica que depende de normal espera a normal', () => {
    const fila = filaDeDelegacao([
      t('normal', { prioridade: 'normal' }),
      t('critica', { prioridade: 'critica' }, ['normal'])
    ])

    // A crítica é mais urgente, mas depende da normal: o grafo manda.
    expect(fila).toEqual(['normal'])
  })

  it('dentro do que o grafo liberou, crítica sai primeiro', () => {
    const fila = filaDeDelegacao([
      t('baixa', { prioridade: 'baixa' }),
      t('critica', { prioridade: 'critica' }),
      t('normal', { prioridade: 'normal' })
    ])

    expect(fila).toEqual(['critica', 'normal', 'baixa'])
  })

  it('empate de prioridade preserva a ordem do array', () => {
    const fila = filaDeDelegacao([t('z'), t('a'), t('m')])

    expect(fila).toEqual(['z', 'a', 'm'])
  })

  it('prioridade ausente é normal', () => {
    expect(pesoDaPrioridade(undefined)).toBe(pesoDaPrioridade('normal'))
    expect(pesoDaPrioridade('inventada')).toBe(pesoDaPrioridade('normal'))
  })
})

describe('limite de concorrência', () => {
  it('conta as que já estão executando', () => {
    // Limite 2, uma já executando: só cabe mais uma.
    const fila = filaDeDelegacao([t('rodando', {}, [], 'executando'), t('a'), t('b')], { limite: 2 })

    expect(fila).toHaveLength(1)
  })

  it('limite cheio devolve fila vazia', () => {
    const fila = filaDeDelegacao([t('a', {}, [], 'executando'), t('b', {}, [], 'executando'), t('c')], { limite: 2 })

    expect(fila).toEqual([])
  })

  it('sem limite, a fila é tudo que está pronto', () => {
    expect(filaDeDelegacao([t('a'), t('b'), t('c')])).toHaveLength(3)
  })
})

describe('retry com teto', () => {
  it('espera exponencial: 1s, 2s, 4s', () => {
    expect(esperaAntesDeRetentar(0)).toBe(1_000)
    expect(esperaAntesDeRetentar(1)).toBe(2_000)
    expect(esperaAntesDeRetentar(2)).toBe(4_000)
  })

  it('desiste na terceira tentativa (maxTentativas: 3)', () => {
    expect(podeRetentar(0)).toBe(true)
    expect(podeRetentar(2)).toBe(true)
    expect(podeRetentar(3)).toBe(false)
    expect(esperaAntesDeRetentar(3)).toBeNull()
  })

  it('o teto corta o crescimento exponencial', () => {
    // Sem teto, tentativa 10 esperaria ~1024 s (17 min). O teto de 60 s impede.
    const politica = { baseMs: 1_000, maxTentativas: 20, tetoMs: 60_000 }

    expect(esperaAntesDeRetentar(10, politica)).toBe(60_000)
  })

  it('aceita política customizada', () => {
    const politica = { baseMs: 100, maxTentativas: 2, tetoMs: 1_000 }

    expect(esperaAntesDeRetentar(0, politica)).toBe(100)
    expect(podeRetentar(2, politica)).toBe(false)
  })

  it('número inválido não gera espera', () => {
    expect(esperaAntesDeRetentar(-1)).toBeNull()
    expect(esperaAntesDeRetentar(Number.NaN)).toBeNull()
  })
})

describe('timeout', () => {
  const T0 = 1_700_000_000_000

  it('tarefa que não começou NUNCA estoura timeout', () => {
    // `iniciada_em` ausente = nunca rodou. Cancelar mataria trabalho que nem saiu da fila.
    expect(estourouTimeout(t('a', {}, [], 'executando'), T0, 1000)).toBe(false)
    expect(estourouTimeout(t('a', { iniciada_em: null }, [], 'executando'), T0, 1000)).toBe(false)
  })

  it('tarefa pendente não estoura, mesmo com iniciada_em antigo', () => {
    // O status manda: só `executando` pode estourar.
    expect(estourouTimeout(t('a', { iniciada_em: T0 - 999_999 }, [], 'pendente'), T0, 1000)).toBe(false)
  })

  it('executando além do limite estoura', () => {
    expect(estourouTimeout(t('a', { iniciada_em: T0 - 5_000 }, [], 'executando'), T0, 1000)).toBe(true)
  })

  it('executando dentro do limite não estoura', () => {
    expect(estourouTimeout(t('a', { iniciada_em: T0 - 500 }, [], 'executando'), T0, 1000)).toBe(false)
  })

  it('tarefasEstouradas lista só as que passaram', () => {
    const tarefas = [
      t('ok', { iniciada_em: T0 - 100 }, [], 'executando'),
      t('lenta', { iniciada_em: T0 - 9_000 }, [], 'executando'),
      t('parada', {}, [], 'pendente')
    ]

    expect(tarefasEstouradas(tarefas, T0, 1000)).toEqual(['lenta'])
  })
})

describe('resumo do plano', () => {
  const T0 = 1_700_000_000_000

  it('conta cada estado', () => {
    const r = resumoDoPlano(
      [
        t('c1', {}, [], 'concluida'),
        t('e1', { iniciada_em: T0 - 100 }, [], 'executando'),
        t('p1'),
        t('b1', {}, [], 'bloqueada')
      ],
      T0
    )

    expect(r.total).toBe(4)
    expect(r.concluidas).toBe(1)
    expect(r.executando).toBe(1)
    expect(r.pendentes).toBe(1)
    expect(r.bloqueadas).toBe(1)
  })

  it('falha que ainda pode retentar NÃO conta como bloqueada', () => {
    const r = resumoDoPlano([t('f', { tentativas: 1 }, [], 'falhou')], T0)

    expect(r.falhadas).toBe(0)
    expect(r.bloqueadas).toBe(0)
  })

  it('falha sem tentativa restante conta como bloqueada', () => {
    // maxTentativas do padrão é 3.
    const r = resumoDoPlano([t('f', { tentativas: RETRY_PADRAO.maxTentativas }, [], 'falhou')], T0)

    expect(r.falhadas).toBe(1)
    expect(r.bloqueadas).toBe(1)
  })

  it('lista as prontas e as que estouraram', () => {
    const r = resumoDoPlano(
      [t('pronta'), t('lenta', { iniciada_em: T0 - 9_999_999 }, [], 'executando')],
      T0,
      { timeoutMs: 1000 }
    )

    expect(r.prontas).toEqual(['pronta'])
    expect(r.estourouTimeout).toEqual(['lenta'])
  })

  it('plano vazio não inventa número', () => {
    const r = resumoDoPlano([], T0)

    expect(r).toMatchObject({ bloqueadas: 0, concluidas: 0, executando: 0, pendentes: 0, total: 0 })
  })
})
