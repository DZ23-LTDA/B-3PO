/**
 * Guarda de geracao da sessao.
 *
 * Revisao independente (MCP DZ23, request 1dabc773) apontou a corrida: `connect()` e assincrono, entao um
 * pedido que ja saiu pode terminar DEPOIS de o usuario tocar em Desconectar e sobrescrever o estado
 * `signed_out` por `connected`/`failed` — a sessao "ressuscita" sozinha na tela.
 *
 * A correcao e comparar a geracao capturada no inicio do pedido com a atual: se mudou, o resultado e velho
 * e deve ser descartado. Aqui vive so a comparacao, para poder ser testada sem aparelho.
 */

/** `true` quando o pedido que comecou em `startedAt` foi invalidado por um desconectar posterior. */
export function isStaleSession(startedAt: number, current: number): boolean {
  return startedAt !== current
}
