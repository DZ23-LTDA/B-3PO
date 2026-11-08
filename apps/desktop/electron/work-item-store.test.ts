// O store de trabalho pontual (r84 do GOAL V2).
//
// A decisão de projeto: a EXPIRAÇÃO É CALCULADA NA LEITURA, nunca gravada.

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { INSTALLATION_TENANT } from './server-tenant'
import { parseWorkItemStore, WorkItemStore, workItemStorePath } from './work-item-store'

let dir = ''
let store: WorkItemStore

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'b3po-tp-'))
  store = new WorkItemStore(workItemStorePath(dir))
})

afterEach(async () => {
  await rm(dir, { force: true, recursive: true })
})

const PEDIDO = { pedido: 'pesquisar concorrentes', tipo: 'pesquisa' }

describe('o caminho', () => {
  it('grava dentro de b3po/', () => {
    expect(workItemStorePath('/x')).toBe(join('/x', 'b3po', 'trabalhos.json'))
  })

  it('arquivo corrompido vira store vazio', () => {
    expect(parseWorkItemStore('{nao e json')).toEqual({ schema_version: 1, trabalhos: [] })
  })

  it('trabalho SEM expira_em é descartado — seria um projeto disfarçado', () => {
    const cru = JSON.stringify({
      schema_version: 1,
      trabalhos: [
        { id: 'a', pedido: 'x', status: 'pedido', tipo: 'analise' },
        { expira_em: 1, id: 'b', pedido: 'y', status: 'pedido', tipo: 'analise' }
      ]
    })

    expect(parseWorkItemStore(cru).trabalhos.map(t => t.id)).toEqual(['b'])
  })

  it('tipo ou status desconhecido é descartado', () => {
    const cru = JSON.stringify({
      schema_version: 1,
      trabalhos: [
        { expira_em: 1, id: 'a', pedido: 'x', status: 'pedido', tipo: 'poema' },
        { expira_em: 1, id: 'b', pedido: 'y', status: 'inventado', tipo: 'analise' },
        { expira_em: 1, id: 'c', pedido: 'z', status: 'pedido', tipo: 'analise' }
      ]
    })

    expect(parseWorkItemStore(cru).trabalhos.map(t => t.id)).toEqual(['c'])
  })
})

describe('criar', () => {
  it('nasce em pedido, com prazo', async () => {
    const r = await store.criar(PEDIDO)

    expect('trabalho' in r && r.trabalho.status).toBe('pedido')
    expect('trabalho' in r && r.trabalho.expira_em).toBeGreaterThan(Date.now())
  })

  it('pedido vazio recusa', async () => {
    expect(await store.criar({ tipo: 'analise' })).toEqual({ error: 'descricao_obrigatoria' })
  })

  it('tipo inválido recusa', async () => {
    expect(await store.criar({ pedido: 'x', tipo: 'poema' })).toEqual({ error: 'tipo_invalido' })
  })

  it('o trabalho SOBREVIVE a instância nova', async () => {
    await store.criar(PEDIDO)

    const outra = new WorkItemStore(workItemStorePath(dir))
    const [t] = await outra.listar()

    expect(t?.pedido).toBe('pesquisar concorrentes')
  })
})

describe('a expiração é CALCULADA — a decisão do arquivo', () => {
  it('o arquivo guarda `expira_em`, e NUNCA um campo `expirado`', async () => {
    await store.criar(PEDIDO, INSTALLATION_TENANT, 1_000)

    const outra = new WorkItemStore(workItemStorePath(dir))
    const [t] = await outra.listar()

    expect(t).toHaveProperty('expira_em')
    // A ausência do campo é o ponto: um campo gravado exigiria varredura, e um app que não abre há um mês
    // teria dados errados até ela rodar.
    expect(t).not.toHaveProperty('expirado')
  })

  it('abrir hoje mostra o que venceu hoje, sem processo nenhum rodar', async () => {
    // Prazo de 1s, criado em t=1000.
    await store.criar(PEDIDO, INSTALLATION_TENANT, 1_000)

    // Em t=1000+31 dias, o mesmo arquivo produz respostas diferentes — sem regravar.
    const depois = 1_000 + 31 * 24 * 60 * 60 * 1000

    expect(await store.abertos(INSTALLATION_TENANT, depois)).toHaveLength(0)
    expect(await store.vencidos(INSTALLATION_TENANT, depois)).toHaveLength(1)
  })

  it('o arquivo não muda quando o trabalho vence — só a leitura muda', async () => {
    const criado = await store.criar(PEDIDO, INSTALLATION_TENANT, 1_000)
    const id = 'trabalho' in criado ? criado.trabalho.id : ''

    await store.vencidos(INSTALLATION_TENANT, 1_000 + 999_999_999)

    const outra = new WorkItemStore(workItemStorePath(dir))
    const [t] = await outra.listar()

    expect(t?.id).toBe(id)
    expect(t?.status).toBe('pedido')
  })
})

