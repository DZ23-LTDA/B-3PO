// Documento fiscal persistido (rodada 104).
//
// O que estes testes travam: emitir duas vezes não emite duas notas, a homologação é um campo do registro, e
// um provedor que falha deixa o documento como rejeitado — não some.

import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { sandboxProvider, type FiscalProvider, type PedidoFiscal } from './fiscal-provider'
import { FiscalStore, fiscalStorePath } from './fiscal-store'

let dir = ''

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'b3po-fiscal-'))
  await mkdir(join(dir, 'b3po'), { recursive: true })
})

afterEach(async () => {
  await rm(dir, { force: true, recursive: true })
})

const PEDIDO: PedidoFiscal = { kind: 'nfe', payload: {}, ref: 'venda:v1', tenant_id: 'local' }
const MOTIVO = 'cliente desistiu da compra'

function store() {
  return new FiscalStore(fiscalStorePath(dir))
}

/** Provedor que sempre recusa: simula credencial ausente. */
function provedorQueFalha(): FiscalProvider {
  const recusa = async () => ({ error: 'nao_configurado' })

  return { cancelar: recusa, consultar: recusa, emitir: recusa, homologado: true, id: 'x', nome: 'X' }
}

describe('emitir', () => {
  it('grava o documento autorizado com chave, numero e url do DANFE', async () => {
    const s = store()
    const r = await s.emitir(sandboxProvider(), PEDIDO)

    if ('error' in r) throw new Error(r.error)

    expect(r.existing).toBe(false)
    expect(r.record.status).toBe('autorizado')
    expect(r.record.chave.startsWith('SANDBOX-')).toBe(true)
    expect(r.record.url_danfe).toContain('.pdf')

    // E existe no arquivo, não só no retorno.
    expect((await s.list())[0]!.chave).toBe(r.record.chave)
  })

  it('marca homologacao no registro: a tela sabe que nao e nota real', async () => {
    const r = await store().emitir(sandboxProvider(), PEDIDO)

    if ('error' in r) throw new Error(r.error)

    expect(r.record.homologacao).toBe(true)
    expect(r.record.mensagem).toMatch(/homologa/i)
  })

  it('emitir duas vezes devolve o existente e NAO cria segundo registro', async () => {
    const s = store()

    const a = await s.emitir(sandboxProvider(), PEDIDO)
    const b = await s.emitir(sandboxProvider(), PEDIDO)

    if ('error' in a || 'error' in b) throw new Error('falhou')

    expect(b.existing).toBe(true)
    expect(b.record.id).toBe(a.record.id)
    expect(await s.list()).toHaveLength(1)
  })

  it('provedor que recusa deixa o documento como rejeitado, nao apaga', async () => {
    const s = store()
    const r = await s.emitir(provedorQueFalha(), PEDIDO)

    expect(r).toEqual({ error: 'nao_configurado' })

    const lista = await s.list()

    expect(lista).toHaveLength(1)
    expect(lista[0]!.status).toBe('rejeitado')
    expect(lista[0]!.mensagem).toBe('nao_configurado')
  })

  it('refaturar depois de rejeitado NAO emite de novo: a ref continua sendo a chave', async () => {
    // Comportamento deliberado: reemitir exigiria uma decisão (limpar o registro), não um retry silencioso
    // que poderia gerar duas notas para a mesma venda.
    const s = store()

    await s.emitir(provedorQueFalha(), PEDIDO)
    const segunda = await s.emitir(sandboxProvider(), PEDIDO)

    if ('error' in segunda) throw new Error(segunda.error)

    expect(segunda.existing).toBe(true)
    expect(segunda.record.status).toBe('rejeitado')
  })

  it('documentos de tenants diferentes nao se misturam', async () => {
    const s = store()

    await s.emitir(sandboxProvider(), { ...PEDIDO, ref: 'venda:a', tenant_id: 'local' })
    await s.emitir(sandboxProvider(), { ...PEDIDO, ref: 'venda:b', tenant_id: 'outra' })

    expect(await s.list('local')).toHaveLength(1)
    expect(await s.list('outra')).toHaveLength(1)
  })

  it('o arquivo e criado no diretorio b3po', async () => {
    await store().emitir(sandboxProvider(), PEDIDO)

    expect(fiscalStorePath(dir)).toContain(join('b3po', 'fiscal.json'))
  })
})

describe('cancelar', () => {
  it('cancela documento autorizado', async () => {
    const s = store()

    await s.emitir(sandboxProvider(), PEDIDO)
    const r = await s.cancelar(sandboxProvider(), 'venda:v1', 'cliente desistiu')

    if ('error' in r) throw new Error(r.error)

    expect(r.record.status).toBe('cancelado')
    expect((await s.list())[0]!.status).toBe('cancelado')
  })

  it('recusa cancelar ref inexistente', async () => {
    // Motivo valido de proposito: o que se testa aqui e a ref inexistente, nao a justificativa.
    expect(await store().cancelar(sandboxProvider(), 'venda:nada', MOTIVO)).toEqual({ error: 'documento_nao_encontrado' })
  })

  it('recusa cancelar documento rejeitado: nao ha o que cancelar sem autorizacao', async () => {
    const s = store()

    await s.emitir(provedorQueFalha(), PEDIDO)

    expect(await s.cancelar(sandboxProvider(), 'venda:v1', MOTIVO)).toEqual({ error: 'documento_nao_autorizado' })
  })
})
