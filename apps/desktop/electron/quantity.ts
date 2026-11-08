// Quantidade em milésimos, normalizada uma vez para estoque e vendas.
//
// Mesma razão do dinheiro em centavos: 1,5 kg e 0,333 L chegam como texto e não podem virar float no
// disco, senão somas de entrada e saída divergem do saldo. Guardar milésimos inteiros mantém a conta
// exata e cobre grama e mililitro sem unidade especial.

/** Converte entrada numérica ou textual em milésimos inteiros. Aceita sinal (ajuste negativo). */
export function milli(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.round(value * 1000)
  }

  const raw = typeof value === 'string' ? value.replace(/\s/g, '') : ''

  if (!raw) {
    return 0
  }

  const normalizado = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw
  const parsed = Number.parseFloat(normalizado)

  return Number.isFinite(parsed) ? Math.round(parsed * 1000) : 0
}

/** Milésimos para texto legível, sem zeros à direita: 1500 → "1,5"; 2000 → "2". */
export function formatQuantity(value: number): string {
  const inteiro = Math.trunc(value / 1000)
  const resto = Math.abs(value % 1000)

  if (resto === 0) {
    return String(inteiro)
  }

  return `${inteiro},${String(resto).padStart(3, '0').replace(/0+$/, '')}`
}
