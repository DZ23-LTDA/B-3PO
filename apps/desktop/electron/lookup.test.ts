// Consulta de CNPJ e CEP (rodada 103).
//
// Sem rede nestes testes: o `fetcher` é injetado. Um teste que bate na BrasilAPI de verdade falha quando a
// internet cai e passa quando o serviço muda de forma — os dois casos ensinam nada sobre o nosso código.

import { describe, expect, it, vi } from 'vitest'

import { apenasDigitos, cepConsultavel, cnpjConsultavel, consultarCep, consultarCnpj, enderecoEmLinha } from './lookup'
import type { Fetcher } from './lookup'

function resposta(dados: unknown, ok = true, status = 200) {
  return { json: async () => dados, ok, status }
}

describe('validacao', () => {
  it('CNPJ precisa de 14 digitos e nao ser todos iguais', () => {
    expect(cnpjConsultavel('11.222.333/0001-44')).toBe(true)
    expect(cnpjConsultavel('1122233300014')).toBe(false)
    expect(cnpjConsultavel('11111111111111')).toBe(false)
    expect(cnpjConsultavel(null)).toBe(false)
  })

  it('CEP precisa de 8 digitos', () => {
    expect(cepConsultavel('01310-100')).toBe(true)
    expect(cepConsultavel('0131010')).toBe(false)
  })

  it('apenasDigitos remove mascara', () => {
    expect(apenasDigitos('11.222.333/0001-44')).toBe('11222333000144')
    expect(apenasDigitos(42)).toBe('')
  })
})

describe('CNPJ', () => {
  const DADOS = {
    bairro: 'Bela Vista',
    cep: '01310100',
    ddd_telefone_1: '1133334444',
    email: 'contato@exemplo.com',
    logradouro: 'Avenida Paulista',
    municipio: 'Sao Paulo',
    nome_fantasia: 'Exemplo',
    numero: '1000',
    razao_social: 'EXEMPLO LTDA',
    uf: 'SP'
  }

  it('preenche razao social, fantasia e endereco', async () => {
    const r = await consultarCnpj('11222333000144', vi.fn(async () => resposta(DADOS)) as Fetcher)

    if ('error' in r) throw new Error(r.error)

    expect(r.empresa.razao_social).toBe('EXEMPLO LTDA')
    expect(r.empresa.nome_fantasia).toBe('Exemplo')
    expect(r.empresa.logradouro).toBe('Avenida Paulista')
    expect(r.empresa.cidade).toBe('Sao Paulo')
    expect(r.empresa.telefone).toBe('1133334444')
  })

  it('consulta a URL da BrasilAPI com o CNPJ sem mascara', async () => {
    const fetcher = vi.fn(async (_url: string) => resposta(DADOS))

    await consultarCnpj('11.222.333/0001-44', fetcher as Fetcher)

    expect(fetcher.mock.calls[0]![0]).toBe('https://brasilapi.com.br/api/cnpj/v1/11222333000144')
  })

  it('CNPJ invalido nem chama a rede', async () => {
    const fetcher = vi.fn(async (_url: string) => resposta({}))

    const r = await consultarCnpj('123', fetcher as Fetcher)

    expect(r).toEqual({ error: 'cnpj_invalido' })
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('404 da API vira cnpj_nao_encontrado, nao excecao', async () => {
    const r = await consultarCnpj('11222333000144', vi.fn(async () => resposta({}, false, 404)) as Fetcher)

    expect(r).toEqual({ error: 'cnpj_nao_encontrado' })
  })

  it('rede fora vira erro tratado, nao excecao', async () => {
    const r = await consultarCnpj(
      '11222333000144',
      vi.fn(async () => {
        throw new Error('ENOTFOUND')
      }) as unknown as Fetcher
    )

    expect(r).toEqual({ error: 'cnpj_nao_encontrado' })
  })
})

describe('CEP', () => {
  it('usa a BrasilAPI quando ela responde', async () => {
    const fetcher = vi.fn(async () =>
      resposta({ city: 'Sao Paulo', neighborhood: 'Bela Vista', state: 'SP', street: 'Avenida Paulista' })
    )

    const r = await consultarCep('01310-100', fetcher as Fetcher)

    if ('error' in r) throw new Error(r.error)

    expect(r.endereco.logradouro).toBe('Avenida Paulista')
    expect(r.endereco.cidade).toBe('Sao Paulo')
    expect(r.endereco.cep).toBe('01310100')
  })

  it('cai para o ViaCEP quando a BrasilAPI nao devolve rua', async () => {
    // Primeira chamada: objeto sem `street` (BrasilAPI sem dado). Segunda: ViaCEP.
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(resposta({ city: 'X' }))
      .mockResolvedValueOnce(resposta({ bairro: 'Centro', localidade: 'Rio', logradouro: 'Rua A', uf: 'RJ' }))

    const r = await consultarCep('20040020', fetcher as Fetcher)

    if ('error' in r) throw new Error(r.error)

    expect(r.endereco.logradouro).toBe('Rua A')
    expect(r.endereco.cidade).toBe('Rio')
    expect(fetcher.mock.calls[1]![0]).toContain('viacep.com.br')
  })

  it('ViaCEP respondendo { erro: true } vira cep_nao_encontrado', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(resposta({}, false, 500))
      .mockResolvedValueOnce(resposta({ erro: true }))

    expect(await consultarCep('99999999', fetcher as Fetcher)).toEqual({ error: 'cep_nao_encontrado' })
  })

  it('CEP invalido nem chama a rede', async () => {
    const fetcher = vi.fn()

    expect(await consultarCep('123', fetcher as Fetcher)).toEqual({ error: 'cep_invalido' })
    expect(fetcher).not.toHaveBeenCalled()
  })
})

describe('enderecoEmLinha', () => {
  it('monta uma linha legivel a partir das partes', () => {
    const linha = enderecoEmLinha({
      bairro: 'Bela Vista',
      cep: '01310100',
      cidade: 'Sao Paulo',
      complemento: '',
      logradouro: 'Avenida Paulista',
      uf: 'SP'
    })

    expect(linha).toBe('Avenida Paulista | Bela Vista - Sao Paulo - SP - 01310100')
  })

  it('nao deixa separador solto quando falta parte', () => {
    const linha = enderecoEmLinha({ bairro: '', cep: '', cidade: 'Sao Paulo', complemento: '', logradouro: 'Rua A', uf: 'SP' })

    expect(linha).toBe('Rua A | Sao Paulo - SP')
  })
})
