/**
 * Exportação de contatos em CSV (§14.2 "exportação", LGPD).
 *
 * Puro de propósito: recebe os contatos e devolve o texto. Quem grava/baixa é a tela. Regras que importam
 * para o arquivo abrir certo no Excel em pt-BR:
 *
 * - separador `;` (o Excel pt-BR usa vírgula como decimal);
 * - BOM UTF-8, senão acento vira caractere estranho;
 * - campo entre aspas com aspas duplicadas quando tem `;`, aspas ou quebra de linha;
 * - telefone como texto (sem `+` interpretado como fórmula) e sem escapar dígitos.
 */

export interface CsvContact {
  company: string
  email: string
  name: string
  phone: string
  tags: string[]
}

export const CSV_HEADER = ['nome', 'telefone', 'email', 'empresa', 'etiquetas'] as const

/**
 * Telefone internacional começa com `+` e NÃO é fórmula: prefixar todo `+` com apóstrofo corromperia o dado
 * (e um importador veria `'`). Só escapa quando o `+` não é seguido de dígito — o resto (`=`, `@`, `-`) escapa
 * sempre, que é o vetor de injeção de fórmula.
 */
const PHONE_LIKE = /^\+\d[\d\s()\-]*$/

function cell(value: string): string {
  const texto = value ?? ''
  const pareceTelefone = PHONE_LIKE.test(texto)
  const seguro = !pareceTelefone && /^[=+\-@]/.test(texto) ? `'${texto}` : texto

  return /[;"\n\r]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro
}

export function contactsToCsv(contacts: readonly CsvContact[]): string {
  const linhas = [CSV_HEADER.join(';')]

  for (const contact of contacts) {
    linhas.push(
      [contact.name, contact.phone, contact.email, contact.company, (contact.tags ?? []).join(', ')]
        .map(cell)
        .join(';')
    )
  }

  return `\uFEFF${linhas.join('\r\n')}\r\n`
}

export function csvFileName(now: Date): string {
  const dia = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  return `b3po-contatos-${dia}.csv`
}
