// Justificativa de cancelamento de documento fiscal (rodada 110).
//
// POR QUE ESTA REGRA EXISTE
//
// A SEFAZ recusa cancelamento sem justificativa, e a justificativa tem tamanho mínimo — o objetivo é
// impedir cancelamento em massa sem motivo registrado. Um `"x"` não cancela nada.
//
// O produto estava enviando `"cancelada pelo operador"` fixo: tecnicamente tem 22 caracteres e passaria na
// validação de tamanho, mas **não é uma justificativa** — é a ausência dela com tamanho suficiente. Num
// cancelamento real isso vira documento cancelado sem motivo declarado.
//
// O QUE ESTA FUNÇÃO NÃO FAZ
//
// Não julga o mérito do motivo. "Cliente desistiu" e "erro de digitação no pedido" são ambos válidos; quem
// decide se o motivo procede é a autoridade fiscal, não o produto.

/** Mínimo de caracteres da justificativa de cancelamento (regra da NF-e). */
export const MOTIVO_MINIMO = 15

/** Máximo aceito pela SEFAZ; acima disso o texto é truncado pela própria autoridade. */
export const MOTIVO_MAXIMO = 255

export interface MotivoAvaliado {
  erro?: string
  /** Texto normalizado (espaços colapsados), pronto para enviar. */
  texto: string
}

/**
 * Valida e normaliza a justificativa.
 *
 * Colapsa espaços antes de medir: `"cliente     desistiu"` tem o mesmo tamanho de `"cliente desistiu"` para
 * quem lê, e contar os espaços crus deixaria passar texto que parece maior do que é.
 */
export function avaliarMotivo(value: unknown): MotivoAvaliado {
  const bruto = typeof value === 'string' ? value : ''
  const texto = bruto.replace(/\s+/g, ' ').trim()

  if (!texto) return { erro: 'motivo_obrigatorio', texto }

  if (texto.length < MOTIVO_MINIMO) {
    return { erro: 'motivo_curto', texto }
  }

  // Trunca em vez de recusar: um motivo longo é válido, só precisa caber no campo da autoridade.
  return { texto: texto.slice(0, MOTIVO_MAXIMO) }
}

/** Mensagem para a tela, em português, a partir do código de erro. */
export function motivoErroTexto(erro: string): string {
  const motivos: Record<string, string> = {
    motivo_curto: `A justificativa precisa de pelo menos ${MOTIVO_MINIMO} caracteres.`,
    motivo_obrigatorio: 'Informe a justificativa do cancelamento.'
  }

  return motivos[erro] ?? 'Justificativa inválida.'
}
