// O FLUXO: ticket aberto -> contato no CRM (r147 do GOAL V2).
//
// O QUE ESTE TESTE PROVA
//
// A r146 escreveu a DECISAO (`intencaoParaContato`) e a r147 a monta no `erp-ipc`. Este teste atravessa os dois
// stores: abre um ticket e verifica que o contato ganhou `last_ticket_*`.
//
// O QUE ELE PEGOU
//
// O `ticketOpened` recebia so `{ id, tenant_id, number, priority }` - **sem `contact_phone` e sem `opened_at`,
// que o `Ticket` TEM**. O aviso nao carregava o fato. Foi a mesma correcao da r135 no evento da venda.

import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { CrmContactStore, crmStorePath } from './crm-contacts-store'
import { ServiceDeskStore, serviceDeskStorePath } from './service-desk-store'
import { intencaoParaContato, patchDoContatoPorAtendimento } from './service-crm-link'

let dir = ''
let desk: ServiceDeskStore
let crm: CrmContactStore

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'b3po-desk-crm-'))
  await mkdir(join(dir, 'b3po'), { recursive: true })
  desk = new ServiceDeskStore(serviceDeskStorePath(dir))
  crm = new CrmContactStore(crmStorePath(dir))
})

afterEach(async () => {
  await rm(dir, { force: true, recursive: true })
})

const TELEFONE = '+5511999990009'

/** A montagem do `erp-ipc`, reduzida ao que este fluxo exercita (r147). */
async function abrirTicketERegistrar(telefone: string): Promise<void> {
  const r = await desk.open({
    channel: 'telefone',
    contact_phone: telefone,
    description: 'o bujao veio errado',
    priority: 'alta',
    subject: 'pedido errado'
  })

  if ('error' in r) throw new Error(r.error)

  // O `ticketOpened` do `erp-ipc`: o mesmo corpo, com os campos que o resumo passou a carregar.
  const intencao = intencaoParaContato({
    contact_phone: r.ticket.contact_phone,
    opened_at: r.ticket.opened_at,
    tenant_id: r.ticket.tenant_id,
    ticket_id: r.ticket.id
  })

  if (intencao.tipo !== 'registrar') return

  const existente = (await crm.list(r.ticket.tenant_id)).find(c => c.phone === intencao.telefone)

  await crm.upsert(
    {
      ...patchDoContatoPorAtendimento(intencao),
      // r147: o `normalizeContact` preenche com null o que falta, e o merge deixa o null vencer. A ligacao
      // repassa o que o CRM ja sabia — senao o atendimento apagaria a ultima compra.
      last_purchase_at: existente?.last_purchase_at ?? null,
      last_purchase_cents: existente?.last_purchase_cents ?? null,
      last_sale_id: existente?.last_sale_id ?? null,
      name: existente?.name || intencao.nomeSugerido,
      phone: intencao.telefone
    },
    r.ticket.tenant_id
  )
}

describe('o ticket cria o contato no CRM', () => {
  it('quem reclama aparece na ficha de contatos', async () => {
    await abrirTicketERegistrar(TELEFONE)

    const contatos = await crm.list('local')

    expect(contatos).toHaveLength(1)
    expect(contatos[0]?.phone).toBe('5511999990009')
  })

  it('e o contato diz de onde veio — `Cliente do atendimento`', async () => {
    await abrirTicketERegistrar(TELEFONE)

    // O ticket nao tem nome. Um nome inventado pareceria confirmado.
    expect((await crm.list('local'))[0]?.name).toBe('Cliente do atendimento')
  })

  it('o chamado fica registrado', async () => {
    await abrirTicketERegistrar(TELEFONE)

    const c = (await crm.list('local'))[0] as unknown as Record<string, unknown>

    expect(typeof c['last_ticket_at']).toBe('number')
    expect(typeof c['last_ticket_id']).toBe('string')
  })
})

describe('a ficha preserva o que o CRM ja sabia', () => {
  it('o nome confirmado NAO e sobrescrito pelo atendimento', async () => {
    await crm.upsert({ name: 'Maria (vizinho)', phone: '5511999990009' }, 'local')

    await abrirTicketERegistrar(TELEFONE)

    expect((await crm.list('local'))[0]?.name).toBe('Maria (vizinho)')
  })

  it('e a compra anterior CONTINUA la — as duas ligacoes escrevem campos diferentes', async () => {
    // A venda escreve `last_purchase_*` (r134); o atendimento escreve `last_ticket_*` (r147). Nenhuma apaga a
    // outra, porque o `upsert` faz merge e cada uma manda so o seu campo.
    await crm.upsert(
      { last_purchase_at: 1_700_000_000_000, last_purchase_cents: 15000, last_sale_id: 'v1', name: 'Maria', phone: '5511999990009' },
      'local'
    )

    await abrirTicketERegistrar(TELEFONE)

    const c = (await crm.list('local'))[0] as unknown as Record<string, unknown>

    expect(c['last_purchase_cents']).toBe(15000)
    expect(typeof c['last_ticket_at']).toBe('number')
  })

  it('dois chamados do mesmo cliente NAO criam dois contatos', async () => {
    await abrirTicketERegistrar(TELEFONE)
    await abrirTicketERegistrar(TELEFONE)

    expect(await crm.list('local')).toHaveLength(1)
  })
})

describe('ticket sem telefone nao cria contato', () => {
  it('o CRM fica vazio — um contato sem chave ninguem acha', async () => {
    await abrirTicketERegistrar('')

    expect(await crm.list('local')).toHaveLength(0)
  })
})
