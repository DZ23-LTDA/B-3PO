import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  calcularConta,
  emptyTariffs,
  parseTariffsUnsafe,
  politicaVigente,
  TariffStore,
  tariffStorePath,
  validarPolitica,
  type PoliticaTarifaria
} from './tariff-store'

/**
 * T-12 — política tarifária configurável.
 *
 * A regra que estes testes protegem acima de todas: **o código não inventa preço**. Uma instalação
 * sem política não cobra nada e não chuta nada — `calcular` devolve `null`.
 */

const T = (over: Partial<PoliticaTarifaria> = {}): PoliticaTarifaria => ({
  created_at: 1,
  esgoto_percentual: null,
  faixas: [
    { ate_milli: 10_000, preco_centavos_por_m3: 500 },
    { ate_milli: null, preco_centavos_por_m3: 900 }
  ],
  id: 'pol-1',
  minimo_milli: null,
  moeda: 'BRL',
  taxa_fixa_centavos: null,
  tenant_id: 'local',
  vigencia_fim: null,
  vigencia_inicio: 0,
  ...over
})

describe('calcularConta — compõe a conta a partir da política', () => {
  it('cobra a primeira faixa até o teto e a segunda acima dele', () => {
    // 15 m³ = 15_000 milésimos. 10 m³ na faixa 1 (500 c/m³) + 5 m³ na faixa 2 (900 c/m³)
    const conta = calcularConta(T(), 15_000)

    expect(conta.faixas_aplicadas).toHaveLength(2)
    expect(conta.faixas_aplicadas[0].milli_na_faixa).toBe(10_000)
    expect(conta.faixas_aplicadas[0].subtotal_centavos).toBe(5_000) // 10 m³ × 5,00
    expect(conta.faixas_aplicadas[1].milli_na_faixa).toBe(5_000)
    expect(conta.faixas_aplicadas[1].subtotal_centavos).toBe(4_500) // 5 m³ × 9,00
    expect(conta.agua_centavos).toBe(9_500)
    expect(conta.total_centavos).toBe(9_500)
  })

  it('consumo abaixo do teto não toca a faixa seguinte', () => {
    const conta = calcularConta(T(), 4_000)

    expect(conta.faixas_aplicadas).toHaveLength(1)
    expect(conta.agua_centavos).toBe(2_000)
  })

  it('consumo zero não gera faixa nenhuma', () => {
    const conta = calcularConta(T(), 0)

    expect(conta.faixas_aplicadas).toHaveLength(0)
    expect(conta.total_centavos).toBe(0)
  })

  it('o mínimo fatura mais que o medido, e a conta mostra OS DOIS números', () => {
    const conta = calcularConta(T({ minimo_milli: 6_000 }), 2_000)

    expect(conta.consumo_medido_milli).toBe(2_000)
    expect(conta.consumo_faturado_milli).toBe(6_000)
    expect(conta.minimo_aplicado).toBe(true)
    expect(conta.agua_centavos).toBe(3_000) // 6 m³ × 5,00
  })

  it('o mínimo não infla um consumo que já é maior', () => {
    const conta = calcularConta(T({ minimo_milli: 6_000 }), 9_000)

    expect(conta.consumo_faturado_milli).toBe(9_000)
    expect(conta.minimo_aplicado).toBe(false)
  })

  it('esgoto percentual incide sobre a água, e a taxa fixa é somada', () => {
    const conta = calcularConta(T({ esgoto_percentual: 80, taxa_fixa_centavos: 1_500 }), 4_000)

    expect(conta.agua_centavos).toBe(2_000)
    expect(conta.esgoto_centavos).toBe(1_600) // 80% de 2.000
    expect(conta.taxa_fixa_centavos).toBe(1_500)
    expect(conta.total_centavos).toBe(5_100)
  })

  it('sem esgoto e sem taxa configurados, não cobra nenhum dos dois', () => {
    const conta = calcularConta(T(), 4_000)

    expect(conta.esgoto_centavos).toBe(0)
    expect(conta.taxa_fixa_centavos).toBe(0)
  })

  it('carrega a moeda da política — não infere', () => {
    expect(calcularConta(T({ moeda: 'USD' }), 1_000).moeda).toBe('USD')
  })

  it('recusa consumo fracionado ou negativo (a unidade é inteira)', () => {
    expect(() => calcularConta(T(), -1)).toThrow('politica_invalida:consumo')
    expect(() => calcularConta(T(), 1.5)).toThrow('politica_invalida:consumo')
  })
})

