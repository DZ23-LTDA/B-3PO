import { describe, expect, it } from 'vitest'

import { contactsToCsv, csvFileName } from './crm-csv'

const contato = (over: Partial<{ company: string; email: string; name: string; phone: string; tags: string[] }> = {}) => ({
  company: 'DZ23',
  email: 'a@b.co',
  name: 'Maria',
  phone: '+5511999991111',
  tags: [],
  ...over
})

describe('exportação de contatos em CSV', () => {
  it('começa com BOM e cabeçalho em pt-BR separado por ponto e vírgula', () => {
    const csv = contactsToCsv([contato()])

    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv.split('\r\n')[0]).toBe('\uFEFFnome;telefone;email;empresa;etiquetas')
  })

  it('escreve uma linha por contato, na ordem em que recebeu', () => {
    const csv = contactsToCsv([contato({ name: 'Maria' }), contato({ name: 'João', phone: '+5511888882222' })])
    const linhas = csv.trimEnd().split('\r\n')

    expect(linhas).toHaveLength(3)
    expect(linhas[1]).toBe('Maria;+5511999991111;a@b.co;DZ23;')
    expect(linhas[2]).toBe('João;+5511888882222;a@b.co;DZ23;')
  })

  it('protege campo com ponto e vírgula, aspas ou quebra de linha', () => {
    const csv = contactsToCsv([contato({ company: 'Silva; Filhos', name: 'Ana "Tia"', tags: ['vip'] })])
    const linha = csv.trimEnd().split('\r\n')[1]!

    expect(linha).toBe('"Ana ""Tia""";+5511999991111;a@b.co;"Silva; Filhos";vip')
  })

  it('não deixa um campo virar fórmula', () => {
    expect(contactsToCsv([contato({ name: '=1+1' })]).split('\r\n')[1]).toContain("'=1+1")
    expect(contactsToCsv([contato({ company: '@cmd' })]).split('\r\n')[1]).toContain("'@cmd")
  })

  it('junta etiquetas por vírgula dentro de um campo', () => {
    expect(contactsToCsv([contato({ tags: ['vip', 'lead'] })]).split('\r\n')[1]).toContain('vip, lead')
  })

  it('o nome do arquivo carrega a data local', () => {
    expect(csvFileName(new Date(2026, 10, 3))).toBe('b3po-contatos-2026-11-03.csv')
  })
})
