// Emissão fiscal: contrato, sandbox e seleção de provedor (rodada 104).
//
// O que estes testes travam: nenhum caminho produz "autorizada" sem autoridade fiscal, e emitir duas vezes o
// mesmo pedido não gera duas notas.

import { describe, expect, it } from 'vitest'

import {
  PROVEDORES_FISCAIS,
  provedorNaoConfigurado,
  resolverProvedor,
  sandboxProvider,
  variaveisFaltando,
  type PedidoFiscal
} from './fiscal-provider'

const PEDIDO: PedidoFiscal = { kind: 'nfe', payload: { total: 100 }, ref: 'venda:v1', tenant_id: 'local' }

describe('sandbox', () => {
  const provider = sandboxProvider()

  it('emite marcado como homologacao, com chave que nao se confunde com real', async () => {
    const r = await provider.emitir(PEDIDO)

    if ('error' in r) throw new Error(r.error)

    expect(r.resultado.homologacao).toBe(true)
    expect(r.resultado.chave.startsWith('SANDBOX-')).toBe(true)
    expect(r.resultado.status).toBe('autorizado')
    // 44 digitos apos o prefixo: formato da chave de acesso, sem ser uma.
    expect(r.resultado.chave.length).toBe('SANDBOX-'.length + 44)
  })

  it('a mensagem diz que nao tem validade fiscal', async () => {
    const r = await provider.emitir(PEDIDO)

    if ('error' in r) throw new Error(r.error)

    expect(r.resultado.mensagem).toMatch(/homologa/i)
    expect(r.resultado.mensagem).toMatch(/n[aã]o tem validade/i)
  })

  it('devolve url de DANFE: sem ela nao ha como imprimir', async () => {
    const r = await provider.emitir(PEDIDO)

    if ('error' in r) throw new Error(r.error)

    expect(r.resultado.url_danfe).toContain('danfe')
    expect(r.resultado.url_danfe.endsWith('.pdf')).toBe(true)
  })

  it('pedido sem ref e recusado', async () => {
    expect(await provider.emitir({ ...PEDIDO, ref: '' })).toEqual({ error: 'ref_obrigatoria' })
  })

  it('recusa consultar ou cancelar chave de outro provedor', async () => {
    expect(await provider.consultar('12345678901234567890123456789012345678901234')).toEqual({
      error: 'chave_de_outro_provedor'
    })
    expect(await provider.cancelar('12345678901234567890123456789012345678901234', 'erro')).toEqual({
      error: 'chave_de_outro_provedor'
    })
  })

  it('cancelar exige motivo: cancelamento sem motivo e recusado pela SEFAZ', async () => {
    const r = await provider.emitir(PEDIDO)

    if ('error' in r) throw new Error(r.error)

    expect(await provider.cancelar(r.resultado.chave, '  ')).toEqual({ error: 'motivo_obrigatorio' })
  })

  it('cancelar marca o documento como cancelado', async () => {
    const r = await provider.emitir(PEDIDO)

    if ('error' in r) throw new Error(r.error)

    const c = await provider.cancelar(r.resultado.chave, 'cliente desistiu')

    if ('error' in c) throw new Error(c.error)

    expect(c.resultado.status).toBe('cancelado')
  })

  it('a mesma ref gera a mesma chave: emitir duas vezes nao cria duas notas', async () => {
    const a = await provider.emitir(PEDIDO)
    const b = await provider.emitir(PEDIDO)

    if ('error' in a || 'error' in b) throw new Error('falhou')

    expect(a.resultado.chave).toBe(b.resultado.chave)
  })
})

describe('provedor nao configurado', () => {
  it('recusa tudo com nao_configurado, em vez de fingir', async () => {
    const p = provedorNaoConfigurado('focus_nfe', 'Focus NFe')

    expect(p.homologado).toBe(true)
    expect(await p.emitir(PEDIDO)).toEqual({ error: 'nao_configurado' })
    expect(await p.consultar('x')).toEqual({ error: 'nao_configurado' })
    expect(await p.cancelar('x', 'y')).toEqual({ error: 'nao_configurado' })
  })
})

describe('selecao do provedor', () => {
  it('sem FISCAL_PROVEDOR usa o sandbox', () => {
    expect(resolverProvedor({}).id).toBe('sandbox')
  })

  it('provedor desconhecido cai no sandbox, nao inventa', () => {
    expect(resolverProvedor({ FISCAL_PROVEDOR: 'inexistente' }).id).toBe('sandbox')
  })

  it('provedor conhecido sem credencial devolve nao_configurado', async () => {
    const p = resolverProvedor({ FISCAL_PROVEDOR: 'focus_nfe' })

    expect(p.id).toBe('focus_nfe')
    expect(await p.emitir(PEDIDO)).toEqual({ error: 'nao_configurado' })
  })

  it('diz quais variaveis faltam', () => {
    expect(variaveisFaltando({ FISCAL_PROVEDOR: 'focus_nfe' })).toEqual(['FOCUS_NFE_TOKEN', 'FOCUS_NFE_AMBIENTE'])
    expect(variaveisFaltando({ FISCAL_PROVEDOR: 'focus_nfe', FOCUS_NFE_AMBIENTE: 'prod', FOCUS_NFE_TOKEN: 'x' })).toEqual([])
    expect(variaveisFaltando({})).toEqual([])
  })

  it('o catalogo cobre provedores e MCP', () => {
    const ids = PROVEDORES_FISCAIS.map(p => p.id)

    expect(ids).toContain('focus_nfe')
    expect(ids).toContain('mcp_fiscal')
    // O catalogo lista variaveis, nunca valores.
    for (const p of PROVEDORES_FISCAIS) {
      expect(p.variaveis.length).toBeGreaterThan(0)
      expect(p.comoConectar.length).toBeGreaterThan(20)
    }
  })
})
