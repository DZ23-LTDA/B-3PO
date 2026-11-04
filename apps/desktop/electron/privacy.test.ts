// Direitos do titular: o que existe sobre um telefone (rodada 91).
//
// A LGPD dá dois direitos distintos (art. 18): Acesso (I) e Eliminação (VI). O primeiro é somente
// leitura; o segundo é destrutivo e o GOAL exige autorização específica para exclusão de dados.
//
// Este arquivo prova o Acesso. A Eliminação não é implementada de propósito - e o teste registra isso.

import { describe, expect, it, vi } from 'vitest'

import { anonimizarRegistros, exportarTitular, normalizarTelefone, preverEliminacao, telefoneValido } from './privacy'

const TELEFONE = '5511999998888'
const OUTRO = '5511888887777'

const contato = (phone: string, name = 'Ana') => ({
  company: '',
  created_at: 1,
  email: '',
  name,
  phone,
  tags: [],
  tenant_id: 'local',
  updated_at: 1
})

const conversa = (phone: string, mensagens = 2) => ({
  contact_phone: phone,
  created_at: 1,
  id: `c_${phone}`,
  last_message_at: 1,
  last_message_preview: 'oi',
  messages: Array.from({ length: mensagens }, (_, i) => ({ body: `m${i}`, direction: 'entrada' as const, external_id: '', sent_at: 1 })),
  notes: '',
  status: 'aberta' as const,
  tags: [],
  tenant_id: 'local',
  title: 'x',
  unread: 0,
  updated_at: 1
})

const oportunidade = (phone: string) => ({
  contact_phone: phone,
  created_at: 1,
  currency: 'BRL',
  id: `o_${phone}`,
  lost_reason: '',
  stage: 'novo' as const,
  tenant_id: 'local',
  title: 'Negócio',
  updated_at: 1,
  value_cents: 1000
})

const tarefa = (phone: string) => ({
  contact_phone: phone,
  created_at: 1,
  due_at: null,
  id: `t_${phone}`,
  notes: '',
  priority: 'media' as const,
  status: 'aberta' as const,
  tenant_id: 'local',
  title: 'Ligar',
  updated_at: 1
})

function deps(over: Record<string, unknown> = {}) {
  return {
    contacts: { list: vi.fn(async () => [contato(TELEFONE), contato(OUTRO, 'Bruno')]) },
    conversations: { list: vi.fn(async () => [conversa(TELEFONE), conversa(OUTRO)]) },
    opportunities: { list: vi.fn(async () => [oportunidade(TELEFONE), oportunidade(OUTRO)]) },
    tasks: { list: vi.fn(async () => [tarefa(TELEFONE), tarefa(OUTRO)]) },
    ...over
  } as never
}

describe('normalizacao do telefone', () => {
  it('tira mascara e mantem o + ', () => {
    expect(normalizarTelefone('+55 (11) 99999-8888')).toBe('5511999998888')
  })

  it('recusa telefone curto: 8 digitos e o minimo do CRM', () => {
    expect(telefoneValido('119999')).toBe(false)
    expect(telefoneValido(TELEFONE)).toBe(true)
  })

  it('exportar com telefone invalido devolve erro, nao lista vazia', async () => {
    // Lista vazia seria indistinguivel de "o titular nao tem dados" - a diferenca importa para a
    // resposta ao titular.
    expect(await exportarTitular('123', deps())).toEqual({ error: 'telefone_invalido' })
  })
})

