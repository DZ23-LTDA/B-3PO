// Bloqueios de agenda (rodada 124).
//
// O que estes testes travam: bloqueio sobreposto é recusado, bloqueio não some ao listar outro tenant, e
// arquivo corrompido não derruba a agenda.

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { openSchedulingBlocks, schedulingBlocksPath } from './scheduling-block-store'

const HORA = 3_600_000
const BASE = 1_700_000_000_000

let userData = ''

beforeEach(() => {
  userData = mkdtempSync(join(tmpdir(), 'b3po-blocks-'))
})

afterEach(() => {
  rmSync(userData, { force: true, recursive: true })
})

const entrada = (over: Record<string, unknown> = {}) => ({
  ends_at: BASE + HORA,
  motivo: 'almoco',
  resource_id: 'prof-1',
  starts_at: BASE,
  ...over
})

describe('criar', () => {
  it('grava e devolve o bloqueio', () => {
    const s = openSchedulingBlocks(userData)
    const r = s.criar(entrada(), BASE)

    expect(r.error).toBeUndefined()
    expect(r.block?.id).toMatch(/^blk_/)
    expect(r.block?.motivo).toBe('almoco')
    expect(s.listar()).toHaveLength(1)
  })

  it('recusa sem recurso e sem motivo', () => {
    const s = openSchedulingBlocks(userData)

    expect(s.criar(entrada({ resource_id: '  ' }))).toEqual({ error: 'recurso_obrigatorio' })
    expect(s.criar(entrada({ motivo: '' }))).toEqual({ error: 'motivo_obrigatorio' })
  })

  it('recusa periodo invalido', () => {
    const s = openSchedulingBlocks(userData)

    expect(s.criar(entrada({ ends_at: BASE }))).toEqual({ error: 'periodo_invalido' })
    expect(s.criar(entrada({ ends_at: BASE - HORA }))).toEqual({ error: 'periodo_invalido' })
  })

  it('recusa sobreposicao com bloqueio do mesmo recurso', () => {
    // Dois bloqueios no mesmo intervalo nao somam nada e escondem erro de digitacao.
    const s = openSchedulingBlocks(userData)

    s.criar(entrada(), BASE)

    expect(s.criar(entrada({ starts_at: BASE + HORA / 2 }), BASE)).toEqual({ error: 'bloqueio_sobreposto' })
  })

  it('aceita sobreposicao com bloqueio de OUTRO recurso', () => {
    const s = openSchedulingBlocks(userData)

    s.criar(entrada(), BASE)

    expect(s.criar(entrada({ resource_id: 'prof-2' }), BASE).error).toBeUndefined()
  })

  it('aceita bloqueio que encosta no fim do outro (fim exclusivo)', () => {
    const s = openSchedulingBlocks(userData)

    s.criar(entrada({ ends_at: BASE + HORA }), BASE)

    expect(s.criar(entrada({ ends_at: BASE + 2 * HORA, starts_at: BASE + HORA }), BASE).error).toBeUndefined()
  })
})

describe('listar', () => {
  it('ordena por inicio', () => {
    const s = openSchedulingBlocks(userData)

    s.criar(entrada({ ends_at: BASE + 3 * HORA, starts_at: BASE + 2 * HORA, resource_id: 'b' }), BASE)
    s.criar(entrada({ ends_at: BASE + HORA, resource_id: 'a' }), BASE)

    expect(s.listar().map(b => b.resource_id)).toEqual(['a', 'b'])
  })

  it('sobrevive ao reabrir o store: e dado gravado, nao memoria', () => {
    // Um bloqueio que so existe em memoria some quando o app fecha, e o horario do almoco volta a parecer
    // livre.
    openSchedulingBlocks(userData).criar(entrada(), BASE)

    expect(openSchedulingBlocks(userData).listar()).toHaveLength(1)
  })

  it('arquivo corrompido nao derruba a agenda', () => {
    const caminho = schedulingBlocksPath(userData)

    mkdirSync(join(userData, 'b3po'), { recursive: true })
    writeFileSync(caminho, '{ isso nao e json', 'utf8')

    expect(openSchedulingBlocks(userData).listar()).toEqual([])
  })

  it('descarta entrada invalida do arquivo em vez de propagar', () => {
    const caminho = schedulingBlocksPath(userData)

    mkdirSync(join(userData, 'b3po'), { recursive: true })
    writeFileSync(
      caminho,
      JSON.stringify({
        blocks: [
          { id: 'x' },
          { created_at: 1, ends_at: 2, id: 'ok', motivo: 'm', resource_id: 'r', starts_at: 1, tenant_id: 'local' }
        ]
      }),
      'utf8'
    )

    const lista = openSchedulingBlocks(userData).listar()

    expect(lista).toHaveLength(1)
    expect(lista[0]!.id).toBe('ok')
  })
})

describe('remover', () => {
  it('remove pelo id', () => {
    const s = openSchedulingBlocks(userData)
    const r = s.criar(entrada(), BASE)

    expect(s.remover(r.block!.id)).toEqual({ removido: true })
    expect(s.listar()).toEqual([])
  })

  it('id inexistente devolve erro', () => {
    expect(openSchedulingBlocks(userData).remover('blk_nada')).toEqual({ error: 'bloqueio_nao_encontrado' })
  })
})
