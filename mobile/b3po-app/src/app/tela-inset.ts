/**
 * r106 — o inset de status bar do Android, extraído para ser TESTÁVEL.
 *
 * O DEFEITO QUE ORIGINOU ISTO (medido, com captura)
 *
 * `App.tsx` usava `SafeAreaView` **do `react-native`**, que é **no-op no Android** — ele só aplica
 * inset no iOS. No emulador, o wordmark "B3PO" desenhava **por cima do relógio do sistema**:
 *
 *     B3PO
 *     09:56   ← sobreposto
 *
 * Isso não aparece em teste unitário nem em typecheck: o código estava sintaticamente correto, tipado
 * e rodando. Só um aparelho mostrou.
 *
 * POR QUE A CONTA SAIU DO `App.tsx`
 *
 * Porque a correção ficava provada apenas por captura de tela — e o emulador desta máquina aborta o
 * `system_server` (`SuspendAll timeout`) de forma intermitente, então a prova por captura é instável.
 * Uma função pura com a conta dentro é provável em qualquer máquina, sempre.
 *
 * A REGRA, e ela é simples de propósito
 *
 * - **Android**: o inset é a altura da status bar do sistema (`StatusBar.currentHeight`), que pode vir
 *   `undefined` em aparelhos que não a reportam — nesse caso o resultado é `0`, nunca `NaN`.
 * - **iOS**: `0`, porque lá o `SafeAreaView` do `react-native` **faz** o trabalho e somar os dois
 *   aplicaria o inset duas vezes.
 */

/** O mínimo que a função precisa saber do ambiente — injetável, para o teste não depender da máquina. */
export interface AmbienteDaTela {
  /** `Platform.OS`: `'android'`, `'ios'`, `'web'`… */
  os: string
  /** `StatusBar.currentHeight`. `undefined` em aparelhos que não reportam. */
  alturaDaStatusBar?: number
}

/**
 * O `paddingTop` que a tela deve aplicar, em pontos.
 *
 * Devolve sempre um número finito ≥ 0: um `undefined` que escapasse para o estilo viraria uma chave
 * ignorada pelo React Native, e o bug voltaria em silêncio.
 */
export function insetDoTopo(ambiente: AmbienteDaTela): number {
  if (ambiente.os !== 'android') return 0

  const altura = ambiente.alturaDaStatusBar

  if (typeof altura !== 'number' || !Number.isFinite(altura) || altura < 0) return 0

  return Math.round(altura)
}

/** O estilo da tela, pronto para o `StyleSheet`. Separado para o teste poder comparar o objeto. */
export function estiloDaTela(ambiente: AmbienteDaTela): { backgroundColor: string; flex: number; paddingTop: number } {
  return {
    backgroundColor: '#0b0d12',
    flex: 1,
    paddingTop: insetDoTopo(ambiente)
  }
}
