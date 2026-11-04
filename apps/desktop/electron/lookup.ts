// Consulta pública de CNPJ e CEP (rodada 103).
//
// POR QUE NO PROCESSO PRINCIPAL
//
// O renderer está sob CSP e não fala com a internet: um `fetch` de lá seria bloqueado. Aqui é Node, e a
// requisição sai pelo processo que já tem acesso à rede.
//
// POR QUE BRASILAPI E VIACEP
//
// Nenhuma das duas exige chave, e o dado é público por lei. BrasilAPI cobre CNPJ (dados da Receita) e CEP;
// ViaCEP é o fallback de CEP quando a primeira falha — ter dois endereços para o mesmo dado público evita
// que uma indisponibilidade impeça o cadastro.
//
// O QUE ESTE MÓDULO NÃO FAZ
//
// Não grava nada. Devolve dados para a tela preencher; quem salva é o store, com a validação dele. Assim
// uma resposta errada da API nunca vira registro — o operador vê e confirma.

export interface LookupCnpj {
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

export interface LookupCep {
  bairro: string
  cep: string
  cidade: string
  complemento: string
  logradouro: string
  uf: string
}

export type Fetcher = (url: string, init?: { signal?: AbortSignal }) => Promise<{ json: () => Promise<unknown>; ok: boolean; status: number }>

const PRAZO_MS = 6000

export function apenasDigitos(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\D/g, '') : ''
}

/** CNPJ válido para consulta: 14 dígitos e não todos iguais (o gerador de teste não existe na Receita). */
export function cnpjConsultavel(value: unknown): boolean {
  const d = apenasDigitos(value)

  return d.length === 14 && !/^(\d)\1{13}$/.test(d)
}

export function cepConsultavel(value: unknown): boolean {
  return apenasDigitos(value).length === 8
}

function texto(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

async function buscar(fetcher: Fetcher, url: string): Promise<Record<string, unknown> | null> {
  try {
    const resposta = await fetcher(url, { signal: AbortSignal.timeout(PRAZO_MS) })

    if (!resposta.ok) return null

    const dados = await resposta.json()

    return dados && typeof dados === 'object' ? (dados as Record<string, unknown>) : null
  } catch {
    // Rede fora, prazo estourado ou JSON inválido: todos caem no mesmo lugar — "não consegui agora".
    return null
  }
}

/** Dados da Receita via BrasilAPI. `error` quando o CNPJ não existe ou o serviço não respondeu. */
export async function consultarCnpj(
  cnpjBruto: unknown,
  fetcher: Fetcher = fetch as unknown as Fetcher
): Promise<{ error: string } | { empresa: LookupCnpj }> {
  if (!cnpjConsultavel(cnpjBruto)) return { error: 'cnpj_invalido' }

  const dados = await buscar(fetcher, `https://brasilapi.com.br/api/cnpj/v1/${apenasDigitos(cnpjBruto)}`)

  if (!dados) return { error: 'cnpj_nao_encontrado' }

  return {
    empresa: {
      bairro: texto(dados['bairro']),
      cep: apenasDigitos(dados['cep']),
      cidade: texto(dados['municipio']),
      complemento: texto(dados['complemento']),
      email: texto(dados['email']),
      logradouro: texto(dados['logradouro']),
      municipio: texto(dados['municipio']),
      nome_fantasia: texto(dados['nome_fantasia']),
      numero: texto(dados['numero']),
      razao_social: texto(dados['razao_social']),
      telefone: apenasDigitos(dados['ddd_telefone_1']),
      uf: texto(dados['uf'])
    }
  }
}

/**
 * Endereço a partir do CEP: BrasilAPI primeiro, ViaCEP como reserva.
 *
 * O fallback existe porque os dois são gratuitos e públicos; se um cai, o operador ainda consegue
 * cadastrar. Não é redundância decorativa — é o que impede uma indisponibilidade de virar bloqueio.
 */
export async function consultarCep(
  cepBruto: unknown,
  fetcher: Fetcher = fetch as unknown as Fetcher
): Promise<{ error: string } | { endereco: LookupCep }> {
  if (!cepConsultavel(cepBruto)) return { error: 'cep_invalido' }

  const cep = apenasDigitos(cepBruto)
  const brasil = await buscar(fetcher, `https://brasilapi.com.br/api/cep/v1/${cep}`)

  if (brasil && texto(brasil['street'])) {
    return {
      endereco: {
        bairro: texto(brasil['neighborhood']),
        cep,
        cidade: texto(brasil['city']),
        complemento: texto(brasil['complement']),
        logradouro: texto(brasil['street']),
        uf: texto(brasil['state'])
      }
    }
  }

  const via = await buscar(fetcher, `https://viacep.com.br/ws/${cep}/json/`)

  // ViaCEP responde 200 com `{ erro: true }` para CEP inexistente — não é falha de rede, é "não existe".
  if (!via || via['erro'] === true) return { error: 'cep_nao_encontrado' }

  return {
    endereco: {
      bairro: texto(via['bairro']),
      cep,
      cidade: texto(via['localidade']),
      complemento: texto(via['complemento']),
      logradouro: texto(via['logradouro']),
      uf: texto(via['uf'])
    }
  }
}

/** Uma linha de endereço a partir das partes, para os campos que guardam texto único (`Branch.address`). */
export function enderecoEmLinha(e: LookupCep | LookupCnpj): string {
  const numero = 'numero' in e ? e.numero : ''
  const rua = [e.logradouro, numero].filter(Boolean).join(', ')
  const resto = [e.bairro, e.cidade, e.uf, e.cep].filter(Boolean).join(' - ')

  return [rua, resto].filter(Boolean).join(' | ')
}