describe('validarPolitica — uma faixa com buraco produz conta errada em silêncio', () => {
  it('aceita uma política bem formada', () => {
    expect(() => validarPolitica(T())).not.toThrow()
  })

  it('recusa política sem faixa', () => {
    expect(() => validarPolitica(T({ faixas: [] }))).toThrow('politica_sem_faixa')
  })

  it('recusa faixa fechada no fim: o consumo acima do teto ficaria sem preço', () => {
    expect(() => validarPolitica(T({ faixas: [{ ate_milli: 10_000, preco_centavos_por_m3: 500 }] }))).toThrow(
      'politica_sem_faixa_aberta'
    )
  })

  it('recusa faixa aberta que não é a última', () => {
    expect(() =>
      validarPolitica(
        T({
          faixas: [
            { ate_milli: null, preco_centavos_por_m3: 500 },
            { ate_milli: 10_000, preco_centavos_por_m3: 900 }
          ]
        })
      )
    ).toThrow('faixa_0_aberta_sem_ser_ultima')
  })

  it('recusa faixas fora de ordem', () => {
    expect(() =>
      validarPolitica(
        T({
          faixas: [
            { ate_milli: 20_000, preco_centavos_por_m3: 500 },
            { ate_milli: 10_000, preco_centavos_por_m3: 900 },
            { ate_milli: null, preco_centavos_por_m3: 900 }
          ]
        })
      )
    ).toThrow('faixa_1_fora_de_ordem')
  })

  it('recusa preço negativo ou fracionado', () => {
    expect(() => validarPolitica(T({ faixas: [{ ate_milli: null, preco_centavos_por_m3: -1 }] }))).toThrow(
      'politica_invalida:faixa_0_preco'
    )
  })

  it('recusa esgoto fora de 0-100', () => {
    expect(() => validarPolitica(T({ esgoto_percentual: 101 }))).toThrow('politica_esgoto_invalido')
  })

  it('recusa moeda vazia — não inferimos a moeda', () => {
    expect(() => validarPolitica(T({ moeda: '  ' }))).toThrow('politica_sem_moeda')
  })

  it('recusa vigência invertida', () => {
    expect(() => validarPolitica(T({ vigencia_fim: 5, vigencia_inicio: 10 }))).toThrow('politica_vigencia_invertida')
  })
})

describe('politicaVigente — escolhe por data, ou nada', () => {
  it('devolve null quando não há política nenhuma (não inventa)', () => {
    expect(politicaVigente([], 1_000)).toBeNull()
  })

  it('respeita o início da vigência', () => {
    expect(politicaVigente([T({ vigencia_inicio: 1_000 })], 999)).toBeNull()
    expect(politicaVigente([T({ vigencia_inicio: 1_000 })], 1_000)).not.toBeNull()
  })

  it('respeita o fim da vigência', () => {
    const p = T({ vigencia_fim: 2_000, vigencia_inicio: 1_000 })

    expect(politicaVigente([p], 2_001)).toBeNull()
  })

  it('entre duas vigentes, escolhe a mais recente', () => {
    const antiga = T({ id: 'antiga', vigencia_inicio: 0 })
    const nova = T({ id: 'nova', vigencia_inicio: 500 })

    expect(politicaVigente([antiga, nova], 1_000)?.id).toBe('nova')
  })
})

describe('TariffStore — persistência', () => {
  let dir = ''

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'b3po-tariff-'))
  })

  afterEach(async () => {
    const { rm } = await import('node:fs/promises')

    await rm(dir, { force: true, recursive: true })
  })

  it('instalação nova não tem política — e não tem preço padrão', async () => {
    const store = new TariffStore(tariffStorePath(dir))

    expect(await store.list('local')).toEqual([])
    expect(await store.calcular('local', 5_000, 0)).toBeNull()
  })

  it('grava, lê e calcula', async () => {
    const store = new TariffStore(tariffStorePath(dir))

    await store.salvar(T())
    expect(await store.list('local')).toHaveLength(1)
    expect((await store.calcular('local', 4_000, 0))?.agua_centavos).toBe(2_000)
  })

  it('isola por tenant', async () => {
    const store = new TariffStore(tariffStorePath(dir))

    await store.salvar(T({ id: 'a', tenant_id: 'loja-1' }))
    await store.salvar(T({ id: 'b', tenant_id: 'loja-2' }))

    expect(await store.list('loja-1')).toHaveLength(1)
    expect(await store.list('loja-2')).toHaveLength(1)
  })

  it('recusa gravar política inválida — a validação vem antes do disco', async () => {
    const store = new TariffStore(tariffStorePath(dir))

    await expect(store.salvar(T({ faixas: [] }))).rejects.toThrow('politica_sem_faixa')
    expect(await store.list('local')).toEqual([])
  })

  it('atualiza por id em vez de duplicar', async () => {
    const store = new TariffStore(tariffStorePath(dir))

    await store.salvar(T())
    await store.salvar(T({ taxa_fixa_centavos: 300 }))
    expect(await store.list('local')).toHaveLength(1)
  })

  it('remove', async () => {
    const store = new TariffStore(tariffStorePath(dir))

    await store.salvar(T())
    await store.remover('pol-1')
    expect(await store.list('local')).toEqual([])
  })

  it('arquivo corrompido não derruba: volta vazio', async () => {
    await writeFile(tariffStorePath(dir), '{ nao e json', 'utf8')

    expect(await new TariffStore(tariffStorePath(dir)).list('local')).toEqual([])
  })

  it('lê o que escreveu (ida e volta)', async () => {
    const store = new TariffStore(tariffStorePath(dir))

    await store.salvar(T())
    const cru = JSON.parse(await readFile(tariffStorePath(dir), 'utf8'))

    expect(cru.schema_version).toBe(1)
    expect(cru.politicas[0].moeda).toBe('BRL')
  })
})

describe('parseTariffsUnsafe — arquivo de terceiro não entra sem validação', () => {
  it('vazio vira zero política', () => {
    expect(emptyTariffs()).toEqual({ politicas: [], schema_version: 1 })
  })

  it('recusa política inválida vinda do disco', () => {
    const ruim = JSON.stringify({ politicas: [{ ...T(), faixas: [] }], schema_version: 1 })

    expect(() => parseTariffsUnsafe(ruim)).toThrow('politica_sem_faixa')
  })
})
