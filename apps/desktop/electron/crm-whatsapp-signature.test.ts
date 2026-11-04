import { createHmac } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import { verifyMetaSignature } from './crm-whatsapp-signature'

const SEGREDO = 'segredo-de-teste-local'
const CORPO = JSON.stringify({ object: 'whatsapp_business_account', entry: [] })
const assinar = (corpo: string, segredo = SEGREDO) =>
  'sha256=' + createHmac('sha256', segredo).update(corpo, 'utf8').digest('hex')

describe('verifyMetaSignature', () => {
  it('aceita a assinatura correta', () => {
    expect(verifyMetaSignature(CORPO, assinar(CORPO), SEGREDO)).toEqual({ ok: true })
  })

  it('recusa corpo alterado depois da assinatura', () => {
    const adulterado = CORPO.replace('[]', '[{}]')
    const r = verifyMetaSignature(adulterado, assinar(CORPO), SEGREDO)

    expect(r).toEqual({ ok: false, reason: 'assinatura_invalida' })
  })

  it('recusa assinatura feita com OUTRO segredo', () => {
    const r = verifyMetaSignature(CORPO, assinar(CORPO, 'outro-segredo'), SEGREDO)

    expect(r).toEqual({ ok: false, reason: 'assinatura_invalida' })
  })

  it('fail-closed: sem segredo configurado nao passa nada', () => {
    expect(verifyMetaSignature(CORPO, assinar(CORPO), '')).toEqual({ ok: false, reason: 'segredo_ausente' })
    expect(verifyMetaSignature(CORPO, assinar(CORPO), null)).toEqual({ ok: false, reason: 'segredo_ausente' })
  })

  it('recusa quando o cabecalho nao veio', () => {
    expect(verifyMetaSignature(CORPO, null, SEGREDO)).toEqual({ ok: false, reason: 'assinatura_ausente' })
    expect(verifyMetaSignature(CORPO, '', SEGREDO)).toEqual({ ok: false, reason: 'assinatura_ausente' })
  })

  it('recusa formato errado em vez de tentar comparar', () => {
    expect(verifyMetaSignature(CORPO, assinar(CORPO).slice('sha256='.length), SEGREDO)).toEqual({
      ok: false,
      reason: 'formato_invalido',
    })
    expect(verifyMetaSignature(CORPO, 'sha1=abc', SEGREDO)).toEqual({ ok: false, reason: 'formato_invalido' })
    expect(verifyMetaSignature(CORPO, 'sha256=zz', SEGREDO)).toEqual({ ok: false, reason: 'formato_invalido' })
  })

  it('aceita hex em maiuscula (header varia entre implementacoes)', () => {
    const maiuscula = 'sha256=' + assinar(CORPO).slice('sha256='.length).toUpperCase()

    expect(verifyMetaSignature(CORPO, maiuscula, SEGREDO)).toEqual({ ok: true })
  })

  it('corpo vazio tambem e assinavel e verificavel', () => {
    expect(verifyMetaSignature('', assinar(''), SEGREDO)).toEqual({ ok: true })
  })

  it('assinatura de tamanho diferente nao estoura (timingSafeEqual lanca com tamanhos distintos)', () => {
    expect(() => verifyMetaSignature(CORPO, 'sha256=' + 'a'.repeat(63), SEGREDO)).not.toThrow()
    expect(verifyMetaSignature(CORPO, 'sha256=' + 'a'.repeat(63), SEGREDO)).toEqual({
      ok: false,
      reason: 'formato_invalido',
    })
  })
})
