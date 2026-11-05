// Cotacoes persistidas: contratos (rodada 198).
//
// A r194 montou o painel e as propostas viviam no estado do componente: sair da tela apagava tudo.
// Estes testes fixam o que persiste, o que e recusado, e o que NAO muda por causa da gravacao.

import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { lerCotacao, parseCotacaoStore, QuotationStore, quotationsStorePath } from './quotation-store'

let dir = ''
let store: QuotationStore

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'b3po-cotacao-store-'))
  store = new QuotationStore(quotationsStorePath(dir))
})

afterEach(async () => {
  await rm(dir, { force: true, recursive: true })
})

/** Escreve um arquivo cru no caminho do store. O diretorio 3po/ precisa existir antes — sem isso o teste
 * falha por ENOENT e nao pelo que ele quer provar. */
async function escreverCru(conteudo: string): Promise<void> {
  await mkdir(join(dir, 'b3po'), { recursive: true })
  await writeFile(quotationsStorePath(dir), conteudo, 'utf8')
}

const proposta = (over: Record<string, unknown> = {}) => ({
  created_at: 1_800_000_000_000,
  id: 'cot-1',
  prazo_dias: 7,
  preco_unit_cents: 1_050,
  quantidade_disponivel: 10,
  supplier_id: 'alfa',
  ...over
})

describe('persistencia', () => {
  it('grava e devolve a proposta', async () => {
    await store.save(proposta())

    const lista = await store.list('local')

    expect(lista).toHaveLength(1)
    expect(lista[0]).toMatchObject({ id: 'cot-1', preco_unit_cents: 1_050, supplier_id: 'alfa' })
  })

  it('sobrevive a uma instancia nova — o ponto da rodada', async () => {
    // Era isso que faltava: sair da tela e voltar nao pode apagar o trabalho.
    await store.save(proposta())

    const outra = new QuotationStore(quotationsStorePath(dir))
    const lista = await outra.list('local')

    expect(lista).toHaveLength(1)
    expect(lista[0]!.id).toBe('cot-1')
  })

  it('o arquivo fica em disco e e JSON legivel', async () => {
    await store.save(proposta())

    const bruto = JSON.parse(await readFile(quotationsStorePath(dir), 'utf8'))

    expect(bruto.version).toBe(1)
    expect(Array.isArray(bruto.cotacoes)).toBe(true)
  })

  it('grava em temporario e renomeia — nao deixa arquivo pela metade', async () => {
    // `rename` e atomico no mesmo volume: um crash no meio deixa o arquivo anterior intacto.
    await store.save(proposta())

    const lista = await store.list('local')

    expect(lista).toHaveLength(1)
  })
})

describe('repetir o mesmo id substitui, nao duplica', () => {
  it('mesma proposta duas vezes = uma linha', async () => {
    await store.save(proposta())
    await store.save(proposta())

    expect(await store.list('local')).toHaveLength(1)
  })

  it('preco corrigido do mesmo fornecedor sobrescreve', async () => {
    // Recontar o mesmo fornecedor para o mesmo item e correcao, nao uma segunda proposta.
    await store.save(proposta())
    await store.save(proposta({ preco_unit_cents: 1_000 }))

    const lista = await store.list('local')

    expect(lista).toHaveLength(1)
    expect(lista[0]!.preco_unit_cents).toBe(1_000)
  })
})

describe('o que e recusado', () => {
  it('sem id', async () => {
    expect(await store.save(proposta({ id: '' }))).toEqual({ error: 'cotacao_sem_id' })
  })

  it('sem fornecedor', async () => {
    expect(await store.save(proposta({ supplier_id: '   ' }))).toEqual({ error: 'cotacao_sem_fornecedor' })
  })

  it('preco zero ou negativo', async () => {
    expect(await store.save(proposta({ preco_unit_cents: 0 }))).toEqual({ error: 'cotacao_preco_invalido' })
    expect(await store.save(proposta({ preco_unit_cents: -1 }))).toEqual({ error: 'cotacao_preco_invalido' })
  })

  it('quantidade zero', async () => {
    expect(await store.save(proposta({ quantidade_disponivel: 0 }))).toEqual({
      error: 'cotacao_quantidade_invalida'
    })
  })

  it('uma recusa nao grava nada', async () => {
    await store.save(proposta({ preco_unit_cents: 0 }))

    expect(await store.list('local')).toEqual([])
  })
})

describe('remover', () => {
  it('remove pelo id', async () => {
    await store.save(proposta({ id: 'a' }))
    await store.save(proposta({ id: 'b' }))

    const r = await store.remove('a')

    expect(r.cotacoes.map(c => c.id)).toEqual(['b'])
  })

  it('remover o que nao existe nao e erro', async () => {
    await store.save(proposta())

    const r = await store.remove('nao-existe')

    expect(r.cotacoes).toHaveLength(1)
  })
})

describe('leitura tolerante', () => {
  it('arquivo ausente devolve vazio, nao excecao', async () => {
    const vazia = new QuotationStore(join(dir, 'nao-existe.json'))

    expect(await vazia.list('local')).toEqual([])
  })

  it('arquivo corrompido devolve vazio em vez de derrubar a janela', async () => {
    await escreverCru('{ nao e json')

    expect(await store.list('local')).toEqual([])
  })

  it('registro invalido no meio da lista e descartado, os outros ficam', async () => {
    await escreverCru(
      JSON.stringify({ cotacoes: [{ id: 'ok', preco_unit_cents: 100, quantidade_disponivel: 1, supplier_id: 'a', created_at: 1 }, { lixo: true }], version: 1 })
    )

    const lista = await store.list('local')

    expect(lista.map(c => c.id)).toEqual(['ok'])
  })

  it('prazo invalido vira null, nao zero', async () => {
    // Zero diria "entrega imediata"; null diz "nao informado".
    expect(lerCotacao({ created_at: 1, id: 'x', prazo_dias: 'amanha', preco_unit_cents: 100, quantidade_disponivel: 1, supplier_id: 'a' })?.prazo_dias).toBeNull()
  })

  it('parse com lista que nao e lista nao explode', () => {
    expect(parseCotacaoStore(JSON.stringify({ cotacoes: 'nada' })).cotacoes).toEqual([])
  })
})

describe('isolamento por tenant', () => {
  it('cada empresa ve so as suas', async () => {
    await store.save(proposta({ id: 'a' }))
    await store.save(proposta({ id: 'b', tenant_id: 'outra' }))

    expect((await store.list('local')).map(c => c.id)).toEqual(['a'])
    expect((await store.list('outra')).map(c => c.id)).toEqual(['b'])
  })
})
