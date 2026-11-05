// O FLUXO: venda faturada -> contato no CRM (r134 do GOAL V2).
//
// O QUE ESTE TESTE PROVA
//
// A r133 escreveu a DECISAO (`intencaoParaCrm`) e a r134 a monta sobre o `CrmContactsStore` REAL. Este teste
// atravessa os dois: uma venda faturada, o contato no CRM, e a segunda compra do mesmo cliente.
//
// O QUE ELE PEGOU - e por isso ele existe
//
// `normalizeContact` exige `name` e o `upsert` faz MERGE. Se a venda mandasse `name` vazio, ela APAGARIA o nome
// que o CRM tinha. A funcao `inputDoContato` resolve isso: o nome existente vence, e um contato novo recebe um
// nome DERIVADO que diz de onde veio.

import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { CrmContactStore, crmStorePath } from './crm-contacts-store'
import { inputDoContato, intencaoParaCrm } from './sales-crm-link'

let dir = ''
let crm: CrmContactStore

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'b3po-vendacrm-'))
  await mkdir(join(dir, 'b3po'), { recursive: true })
  crm = new CrmContactStore(crmStorePath(dir))
})

afterEach(async () => {
  await rm(dir, { force: true, recursive: true })
})

const VENDA = { contact_phone: '+5511999990009', sale_id: 'v1', tenant_id: 'local', total_cents: 15000 }

/** Aplica a decisao da r133 ao store real - a montagem que a r134 faz no `erp-ipc`. */
async function registrarVenda(evento: typeof VENDA, quando: number) {
  const intencao = intencaoParaCrm(evento, quando)

  if (intencao.tipo !== 'registrar') return intencao

  const existente = (await crm.list('local')).find(c => c.phone === intencao.telefone)

  return crm.upsert(inputDoContato(intencao, existente), 'local')
}

describe('a primeira venda cria o contato', () => {
  it('o cliente que compra aparece no CRM', async () => {
    await registrarVenda(VENDA, 1_700_000_000_000)

    const contatos = await crm.list('local')

    expect(contatos).toHaveLength(1)
    expect(contatos[0]?.phone).toBe('5511999990009')
  })

  it('e o contato diz de onde veio — `Cliente da venda 0009`, nao um nome inventado', async () => {
    await registrarVenda(VENDA, 1)

    const c = (await crm.list('local'))[0]

    // Um nome inventado seria pior: alguem o tomaria por confirmado.
    expect(c?.name).toBe('Cliente da venda 0009')
  })

  it('a compra fica registrada no contato', async () => {
    await registrarVenda(VENDA, 1_700_000_000_000)

    const c = (await crm.list('local'))[0] as unknown as Record<string, unknown>

    expect(c['last_purchase_at']).toBe(1_700_000_000_000)
    expect(c['last_purchase_cents']).toBe(15000)
    expect(c['last_sale_id']).toBe('v1')
  })
})

describe('a segunda venda ATUALIZA e NAO sobrescreve o nome', () => {
  it('o CRM tinha "Maria (vizinho)" e a venda nao reescreve', async () => {
    // O caso real: o operador do caixa digita as pressas; o CRM tem o nome que alguem confirmou.
    await crm.upsert({ name: 'Maria (vizinho)', phone: '5511999990009' }, 'local')

    await registrarVenda(VENDA, 1_700_000_000_000)

    const c = (await crm.list('local'))[0]

    expect(c?.name).toBe('Maria (vizinho)')
  })

  it('e mesmo assim registra a compra', async () => {
    await crm.upsert({ name: 'Maria (vizinho)', phone: '5511999990009' }, 'local')
    await registrarVenda(VENDA, 1_700_000_000_000)

    const c = (await crm.list('local'))[0] as unknown as Record<string, unknown>

    expect(c['last_purchase_cents']).toBe(15000)
  })

  it('duas compras do mesmo cliente NAO criam dois contatos', async () => {
    await registrarVenda(VENDA, 1_000)
    await registrarVenda({ ...VENDA, sale_id: 'v2', total_cents: 20000 }, 2_000)

    const contatos = await crm.list('local')

    expect(contatos).toHaveLength(1)
  })
})

describe('venda sem telefone nao cria nada', () => {
  it('o CRM fica vazio — um contato sem chave ninguem acha', async () => {
    const r = await registrarVenda({ ...VENDA, contact_phone: null as never }, 1)

    expect(r).toMatchObject({ motivo: 'sem_telefone', tipo: 'nada' })
    expect(await crm.list('local')).toHaveLength(0)
  })
})
