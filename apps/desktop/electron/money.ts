// Dinheiro em centavos, normalizado uma vez para todos os domínios que cobram ou pagam.
//
// O campo de preço é um input de texto na tela: "1.234,56" (pt-BR) e "1234.56" (API) chegam pelo mesmo
// caminho. Converter cedo para inteiro de centavos evita o erro clássico de float (0.1 + 0.2) e mantém
// o valor exato no disco. Nenhum domínio deve arredondar dinheiro por conta própria.

/** Converte entrada numérica ou textual em centavos inteiros, nunca negativo. */
export function cents(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.round(value))
  }

  const raw = typeof value === 'string' ? value.replace(/\s/g, '') : ''

  if (!raw) {
    return 0
  }

  // "1.234,56": o ponto é separador de milhar, a vírgula é decimal.
  const normalizado = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw
  const parsed = Number.parseFloat(normalizado)

  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed * 100)) : 0
}
