import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import {
  conditionKey,
  MAX_SWEEP_PER_RUN,
  parseSweep,
  planSweep,
  sweepStatePath,
  SweepStore,
  type Condition
} from './automation-sweep'

const T0 = 1_700_000_000_000

const cond = (over: Partial<Condition> = {}): Condition => ({
  entity_id: 't1',
  tenant_id: 'local',
  trigger: 'ticket.atrasado',
  ...over
})

async function withStore<T>(run: (store: SweepStore) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'b3po-sweep-'))

  try {
    return await run(new SweepStore(sweepStatePath(dir)))
  } finally {
    await rm(dir, { force: true, recursive: true })
  }
}

describe('planejamento puro', () => {
  it('condicao nunca avisada dispara', () => {
    expect(planSweep([cond()], { fired: {}, schema_version: 1 }).disparar).toHaveLength(1)
  })

  it('condicao ja avisada e silenciada enquanto persistir', () => {
    const estado = { fired: { [conditionKey('ticket.atrasado', 't1')]: T0 }, schema_version: 1 as const }
    const plano = planSweep([cond()], estado)

    expect(plano.disparar).toHaveLength(0)
    expect(plano.silenciadas).toBe(1)
  })

  it('entidades diferentes sao condicoes diferentes', () => {
    const estado = { fired: { [conditionKey('ticket.atrasado', 't1')]: T0 }, schema_version: 1 as const }

    expect(planSweep([cond(), cond({ entity_id: 't2' })], estado).disparar.map(c => c.entity_id)).toEqual(['t2'])
  })

  it('gatilhos diferentes nao compartilham memoria', () => {
    const estado = { fired: { [conditionKey('ticket.atrasado', 't1')]: T0 }, schema_version: 1 as const }
    const plano = planSweep([cond({ trigger: 'conta.vencendo' })], estado)

    expect(plano.disparar).toHaveLength(1)
  })

  it('arquivo corrompido vira vazio', () => {
    expect(parseSweep('nao e json')).toEqual({ fired: {}, schema_version: 1 })
  })
})

describe('varredura com memoria', () => {
  it('primeira varredura avisa; segunda NAO avisa de novo', async () => {
    await withStore(async store => {
      const run = vi.fn(async () => ({ candidatas: 1, interrompido: false, runs: [] }))

      const primeira = await store.run({ conditions: async () => [cond()], now: () => T0, run })
      const segunda = await store.run({ conditions: async () => [cond()], now: () => T0 + 60_000, run })

      expect(primeira.avisados).toBe(1)
      expect(segunda.avisados).toBe(0)
      expect(segunda.silenciados).toBe(1)
      // A regra rodou UMA vez em duas varreduras: e o ponto do mecanismo.
      expect(run).toHaveBeenCalledTimes(1)
    })
  })

  it('REARMA quando a condicao se resolve, e volta a avisar numa nova ocorrencia', async () => {
    await withStore(async store => {
      const run = vi.fn(async () => ({ candidatas: 1, interrompido: false, runs: [] }))

      await store.run({ conditions: async () => [cond()], now: () => T0, run })
      // Ticket resolvido: a condicao desaparece.
      const resolvido = await store.run({ conditions: async () => [], now: () => T0 + 1000, run })

      expect(resolvido.rearmados).toEqual([conditionKey('ticket.atrasado', 't1')])

      // O mesmo ticket atrasa de novo: e ocorrencia NOVA, deve avisar.
      const novo = await store.run({ conditions: async () => [cond()], now: () => T0 + 2000, run })

      expect(novo.avisados).toBe(1)
      expect(run).toHaveBeenCalledTimes(2)
    })
  })

  it('teto por varredura corta, e o que sobrou avisa na proxima', async () => {
    await withStore(async store => {
      const run = vi.fn(async () => ({ candidatas: 1, interrompido: false, runs: [] }))
      const muitas = Array.from({ length: MAX_SWEEP_PER_RUN + 5 }, (_, i) => cond({ entity_id: `t${i}` }))

      const primeira = await store.run({ conditions: async () => muitas, now: () => T0, run })

      expect(primeira.avisados).toBe(MAX_SWEEP_PER_RUN)
      expect(primeira.interrompido).toBe(true)

      // Na proxima, as 5 restantes ainda nao tem marca e sao avisadas.
      const segunda = await store.run({ conditions: async () => muitas, now: () => T0 + 60_000, run })

      expect(segunda.avisados).toBe(5)
      expect(segunda.interrompido).toBe(false)
    })
  })

  it('falha ao avisar NAO grava a marca, para a proxima varredura tentar', async () => {
    await withStore(async store => {
      const run = vi.fn(async () => {
        throw new Error('regra explodiu')
      })

      await expect(store.run({ conditions: async () => [cond()], now: () => T0, run })).rejects.toThrow('regra explodiu')

      const estado = await store.read()

      // Sem marca: a condicao continua "nao avisada" e sera tentada de novo.
      expect(estado.fired).toEqual({})
    })
  })

  it('nada a fazer nao escreve arquivo', async () => {
    await withStore(async store => {
      const run = vi.fn(async () => ({ candidatas: 0, interrompido: false, runs: [] }))
      const r = await store.run({ conditions: async () => [], now: () => T0, run })

      expect(r.avisados).toBe(0)
      expect(r.rearmados).toEqual([])
    })
  })
})
