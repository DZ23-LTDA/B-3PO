/**
 * Consulta pública de CNPJ e CEP.
 *
 * A ponte fica em `hermesDesktop` (não em `hermes`). O erro da r99 foi exatamente este: escrevi o nome
 * errado, o cast escondeu, e a tela dizia "não disponível" com tudo funcionando.
 */

export interface EmpresaConsultada {
  bairro: string
  cep: string
  cidade: string
  complemento: string
  email: string
  logradouro: string
  municipio: string
  nome_fantasia: string
  numero: string
  razao_social: string
  telefone: string
  uf: string
}

export interface EnderecoConsultado {
  bairro: string
  cep: string
  cidade: string
  complemento: string
  logradouro: string
  uf: string
}

type Ponte = {
  cep?: (cep: unknown) => Promise<unknown>
  cnpj?: (cnpj: unknown) => Promise<unknown>
}

function bridge(): Ponte | undefined {
  return (globalThis as { hermesDesktop?: { lookup?: Ponte } }).hermesDesktop?.lookup
}

export function lookupAvailable(): boolean {
  const b = bridge()

  return Boolean(b?.cnpj && b?.cep)
}

export async function consultarCnpj(cnpj: string): Promise<{ empresa: EmpresaConsultada } | { error: string }> {
  const chamar = bridge()?.cnpj

  if (!chamar) return { error: 'ponte_indisponivel' }

  return (await chamar(cnpj)) as { empresa: EmpresaConsultada } | { error: string }
}

export async function consultarCep(cep: string): Promise<{ endereco: EnderecoConsultado } | { error: string }> {
  const chamar = bridge()?.cep

  if (!chamar) return { error: 'ponte_indisponivel' }

  return (await chamar(cep)) as { endereco: EnderecoConsultado } | { error: string }
}

const MOTIVOS: Record<string, string> = {
  cep_invalido: 'CEP precisa de 8 dígitos.',
  cep_nao_encontrado: 'CEP não encontrado nos Correios.',
  cnpj_invalido: 'CNPJ precisa de 14 dígitos.',
  cnpj_nao_encontrado: 'CNPJ não encontrado na Receita.',
  ponte_indisponivel: 'Esta versão do aplicativo não consulta CNPJ/CEP.'
}

export function lookupErrorText(codigo: string): string {
  return MOTIVOS[codigo] ?? 'Não foi possível consultar agora. Preencha à mão.'
}

/** Uma linha de endereço, para os campos que guardam texto único. */
export function enderecoEmLinha(e: EnderecoConsultado | EmpresaConsultada): string {
  const numero = 'numero' in e ? e.numero : ''
  const rua = [e.logradouro, numero].filter(Boolean).join(', ')
  const resto = [e.bairro, e.cidade, e.uf, e.cep].filter(Boolean).join(' - ')

  return [rua, resto].filter(Boolean).join(' | ')
}
