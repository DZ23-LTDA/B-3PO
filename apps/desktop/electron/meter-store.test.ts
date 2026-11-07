import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { beforeEach, afterEach, describe, expect, it } from 'vitest'

import {
  MeterStore,
  consumoDoMedidor,
  consumosDoTenant,
  emptyMeter,
  meterStorePath,
  parseMeterUnsafe,
} from './meter-store'

/**
 * Água não se cobra por casco: se cobra pela **diferença entre duas leituras**. O dado é a **série**, e
 * as três coisas que podem dar errado são: o relógio andar para trás (digitação errada ou troca de
 * medidor), a leitura ser repetida, e a comparação ser feita entre medidores diferentes.
 *
 * Um erro aqui não aparece como "tela estranha": aparece como **conta errada**.
 */
describe('MeterStore', () => {
  let dir: string
  let store: MeterStore

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'b3po-med-'))
    store = new MeterStore(meterStorePath(dir))
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  async function medidor(kind: 'hidrometro' | 'gasometro' = 'hidrometro', serial = 'SN-1') {
    const r = await store.cadastrarMedidor({ kind, serial })

    if ('error' in r) throw new Error(r.error)

    return r.medidor
  }

  it('cadastra um medidor com cliente', async () => {
    const m = await medidor()

    expect(m.serial).toBe('SN-1')
    expect(m.kind).toBe('hidrometro')
  })

  it('a primeira leitura nao tem consumo (nao ha com o que comparar)', async () => {
    const m = await medidor()
    const r = await store.registrarLeitura({ medidor_id: m.id, reading_milli: 10_000 })

    if ('error' in r) throw new Error(r.error)

    expect(r.consumo.consumo_milli).toBeNull()
    expect(r.consumo.atual?.reading_milli).toBe(10_000)
    expect(r.consumo.anterior).toBeNull()
  })

  it('a segunda leitura da o consumo por diferenca', async () => {
    const m = await medidor()

    await store.registrarLeitura({ medidor_id: m.id, reading_milli: 10_000, read_at: 1_000 })
    const r = await store.registrarLeitura({ medidor_id: m.id, reading_milli: 12_100, read_at: 2_000 })

    if ('error' in r) throw new Error(r.error)

    // 12,100 m3 - 10,000 m3 = 2,100 m3 = 2100 milésimos
    expect(r.consumo.consumo_milli).toBe(2_100)
  })

  it('recusa leitura que regrediu (um relogio nao anda para tras)', async () => {
    const m = await medidor()

    await store.registrarLeitura({ medidor_id: m.id, reading_milli: 10_000 })

    const r = await store.registrarLeitura({ medidor_id: m.id, reading_milli: 9_000 })

    expect('error' in r).toBe(true)

    if (!('error' in r)) return

    expect(r.error).toBe('leitura_regrediu')
  })

  it('aceita leitura IGUAL (idempotente, consumo zero)', async () => {
    const m = await medidor()

    await store.registrarLeitura({ medidor_id: m.id, reading_milli: 10_000 })

    const r = await store.registrarLeitura({ medidor_id: m.id, reading_milli: 10_000 })

    if ('error' in r) throw new Error(r.error)

    expect(r.consumo.consumo_milli).toBe(0)
  })

  it('medidor trocado: cada um tem a PROPRIA serie (a comparacao nao atravessa)', async () => {
    const velho = await medidor('hidrometro', 'VELHO')
    const novo = await medidor('hidrometro', 'NOVO')

    await store.registrarLeitura({ medidor_id: velho.id, reading_milli: 90_000, read_at: 1_000 })

    // o novo comeca do zero — e isso NAO e um consumo negativo
    const r = await store.registrarLeitura({ medidor_id: novo.id, reading_milli: 500, read_at: 2_000 })

    if ('error' in r) throw new Error(r.error)

    expect(r.consumo.consumo_milli).toBeNull()
    expect(r.consumo.atual?.reading_milli).toBe(500)
  })

  it('ordena por read_at, nao por ordem de insercao', async () => {
    const m = await medidor()

    // a segunda chamada tem read_at MENOR: e uma leitura atrasada (digitada depois, lida antes)
    await store.registrarLeitura({ medidor_id: m.id, reading_milli: 10_000, read_at: 2_000 })
    await store.registrarLeitura({ medidor_id: m.id, reading_milli: 9_500, read_at: 1_000 })

    const consumos = await store.list()
    const c = consumos.consumos.find(x => x.medidor_id === m.id)

    // a "atual" e a de read_at maior (10.000), mesmo tendo sido gravada antes
    expect(c?.atual?.reading_milli).toBe(10_000)
    expect(c?.anterior?.reading_milli).toBe(9_500)
    expect(c?.consumo_milli).toBe(500)
  })

  it('recusa leitura atrasada que ULTRAPASSA a seguinte (a serie ficaria nao-monotonica)', async () => {
    const m = await medidor()

    await store.registrarLeitura({ medidor_id: m.id, reading_milli: 10_000, read_at: 1_000 })
    await store.registrarLeitura({ medidor_id: m.id, reading_milli: 12_000, read_at: 3_000 })

    // uma leitura de read_at 2.000 com valor 13.000 seria maior que a de 3.000 -> recusa
    const r = await store.registrarLeitura({ medidor_id: m.id, reading_milli: 13_000, read_at: 2_000 })

    expect('error' in r).toBe(true)

    if (!('error' in r)) return

    expect(r.error).toBe('leitura_ultrapassa_seguinte')
  })

  it('ACEITA leitura atrasada que cabe entre as vizinhas', async () => {
    const m = await medidor()

    await store.registrarLeitura({ medidor_id: m.id, reading_milli: 10_000, read_at: 1_000 })
    await store.registrarLeitura({ medidor_id: m.id, reading_milli: 12_000, read_at: 3_000 })

    // 11.000 entre 10.000 (dia 1) e 12.000 (dia 3) cabe perfeitamente
    const r = await store.registrarLeitura({ medidor_id: m.id, reading_milli: 11_000, read_at: 2_000 })

    expect('error' in r).toBe(false)
  })

  it('recusa leitura de medidor inexistente', async () => {
    const r = await store.registrarLeitura({ medidor_id: 'nao-existe', reading_milli: 1 });

    expect('error' in r).toBe(true)

    if (!('error' in r)) return

    expect(r.error).toBe('medidor_nao_encontrado')
  })

  it('recusa leitura negativa ou nao numerica', async () => {
    const m = await medidor()

    expect('error' in (await store.registrarLeitura({ medidor_id: m.id, reading_milli: -1 }))).toBe(true)
    expect('error' in (await store.registrarLeitura({ medidor_id: m.id, reading_milli: 'abc' }))).toBe(true)
  })

  it('recusa medidor sem tipo valido', async () => {
    const r = await store.cadastrarMedidor({ kind: 'bussola' });

    expect('error' in r).toBe(true)
  })

  it('persiste entre instancias', async () => {
    const m = await medidor()

    await store.registrarLeitura({ medidor_id: m.id, reading_milli: 5_000 })

    const outra = new MeterStore(meterStorePath(dir))
    const r = await outra.list()

    expect(r.medidores).toHaveLength(1)
    expect(r.leituras).toHaveLength(1)
  })
})

