/**
 * Cruzamento entre conversa e oportunidade — pelo telefone, que os dois lados ja guardam.
 *
 * Nao criamos campo de vinculo novo de proposito: um id extra exigiria migracao, poderia divergir do telefone e criaria
 * duas verdades sobre "de quem e esta conversa". O telefone normalizado e a chave que ja existe nos dois lados.
 */

const digitos = (valor: string): string => valor.replace(/\D/g, '')

/** Compara telefone ignorando mascara, espaco e parenteses — o mesmo numero chega em formatos diferentes. */
export function samePhone(a: string, b: string): boolean {
  const da = digitos(a)
  const db = digitos(b)

  return da !== '' && db !== '' && da === db
}

interface ComTelefone {
  contact_phone: string
}

/** Oportunidades do contato desta conversa. Vazio quando o telefone nao casa com nenhuma. */
export function opportunitiesFor<T extends ComTelefone>(
  conversa: ComTelefone,
  oportunidades: readonly T[]
): T[] {
  return oportunidades.filter(oportunidade => samePhone(oportunidade.contact_phone, conversa.contact_phone))
}

/** Somatorio em centavos das oportunidades abertas do contato — o valor que a conversa representa hoje. */
export function openValueCents<T extends ComTelefone & { stage: string; value_cents: number }>(
  oportunidades: readonly T[]
): number {
  return oportunidades
    .filter(oportunidade => oportunidade.stage !== 'ganho' && oportunidade.stage !== 'perdido')
    .reduce((total, oportunidade) => total + oportunidade.value_cents, 0)
}
