import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname } from 'node:path'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { ServicesStore, normalizeService, parseServices, servicesFor, servicesStorePath } from './services-store'

async function withStore<T>(run: (store: ServicesStore, file: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'b3po-services-'))

  try {
    const file = servicesStorePath(dir)

    return await run(new ServicesStore(file), file)
  } finally {
    await rm(dir, { force: true, recursive: true })
  }
}

describe('normalizacao de servico', () => {
  it('exige nome', () => {
    expect(normalizeService({ name: '  ' }, 1)).toEqual({ error: 'name_required' })
  })

  it('aplica duracao padrao de 30 min quando nao informada', () => {
    const r = normalizeService({ name: 'Corte' }, 1)

    expect('service' in r && r.service.duration_min).toBe(30)
  })

  it('recusa duracao zero ou negativa', () => {
    // Duracao 0 nao ocupa horario e quebra a deteccao de conflito da agenda.
    expect(normalizeService({ duration_min: 0, name: 'Corte' }, 1)).toEqual({ error: 'duration_required' })
    expect(normalizeService({ duration_min: -10, name: 'Corte' }, 1)).toEqual({ error: 'duration_required' })
  })

  it('aceita servico cortesia com preco zero', () => {
    const r = normalizeService({ name: 'Avaliacao', price_cents: 0 }, 1)

    expect('service' in r && r.service.price_cents).toBe(0)
  })

  it('le preco em reais e converte para centavos', () => {
    const r = normalizeService({ name: 'Corte', price_cents: '49,90' }, 1)

    expect('service' in r && r.service.price_cents).toBe(4990)
  })
})

describe('store de servicos', () => {
  it('cadastra e lista por nome', async () => {
    await withStore(async store => {
      await store.upsert({ name: 'Zulu', price_cents: 5000 })
      await store.upsert({ name: 'Alfa', price_cents: 3000 })

      expect((await store.list()).map(s => s.name)).toEqual(['Alfa', 'Zulu'])
    })
  })

  it('recusa dois servicos com o mesmo nome, ignorando caixa e acento', async () => {
    await withStore(async store => {
      await store.upsert({ name: 'Corte' })

      expect(await store.upsert({ name: 'corte' })).toEqual({ error: 'servico_duplicado' })
      expect(await store.upsert({ name: 'CóRte' })).toEqual({ error: 'servico_duplicado' })
    })
  })

  it('preserva created_at ao editar', async () => {
    await withStore(async store => {
      const criado = await store.upsert({ created_at: 700, name: 'Corte' })

      expect('service' in criado).toBe(true)
      if (!('service' in criado)) return

      await store.upsert({ id: criado.service.id, name: 'Corte', price_cents: 6000 })

      const lista = await store.list()

      expect(lista[0]!.created_at).toBe(700)
      expect(lista[0]!.price_cents).toBe(6000)
    })
  })

  it('findByName acha ignorando caixa e acento — e a ponte com a agenda', async () => {
    await withStore(async store => {
      await store.upsert({ name: 'Manicure Simples' })

      expect((await store.findByName('  MANICURE simples '))?.name).toBe('Manicure Simples')
      expect(await store.findByName('Pedicure')).toBeNull()
    })
  })

  it('remove e reporta quando o id nao existe', async () => {
    await withStore(async store => {
      const criado = await store.upsert({ name: 'Corte' })
      if (!('service' in criado)) return

      expect('services' in (await store.remove(criado.service.id))).toBe(true)
      expect(await store.remove('nao-existe')).toEqual({ error: 'servico_nao_encontrado' })
      expect(await store.list()).toHaveLength(0)
    })
  })

  it('lista so os ativos', () => {
    const base = { active: true, created_at: 0, duration_min: 30, id: 'a', name: 'A', notes: '', price_cents: 0, tenant_id: 'local', updated_at: 0 }

    expect(servicesFor([base, { ...base, active: false, id: 'b', name: 'B' }]).map(s => s.name)).toEqual(['A'])
  })

  it('separa tenants', () => {
    const base = { active: true, created_at: 0, duration_min: 30, id: 'a', name: 'A', notes: '', price_cents: 0, tenant_id: 'local', updated_at: 0 }

    expect(servicesFor([base, { ...base, id: 'b', name: 'B', tenant_id: 'emp_1' }], 'emp_1').map(s => s.name)).toEqual(['B'])
  })

  it('trata arquivo corrompido como vazio', () => {
    expect(parseServices('nao e json')).toEqual({ schema_version: 1, services: [] })
  })

  it('descarta entrada sem id e duplicata no arquivo lido', async () => {
    await withStore(async (store, file) => {
      // O diretorio b3po/ so nasce no primeiro write do store; aqui escrevemos direto no arquivo.
      await mkdir(dirname(file), { recursive: true })
      await writeFile(
        file,
        JSON.stringify({
          schema_version: 1,
          services: [
            { id: 'x', name: 'Corte', duration_min: 30, price_cents: 1000, tenant_id: 'local' },
            { id: 'y', name: 'corte', duration_min: 30, price_cents: 2000, tenant_id: 'local' },
            { name: 'sem id' }
          ]
        }),
        'utf8'
      )

      const lista = await store.list()

      // A duplicata em caixa diferente e descartada na leitura: o arquivo pode ter sido editado a mao.
      expect(lista).toHaveLength(1)
      expect(lista[0]!.name).toBe('Corte')
    })
  })
})
