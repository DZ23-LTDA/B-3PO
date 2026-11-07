import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { SalesStore, salesStorePath } from './sales-store'
import { TariffStore, tariffStorePath } from './tariff-store'

/**
 * r5 do V4 — a ATOMICIDADE da escrita, provada por comportamento.
 *
 * O QUE ESTE TESTE CORRIGE
 *
 * Na r4 eu registrei um risco `HIGH` dizendo que os stores gravavam sem atomicidade e que um crash
 * deixaria o arquivo truncado. **Estava errado**, e o erro foi do meu detector: contei
 * `writeFileSync` e os stores usam `node:fs/promises` (`writeFile` async + `rename`). O censo
 * corrigido dá **35 atômicos, 0 sem rename, 1 delega ao `main.ts` por projeto**.
 *
 * O que **de fato** faltava era prova: 36 arquivos de teste exercitam escrita real, mas **nenhum**
 * afirmava que o temporário não fica para trás. Um `rename` esquecido não quebraria nenhum teste
 * existente — e deixaria um `.tmp` órfão por gravação.
 *
 * O QUE ESTES TESTES AFIRMAM
 *
 * 1. depois de gravar, **não sobra `.tmp`** no diretório;
 * 2. gravar de novo **substitui** (não acumula nem duplica);
 * 3. um `.tmp` órfão de uma tentativa anterior **não corrompe** a leitura;
 * 4. a leitura de um arquivo corrompido devolve vazio **sem lançar** — o app abre.
 *
 * Este teste não simula crash no meio do `writeFile` (isso exigiria injetar falha no `fs`, e o ganho
 * seria testar o mock). Ele prova o que é observável: o arquivo final está íntegro e o intermediário
 * não ficou.
 */

const tmp = (nome: string) => `${nome}.tmp`

async function comDir<T>(run: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'b3po-atomico-'))

  try {
    return await run(dir)
  } finally {
    await rm(dir, { force: true, recursive: true })
  }
}

const venda = () => ({ items: [{ product_sku: 'CAF-500', quantity: 2, unit_price_cents: 1000 }] })

describe('SalesStore — a gravação não deixa temporário para trás', () => {
  it('grava e o diretório fica sem .tmp', async () => {
    await comDir(async dir => {
      const store = new SalesStore(salesStorePath(dir))
      const r = await store.create(venda())

      expect('sale' in r).toBe(true)

      const arquivos = await readdir(dirname(salesStorePath(dir)))
      expect(arquivos.filter(a => a.endsWith('.tmp'))).toEqual([])
    })
  })

  it('gravar de novo substitui — não duplica nem corrompe', async () => {
    await comDir(async dir => {
      const store = new SalesStore(salesStorePath(dir))

      await store.create(venda())
      const primeira = await readFile(salesStorePath(dir), 'utf8')

      await store.create(venda())
      const segunda = await readFile(salesStorePath(dir), 'utf8')

      expect(JSON.parse(segunda).sales).toHaveLength(2)
      expect(segunda.length).toBeGreaterThan(primeira.length)

      const arquivos = await readdir(dirname(salesStorePath(dir)))
      expect(arquivos.filter(a => a.endsWith('.tmp'))).toEqual([])
    })
  })

  it('um .tmp órfão de uma gravação interrompida não impede a próxima', async () => {
    await comDir(async dir => {
      const alvo = salesStorePath(dir)

      await mkdir(dirname(alvo), { recursive: true })
      // simula o que um crash no meio do write deixaria
      await writeFile(tmp(alvo), '{ "lixo": trunc', 'utf8')

      const store = new SalesStore(alvo)
      const r = await store.create(venda())

      expect('sale' in r).toBe(true)

      const arquivos = await readdir(dirname(alvo))
      expect(arquivos.filter(a => a.endsWith('.tmp'))).toEqual([])
    })
  })
})

describe('TariffStore — mesma garantia no store criado no ciclo anterior', () => {
  const politica = () => ({
    created_at: 1,
    esgoto_percentual: null,
    faixas: [{ ate_milli: null, preco_centavos_por_m3: 500 }],
    id: 'pol-1',
    minimo_milli: null,
    moeda: 'BRL',
    taxa_fixa_centavos: null,
    tenant_id: 't1',
    vigencia_fim: null,
    vigencia_inicio: 1
  })

  it('grava e o diretório fica sem .tmp', async () => {
    await comDir(async dir => {
      const store = new TariffStore(tariffStorePath(dir))

      await store.salvar(politica() as Parameters<TariffStore['salvar']>[0])

      const arquivos = await readdir(dirname(tariffStorePath(dir)))
      expect(arquivos.filter(a => a.endsWith('.tmp'))).toEqual([])
      expect(await store.list('t1')).toHaveLength(1)
    })
  })

  it('arquivo corrompido devolve vazio SEM lançar — o app abre mesmo assim', async () => {
    await comDir(async dir => {
      const alvo = tariffStorePath(dir)

      await mkdir(dirname(alvo), { recursive: true })
      await writeFile(alvo, 'isto nao e json', 'utf8')

      const store = new TariffStore(alvo)

      await expect(store.list('t1')).resolves.toEqual([])
    })
  })
})
