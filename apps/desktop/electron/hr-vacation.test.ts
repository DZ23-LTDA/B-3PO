// Férias (rodada 135).
//
// O que estes testes travam: o período conta em meses de calendário (não blocos de 30 dias), o direito nasce
// ao fim do aquisitivo, e o concessivo vencido marca `vencida` — o estado que dobra o valor.

import { describe, expect, it } from 'vitest'

import {
  diasDeFerias,
  FALTAS_SEM_DIREITO,
  periodoAquisitivo,
  situacaoFerias,
  tercoConstitucional
} from './hr-vacation'

const DIA = 86_400_000
const utc = (iso: string) => Date.parse(`${iso}T00:00:00Z`)

describe('periodoAquisitivo', () => {
  it('conta em meses de calendario, nao em blocos de 30 dias', () => {
    // Admissao 31/01. Em 28/02 completou 1 mes de calendario (fevereiro nao tem 31).
    const p = periodoAquisitivo(utc('2026-01-31'), utc('2026-02-28'))

    expect(p.meses).toBe(1)
  })

  it('o mes corrente nao conta se o dia ainda nao chegou', () => {
    const p = periodoAquisitivo(utc('2026-01-15'), utc('2026-03-10'))

    // Completou 15/02 e nao 15/03 -> 1 mes.
    expect(p.meses).toBe(1)
  })

  it('completa 12 meses e comeca o segundo ciclo', () => {
    const p = periodoAquisitivo(utc('2025-03-01'), utc('2026-03-01'))

    expect(p.meses).toBe(0)
    expect(p.inicio).toBe(utc('2026-03-01'))
    expect(p.fim).toBe(utc('2027-03-01'))
  })

  it('11 meses no primeiro ciclo', () => {
    const p = periodoAquisitivo(utc('2025-03-01'), utc('2026-02-01'))

    expect(p.meses).toBe(11)
    expect(p.inicio).toBe(utc('2025-03-01'))
  })

  it('referencia anterior a admissao nao gera meses negativos', () => {
    const p = periodoAquisitivo(utc('2026-06-01'), utc('2026-01-01'))

    expect(p.meses).toBe(0)
  })
})

describe('diasDeFerias', () => {
  it('30 dias apos 12 meses', () => {
    expect(diasDeFerias(12)).toBe(30)
    expect(diasDeFerias(15)).toBe(30)
  })

  it('proporcional: 1/12 por mes', () => {
    expect(diasDeFerias(1)).toBe(2)
    expect(diasDeFerias(6)).toBe(15)
    expect(diasDeFerias(11)).toBe(27)
  })

  it('arredonda para baixo: a CLT nao conhece meio dia', () => {
    // 5/12 de 30 = 12.5 -> 12
    expect(diasDeFerias(5)).toBe(12)
    expect(Number.isInteger(diasDeFerias(5))).toBe(true)
  })

  it('faltas reduzem os dias (art. 130)', () => {
    expect(diasDeFerias(12, 0)).toBe(30)
    expect(diasDeFerias(12, 5)).toBe(30)
    expect(diasDeFerias(12, 6)).toBe(24)
    expect(diasDeFerias(12, 15)).toBe(18)
    expect(diasDeFerias(12, 24)).toBe(12)
  })

  it('acima de 32 faltas perde o direito', () => {
    expect(diasDeFerias(12, FALTAS_SEM_DIREITO)).toBe(12)
    expect(diasDeFerias(12, FALTAS_SEM_DIREITO + 1)).toBe(0)
  })

  it('sem meses trabalhados nao ha direito', () => {
    expect(diasDeFerias(0)).toBe(0)
    expect(diasDeFerias(-3)).toBe(0)
  })
})

describe('tercoConstitucional', () => {
  it('um terco do valor, arredondado para baixo', () => {
    expect(tercoConstitucional(3000)).toBe(1000)
    // 1000/3 = 333.33 -> 333
    expect(tercoConstitucional(1000)).toBe(333)
  })

  it('valor invalido ou zero devolve zero', () => {
    expect(tercoConstitucional(0)).toBe(0)
    expect(tercoConstitucional(-100)).toBe(0)
    expect(tercoConstitucional(Number.NaN)).toBe(0)
  })
})

describe('situacaoFerias', () => {
  it('durante o aquisitivo: a_vencer', () => {
    const s = situacaoFerias(utc('2025-03-01'), utc('2025-09-01'))

    expect(s.situacao).toBe('a_vencer')
    expect(s.dias).toBeGreaterThan(0)
  })

  it('depois do aquisitivo, dentro do concessivo: disponivel', () => {
    const s = situacaoFerias(utc('2024-03-01'), utc('2025-06-01'))

    expect(s.situacao).toBe('disponivel')
    expect(s.dias).toBe(30)
  })

  it('concessivo vencido: VENCIDA — o estado que dobra o valor', () => {
    // Admissao 01/03/2024. Ciclos fechados: 2024-03->2025-03 (concessivo ate 2026-02) e
    // 2025-03->2026-03 (concessivo ate 2027-02). Referencia 2027-06: o ultimo fechado ja venceu.
    const s = situacaoFerias(utc('2024-03-01'), utc('2027-06-01'), 0, utc('2024-03-01'))

    expect(s.situacao).toBe('vencida')
  })

  it('com varios ciclos, reporta o ULTIMO fechado', () => {
    // Admissao 2024-03-01, referencia 2026-06: o ciclo 2025-03->2026-03 fechou e o concessivo vai ate
    // 2027-02. O periodo anterior pode estar vencido, mas sem historico de gozo a funcao nao sabe - e
    // afirmar "vencida" seria inventar. Fica registrado como divida: exige store de ferias gozadas.
    expect(situacaoFerias(utc('2024-03-01'), utc('2026-06-01'), 0, utc('2025-03-01')).situacao).toBe('disponivel')
  })

  it('o limite concessivo e o fim do aquisitivo mais 11 meses', () => {
    // Ainda no primeiro aquisitivo (2025-03 -> 2026-03): o limite e o fim dele + 11 meses.
    const s = situacaoFerias(utc('2025-03-01'), utc('2025-06-01'))

    expect(s.limite_concessivo).toBe(utc('2027-02-01'))
  })

  it('sem direito: faltas acima do limite', () => {
    const s = situacaoFerias(utc('2024-03-01'), utc('2025-06-01'), 40)

    expect(s.situacao).toBe('sem_direito')
    expect(s.dias).toBe(0)
  })

  it('a data de referencia nao altera o divisor: o direito do ciclo fechado e 30', () => {
    expect(situacaoFerias(utc('2024-03-01'), utc('2025-04-01'), 0, utc('2024-03-01')).dias).toBe(30)
    expect(situacaoFerias(utc('2024-03-01'), utc('2025-12-01'), 0, utc('2024-03-01')).dias).toBe(30)
  })
})
