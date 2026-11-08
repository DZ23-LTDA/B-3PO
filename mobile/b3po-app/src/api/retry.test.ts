import { describe, expect, it } from 'vitest'

import { nextRetryDelay, RETRY_BUTTON_LABEL, RETRY_DELAYS_MS, retryingCopy } from './retry'

describe('politica de reconexao', () => {
  it('usa as esperas declaradas e depois para', () => {
    expect(nextRetryDelay(0)).toBe(RETRY_DELAYS_MS[0])
    expect(nextRetryDelay(1)).toBe(RETRY_DELAYS_MS[1])
    expect(nextRetryDelay(2)).toBe(RETRY_DELAYS_MS[2])
    expect(nextRetryDelay(3)).toBeNull()
    expect(nextRetryDelay(99)).toBeNull()
  })

  it('nao trava com entrada invalida', () => {
    expect(nextRetryDelay(-1)).toBe(RETRY_DELAYS_MS[0])
    expect(nextRetryDelay(Number.NaN)).toBe(RETRY_DELAYS_MS[0])
    expect(nextRetryDelay(1.7)).toBe(RETRY_DELAYS_MS[1])
  })

  it('diz quantas tentativas automaticas restam', () => {
    expect(retryingCopy(0)).toContain('1s')
    expect(retryingCopy(0)).toContain('3 tentativas')
    expect(retryingCopy(2)).toContain('8s')
    expect(retryingCopy(2)).toContain('1 tentativa')
  })

  it('quando as automaticas acabam, manda tocar no botao e nao promete nada', () => {
    const copy = retryingCopy(3)

    expect(copy).toContain(RETRY_BUTTON_LABEL)
    // Nada de contagem regressiva quando nao ha mais tentativa automatica agendada.
    expect(copy).not.toContain('Tentando de novo')
    expect(copy).not.toMatch(/\d+s \(/)
  })
})
