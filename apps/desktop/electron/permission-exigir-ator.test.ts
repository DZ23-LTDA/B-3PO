// `exigirAtor`: o caminho que faltava para os canais de dominio (rodada 216).
//
// POR QUE ESTE TESTE EXISTE
//
// `permission-guard.ts` tinha `guardedHandler(actorOf: () => Actor, ...)`. O tipo promete que o ator existe —
// e ninguem verifica. Quando `actorOf()` devolve `null`, `can(null, ...)` explode com "cannot read properties
// of null". Um canal de dominio escrito sobre `guardedHandler` **parece protegido e quebra na primeira
// instalacao sem dono**.
//
// `exigirAtor` fecha isso: aceita `Actor | null`, e a ausencia vira recusa explicita, nao exception.
//
// O TESTE FIXA AS TRES PROPRIEDADES QUE IMPORTAM
//
// 1. sem ator: recusa com `sem_ator`, e o corpo NAO roda (nada e gravado, nada e lido)
// 2. ator sem nivel: recusa com o motivo de `can`, e o corpo NAO roda
// 3. ator com nivel: o corpo roda e a decisao e auditada

import { describe, expect, it } from 'vitest'

import { exigirAtor } from './permission-guard'
import type { Actor, AuditEntry } from './rbac'

const DONO: Actor = { id: 'dono', kind: 'human', level: 'EXECUTE_ALLOWED', role: 'owner' }
const SO_LE: Actor = { id: 'leitor', kind: 'human', level: 'READ', role: 'viewer' }

describe('sem ator', () => {
  it('recusa com sem_ator e nao executa o corpo', async () => {
    let executou = false

    const r = await exigirAtor(
      async () => null,
      'execute',
      'inventory',
      async () => {
        executou = true
        return 'gravado'
      }
    )

    expect(r).toEqual({ error: 'sem_permissao', reason: 'sem_ator' })
    // O ponto central: a recusa acontece ANTES do efeito, nao depois.
    expect(executou).toBe(false)
  })

  it('vale para leitura tambem', async () => {
    let leu = false

    const r = await exigirAtor(
      async () => null,
      'read',
      'finance',
      async () => {
        leu = true
        return ['dado']
      }
    )

    expect(r).toMatchObject({ reason: 'sem_ator' })
    expect(leu).toBe(false)
  })

  it('nao lanca — devolve valor, como o resto dos canais', async () => {
    // Um canal que lanca vira "erro inesperado" na tela; um que devolve `error` vira mensagem util.
    await expect(exigirAtor(async () => null, 'read', 'hr', async () => 'x')).resolves.toBeDefined()
  })
})

describe('ator sem nivel suficiente', () => {
  it('quem so le nao executa', async () => {
    let executou = false

    const r = await exigirAtor(async () => SO_LE, 'execute', 'finance', async () => {
      executou = true
      return 'ok'
    })

    expect(r).toMatchObject({ error: 'sem_permissao' })
    expect(executou).toBe(false)
  })

  it('o motivo vem de can, nao de texto generico', async () => {
    // Um "sem permissao" sem motivo deixa o usuario sem saber o que pedir.
    const r = (await exigirAtor(async () => SO_LE, 'execute', 'finance', async () => 'ok')) as {
      error: string
      reason: string
    }

    expect(r.error).toBe('sem_permissao')
    expect(r.reason.length).toBeGreaterThan(0)
  })

  it('quem so le ainda le', async () => {
    // A guarda nao pode transformar "nao escreve" em "nao ve".
    const r = await exigirAtor(async () => SO_LE, 'read', 'finance', async () => 'relatorio')

    expect(r).toBe('relatorio')
  })
})

describe('ator com nivel', () => {
  it('executa e devolve o resultado do corpo', async () => {
    const r = await exigirAtor(async () => DONO, 'execute', 'inventory', async () => ({ balance: 7 }))

    expect(r).toEqual({ balance: 7 })
  })

  it('audita a decisao permitida', async () => {
    const vistos: AuditEntry[] = []

    await exigirAtor(async () => DONO, 'read', 'crm', async () => 'ok', { onAudit: e => vistos.push(e), now: () => 1000 })

    expect(vistos).toHaveLength(1)
    expect(vistos[0]!.actorId).toBe('dono')
  })

  it('audita tambem a negada', async () => {
    // Auditoria que so registra o que passou nao serve para investigar tentativa.
    const vistos: AuditEntry[] = []

    await exigirAtor(async () => SO_LE, 'execute', 'crm', async () => 'ok', { onAudit: e => vistos.push(e) })

    expect(vistos).toHaveLength(1)
  })
})
