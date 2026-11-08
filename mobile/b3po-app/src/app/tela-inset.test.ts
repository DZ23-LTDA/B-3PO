import { describe, expect, it } from 'vitest'

import { estiloDaTela, insetDoTopo } from './tela-inset'

/**
 * r106 — o inset de status bar do Android.
 *
 * O bug que estes testes cobrem foi encontrado **só rodando no emulador**: o wordmark "B3PO"
 * desenhava por cima do relógio do sistema, porque `SafeAreaView` do `react-native` é **no-op no
 * Android**. Nenhum teste unitário ou typecheck pegaria aquilo — o código estava correto e tipado.
 *
 * Como o emulador desta máquina aborta o `system_server` de forma intermitente, a conta saiu para uma
 * função pura: agora a correção é provável em qualquer máquina, sem depender de captura de tela.
 */

describe('insetDoTopo — Android usa a altura da status bar', () => {
  it('devolve a altura reportada pelo sistema', () => {
    expect(insetDoTopo({ alturaDaStatusBar: 24, os: 'android' })).toBe(24)
    expect(insetDoTopo({ alturaDaStatusBar: 47, os: 'android' })).toBe(47)
  })

  it('arredonda altura fracionada (pixel ratio)', () => {
    expect(insetDoTopo({ alturaDaStatusBar: 23.7, os: 'android' })).toBe(24)
  })

  it('sem altura reportada, devolve 0 — nunca undefined/NaN', () => {
    expect(insetDoTopo({ os: 'android' })).toBe(0)
    expect(insetDoTopo({ alturaDaStatusBar: Number.NaN, os: 'android' })).toBe(0)
    expect(insetDoTopo({ alturaDaStatusBar: Number.POSITIVE_INFINITY, os: 'android' })).toBe(0)
  })

  it('altura negativa vira 0 — inset negativo puxaria a tela para fora', () => {
    expect(insetDoTopo({ alturaDaStatusBar: -10, os: 'android' })).toBe(0)
  })
})

describe('insetDoTopo — iOS NÃO soma, porque o SafeAreaView já aplica', () => {
  it('devolve 0 no iOS mesmo com altura reportada', () => {
    // Somar aqui aplicaria o inset DUAS vezes e criaria uma faixa morta no topo.
    expect(insetDoTopo({ alturaDaStatusBar: 47, os: 'ios' })).toBe(0)
  })

  it('devolve 0 no web', () => {
    expect(insetDoTopo({ alturaDaStatusBar: 24, os: 'web' })).toBe(0)
  })
})

describe('estiloDaTela — o estilo completo que a tela aplica', () => {
  it('no Android carrega o paddingTop do sistema', () => {
    expect(estiloDaTela({ alturaDaStatusBar: 24, os: 'android' }).paddingTop).toBe(24)
  })

  it('no iOS carrega paddingTop 0', () => {
    expect(estiloDaTela({ alturaDaStatusBar: 47, os: 'ios' }).paddingTop).toBe(0)
  })

  it('preserva o fundo e o flex — a correção não muda o resto da tela', () => {
    const estilo = estiloDaTela({ os: 'android', alturaDaStatusBar: 24 })

    expect(estilo.backgroundColor).toBe('#0b0d12')
    expect(estilo.flex).toBe(1)
  })

  it('paddingTop é sempre um número finito (uma chave undefined sumiria em silêncio)', () => {
    for (const os of ['android', 'ios', 'web']) {
      const { paddingTop } = estiloDaTela({ os })

      expect(Number.isFinite(paddingTop)).toBe(true)
      expect(paddingTop).toBeGreaterThanOrEqual(0)
    }
  })
})