describe('mudar', () => {
  it('entregar exige onde e resumo', async () => {
    const c = await store.criar(PEDIDO)
    const id = 'trabalho' in c ? c.trabalho.id : ''

    expect(await store.mudar({ id, status: 'entregue' })).toEqual({ error: 'entrega_incompleta' })
    expect(await store.mudar({ id, status: 'entregue', entrega: { onde: 'x', resumo: 'y' } })).toMatchObject({
      trabalho: { status: 'entregue' }
    })
  })

  it('descartar não exige entrega', async () => {
    const c = await store.criar(PEDIDO)
    const id = 'trabalho' in c ? c.trabalho.id : ''

    expect(await store.mudar({ id, status: 'descartado' })).toMatchObject({ trabalho: { status: 'descartado' } })
  })

  it('sem id ou status inválido, recusa antes de tocar no arquivo', async () => {
    expect(await store.mudar({ status: 'entregue' })).toEqual({ error: 'trabalho_obrigatorio' })
    expect(await store.mudar({ id: 'x', status: 'inventado' })).toEqual({ error: 'status_invalido' })
  })

  it('id inexistente', async () => {
    expect(await store.mudar({ id: 'nao-existe', status: 'descartado' })).toEqual({ error: 'trabalho_inexistente' })
  })

  it('a entrega sobrevive ao disco', async () => {
    const c = await store.criar(PEDIDO)
    const id = 'trabalho' in c ? c.trabalho.id : ''

    await store.mudar({ id, status: 'entregue', entrega: { onde: 'docs/p.md', resumo: '3 nomes' } })

    const outra = new WorkItemStore(workItemStorePath(dir))

    expect((await outra.listar())[0]?.entrega?.onde).toBe('docs/p.md')
  })
})

describe('descartarVencidos — e por que NÃO roda sozinho', () => {
  it('marca os vencidos como descartados e devolve QUANTOS', async () => {
    await store.criar({ pedido: 'a', tipo: 'analise' }, INSTALLATION_TENANT, 1_000)
    await store.criar({ pedido: 'b', tipo: 'analise' }, INSTALLATION_TENANT, 1_000)

    const depois = 1_000 + 31 * 24 * 60 * 60 * 1000
    const r = await store.descartarVencidos(INSTALLATION_TENANT, depois)

    expect(r.descartados).toBe(2)
    expect(r.trabalhos.every(t => t.status === 'descartado')).toBe(true)
  })

  it('NÃO REMOVE a linha — o registro de que existiu fica', async () => {
    // Remover apagaria a única coisa que um trabalho pontual deixa.
    await store.criar({ pedido: 'a', tipo: 'analise' }, INSTALLATION_TENANT, 1_000)

    const depois = 1_000 + 31 * 24 * 60 * 60 * 1000

    await store.descartarVencidos(INSTALLATION_TENANT, depois)

    expect((await store.listar()).length).toBe(1)
  })

  it('sem vencidos devolve 0 e não mexe em nada', async () => {
    await store.criar(PEDIDO)

    expect(await store.descartarVencidos(INSTALLATION_TENANT)).toMatchObject({ descartados: 0 })
  })

  it('a leitura não limpa sozinha — abrir o app não apaga nada', async () => {
    await store.criar({ pedido: 'a', tipo: 'analise' }, INSTALLATION_TENANT, 1_000)

    const depois = 1_000 + 999_999_999

    await store.abertos(INSTALLATION_TENANT, depois)
    await store.vencidos(INSTALLATION_TENANT, depois)

    const outra = new WorkItemStore(workItemStorePath(dir))

    expect((await outra.listar())[0]?.status).toBe('pedido')
  })
})

describe('resumo', () => {
  it('diz o que está em aberto e o que venceu', async () => {
    await store.criar({ pedido: 'a', tipo: 'analise' }, INSTALLATION_TENANT, 1_000)

    const s = await store.resumo(INSTALLATION_TENANT, 1_000 + 31 * 24 * 60 * 60 * 1000)

    expect(s).toContain('vencido')
  })
})