describe('consumoDoMedidor', () => {
  it('sem leituras devolve tudo nulo', () => {
    const c = consumoDoMedidor([], 'm1')

    expect(c.atual).toBeNull()
    expect(c.consumo_milli).toBeNull()
  })

  it('uma leitura devolve atual mas consumo nulo', () => {
    const c = consumoDoMedidor(
      [{ created_at: 1, id: 'l1', medidor_id: 'm1', read_at: 1, reading_milli: 100, tenant_id: 'local' }],
      'm1'
    )

    expect(c.atual?.reading_milli).toBe(100)
    expect(c.consumo_milli).toBeNull()
  })
})

describe('parseMeterUnsafe', () => {
  it('corrompido vira vazio', () => {
    expect(parseMeterUnsafe('{ nao json').medidores).toEqual([])
    expect(parseMeterUnsafe('null').leituras).toEqual([])
    expect(parseMeterUnsafe('{"leituras": 5}').leituras).toEqual([])
  })

  it('descarta leitura sem medidor_id', () => {
    const f = parseMeterUnsafe(
      JSON.stringify({
        leituras: [{ id: 'ok', medidor_id: 'm1', reading_milli: 10 }, { id: 'sem-medidor' }],
        medidores: [{ id: 'm1', kind: 'hidrometro' }],
      })
    )

    expect(f.leituras).toHaveLength(1)
    expect(f.medidores).toHaveLength(1)
  })

  it('emptyMeter tem a forma esperada', () => {
    expect(emptyMeter()).toEqual({ leituras: [], medidores: [], schema_version: 1 })
  })
})

describe('consumosDoTenant', () => {
  it('so devolve medidores do tenant', () => {
    const base = { created_at: 1, installed_at: 1, serial: '', updated_at: 1 }

    const consumos = consumosDoTenant(
      {
        leituras: [],
        medidores: [
          { ...base, customer_id: null, id: 'a', kind: 'hidrometro', tenant_id: 'local' },
          { ...base, customer_id: null, id: 'b', kind: 'hidrometro', tenant_id: 'outro' },
        ],
        schema_version: 1,
      },
      'local'
    )

    expect(consumos).toHaveLength(1)
    expect(consumos[0]!.medidor_id).toBe('a')
  })
})
