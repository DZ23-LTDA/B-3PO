// Justificativa de cancelamento fiscal (rodada 110).
//
// O que estes testes travam: a justificativa tem tamanho minimo e nao e texto vazio. O produto enviava
// "cancelada pelo operador" fixo — 22 caracteres que passam no tamanho mas nao sao uma justificativa.

import { describe, expect, it } from 'vitest'

import { avaliarMotivo, motivoErroTexto, MOTIVO_MAXIMO, MOTIVO_MINIMO } from './fiscal-cancel'
import { sandboxProvider } from './fiscal-provider'

const VALIDO = 'cliente desistiu da compra'

describe('avaliarMotivo', () => {
  it('aceita uma justificativa de tamanho suficiente', () => {
    const r = avaliarMotivo(VALIDO)

    expect(r.erro).toBeUndefined()
    expect(r.texto).toBe(VALIDO)
  })

  it('recusa vazio', () => {
    expect(avaliarMotivo('').erro).toBe('motivo_obrigatorio')
    expect(avaliarMotivo('   ').erro).toBe('motivo_obrigatorio')
    expect(avaliarMotivo(null).erro).toBe('motivo_obrigatorio')
    expect(avaliarMotivo(42).erro).toBe('motivo_obrigatorio')
  })

  it('recusa curto: "x" nao cancela nada', () => {
    expect(avaliarMotivo('x').erro).toBe('motivo_curto')
    expect(avaliarMotivo('desistiu').erro).toBe('motivo_curto')
  })

  it('conta o tamanho depois de colapsar espacos', () => {
    // 5 letras + 20 espacos pareceriam 25; na verdade sao 5.
    expect(avaliarMotivo('a     b     c     d     e').erro).toBe('motivo_curto')
  })

  it('aceita exatamente o minimo', () => {
    const exato = 'a'.repeat(MOTIVO_MINIMO)

    expect(avaliarMotivo(exato).erro).toBeUndefined()
    expect(avaliarMotivo(exato).texto).toHaveLength(MOTIVO_MINIMO)
    expect(avaliarMotivo('a'.repeat(MOTIVO_MINIMO - 1)).erro).toBe('motivo_curto')
  })

  it('trunca acima do maximo em vez de recusar', () => {
    // Um motivo longo e valido; o campo da autoridade e que tem limite.
    const longo = 'a'.repeat(MOTIVO_MAXIMO + 50)

    expect(avaliarMotivo(longo).erro).toBeUndefined()
    expect(avaliarMotivo(longo).texto).toHaveLength(MOTIVO_MAXIMO)
  })

  it('normaliza espacos internos e das pontas', () => {
    expect(avaliarMotivo('  cliente   desistiu  ').texto).toBe('cliente desistiu')
  })

  it('a mensagem de erro e legivel em portugues e cita o minimo', () => {
    expect(motivoErroTexto('motivo_curto')).toContain(String(MOTIVO_MINIMO))
    expect(motivoErroTexto('motivo_obrigatorio')).toMatch(/justificativa/i)
  })
})

describe('sandbox recusa cancelamento sem justificativa valida', () => {
  it('sem motivo', async () => {
    const p = sandboxProvider()
    const emitido = await p.emitir({ kind: 'nfe', payload: {}, ref: 'venda:1', tenant_id: 'local' })

    if ('error' in emitido) throw new Error(emitido.error)

    expect(await p.cancelar(emitido.resultado.chave, '')).toEqual({ error: 'motivo_obrigatorio' })
  })

  it('motivo curto', async () => {
    const p = sandboxProvider()
    const emitido = await p.emitir({ kind: 'nfe', payload: {}, ref: 'venda:1', tenant_id: 'local' })

    if ('error' in emitido) throw new Error(emitido.error)

    expect(await p.cancelar(emitido.resultado.chave, 'x')).toEqual({ error: 'motivo_curto' })
  })

  it('motivo valido cancela', async () => {
    const p = sandboxProvider()
    const emitido = await p.emitir({ kind: 'nfe', payload: {}, ref: 'venda:1', tenant_id: 'local' })

    if ('error' in emitido) throw new Error(emitido.error)

    const r = await p.cancelar(emitido.resultado.chave, VALIDO)

    if ('error' in r) throw new Error(r.error)

    expect(r.resultado.status).toBe('cancelado')
    expect(r.resultado.mensagem).toContain(VALIDO)
  })
})