describe('exportar', () => {
  it('traz so os dados do titular, nao os de outro telefone', async () => {
    const r = await exportarTitular(TELEFONE, deps())

    if ('error' in r) throw new Error(r.error)

    expect(r.export.contatos).toHaveLength(1)
    expect(r.export.contatos[0]!.name).toBe('Ana')
    expect(r.export.conversas).toHaveLength(1)
    expect(r.export.oportunidades).toHaveLength(1)
    expect(r.export.tarefas).toHaveLength(1)
  })

  it('conta as mensagens, nao so as conversas', async () => {
    const r = await exportarTitular(TELEFONE, deps())

    if ('error' in r) throw new Error(r.error)

    expect(r.export.totais.conversas).toBe(1)
    expect(r.export.totais.mensagens).toBe(2)
  })

  it('declara os totais por dominio para a resposta ser legivel', async () => {
    const r = await exportarTitular(TELEFONE, deps())

    if ('error' in r) throw new Error(r.error)

    expect(r.export.totais).toEqual({ contatos: 1, conversas: 1, mensagens: 2, oportunidades: 1, tarefas: 1 })
    expect(r.export.gerado_em).toBeGreaterThan(0)
  })

  it('titular sem dados devolve totais zerados, e isso e resposta legitima', async () => {
    const r = await exportarTitular(
      TELEFONE,
      deps({
        contacts: { list: async () => [] },
        conversations: { list: async () => [] },
        opportunities: { list: async () => [] },
        tasks: { list: async () => [] }
      })
    )

    if ('error' in r) throw new Error(r.error)

    expect(r.export.totais).toEqual({ contatos: 0, conversas: 0, mensagens: 0, oportunidades: 0, tarefas: 0 })
  })

  it('compara pelo telefone normalizado: mascara nao esconde o titular', async () => {
    const r = await exportarTitular('+55 (11) 99999-8888', deps())

    if ('error' in r) throw new Error(r.error)

    expect(r.export.contatos).toHaveLength(1)
  })
})

describe('prever eliminacao', () => {
  it('diz o que a eliminacao alcancaria, sem eliminar nada', async () => {
    const d = deps()
    const r = await preverEliminacao(TELEFONE, d)

    if ('error' in r) throw new Error(r.error)

    expect(r.alcance.contatos).toBe(1)
    expect(r.alcance.mensagens).toBe(2)

    // Prever nao pode escrever: nenhum store aqui tem metodo de escrita, e o teste deixa isso explicito.
    expect(Object.keys(d).every(k => Object.keys((d as never)[k]).every(m => m === 'list'))).toBe(true)
  })
})

describe('anonimizacao (decisao do proprietario, r92)', () => {
  it('tira o que identifica e mantem o que e fato', async () => {
    const r = await exportarTitular(TELEFONE, deps())

    if ('error' in r) throw new Error(r.error)

    const a = anonimizarRegistros(TELEFONE, r.export)

    for (const c of a.contatos) {
      expect(c.name).toBe('Titular removido')
      expect(c.email).toBe('')
      expect(c.company).toBe('')
      expect(c.tags).toEqual([])
    }

    expect(a.conversas[0]!.messages).toEqual([])
    expect(a.conversas[0]!.notes).toBe('')
    expect(a.oportunidades[0]!.value_cents).toBe(1000)
  })

  it('o telefone real nao sobrevive em nenhum dominio', async () => {
    const r = await exportarTitular(TELEFONE, deps())

    if ('error' in r) throw new Error(r.error)

    const a = anonimizarRegistros(TELEFONE, r.export)
    const tudo = JSON.stringify(a)

    expect(tudo).not.toContain(TELEFONE)
    expect(tudo).not.toContain('Ana')
  })

  it('o MESMO marcador em todos os dominios: a ligacao interna sobrevive', async () => {
    const r = await exportarTitular(TELEFONE, deps())

    if ('error' in r) throw new Error(r.error)

    const a = anonimizarRegistros(TELEFONE, r.export)

    expect(a.contatos[0]!.phone).toBe(a.marcador)
    expect(a.conversas[0]!.contact_phone).toBe(a.marcador)
    expect(a.oportunidades[0]!.contact_phone).toBe(a.marcador)
    expect(a.tarefas[0]!.contact_phone).toBe(a.marcador)
  })

  it('o marcador e derivado e nao reversivel pelo formato', () => {
    const a = anonimizarRegistros(TELEFONE, { contatos: [], conversas: [], gerado_em: 1, oportunidades: [], tarefas: [], telefone: TELEFONE, totais: { contatos: 0, conversas: 0, mensagens: 0, oportunidades: 0, tarefas: 0 } })

    expect(a.marcador).toMatch(/^anon_[0-9a-f]{12}$/)
    expect(a.marcador).not.toContain(TELEFONE)
  })

  it('o mesmo telefone gera sempre o mesmo marcador', () => {
    const vazio = { contatos: [], conversas: [], gerado_em: 1, oportunidades: [], tarefas: [], telefone: TELEFONE, totais: { contatos: 0, conversas: 0, mensagens: 0, oportunidades: 0, tarefas: 0 } }

    expect(anonimizarRegistros(TELEFONE, vazio).marcador).toBe(anonimizarRegistros(TELEFONE, vazio).marcador)
  })
})
