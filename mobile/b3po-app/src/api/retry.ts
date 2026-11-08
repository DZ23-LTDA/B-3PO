/**
 * Quando tentar de novo depois de uma falha de conexao.
 *
 * O app nao tinha reacao a queda do servidor: o cartao de erro ficava parado e o usuario tinha de
 * fechar e abrir o aplicativo. Aqui vive so a decisao (espera quanto, quantas vezes, o que escrever na
 * tela) para que ela seja testavel sem aparelho; a tela apenas agenda e desenha.
 */

/** Esperas entre tentativas automaticas. Depois da ultima, so no toque do usuario. */
export const RETRY_DELAYS_MS = [1000, 3000, 8000] as const

/**
 * Espera (ms) antes da proxima tentativa automatica, ou `null` quando as automaticas acabaram.
 * `attempt` e o numero de falhas ja ocorridas (0 na primeira).
 */
export function nextRetryDelay(attempt: number): number | null {
  if (!Number.isFinite(attempt) || attempt < 0) {
    return RETRY_DELAYS_MS[0]
  }

  const index = Math.floor(attempt)

  const delay: number | undefined = RETRY_DELAYS_MS[index]

  return delay ?? null
}

/** Texto do cartao enquanto espera: diz que vai tentar e quantas automaticas restam. */
export function retryingCopy(attempt: number): string {
  const delay = nextRetryDelay(attempt)

  if (delay === null) {
    return 'Não consegui falar com o computador. Toque em "Tentar de novo" quando ele estiver aberto.'
  }

  const remaining = RETRY_DELAYS_MS.length - Math.floor(attempt)
  const seconds = Math.round(delay / 1000)

  return `Tentando de novo em ${seconds}s (mais ${remaining} tentativa${remaining === 1 ? '' : 's'} automatica${remaining === 1 ? '' : 's'}).`
}

/** Rotulo do botao manual; constante para o teste poder comparar sem duplicar texto. */
export const RETRY_BUTTON_LABEL = 'Tentar de novo'
