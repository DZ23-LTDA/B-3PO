// O TESTE DE MONTAGEM (r110 do GOAL V2).
//
// O QUE A r109 DESCOBRIU
//
// Tres canais que eu criei - projects, trabalhos e organizacao - tinham store, canal, preload, wrapper e
// tela, E NAO ESTAVAM MONTADOS NO ERP. Todos os testes de canal passavam, porque testavam O REGISTER e nao
// A MONTAGEM.
//
// E o padrao da r2 (capacidade sem porta) na sua forma mais silenciosa: a capacidade existe, o teste dela
// passa, e NINGUEM CHEGA NELA.
//
// O QUE ESTE TESTE FAZ
//
// Le os arquivos `*-ipc.ts` que exportam `registerXxxIpc` e verifica que CADA UM e chamado em algum arquivo
// de producao. Um `register` que ninguem chama e um modulo morto com aparencia de pronto.
//
// O QUE ELE NAO FAZ
//
// Nao verifica que o canal esta no `erp-ipc` especificamente: canal de infraestrutura (git, fs, terminal,
// janela) e montado no `main.ts`, e isso e correto. **A pergunta e "alguem chama?", nao "onde".**

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const RAIZ = __dirname

/** Todos os `.ts` de producao, recursivo. */
function arquivos(dir: string): string[] {
  const saida: string[] = []

  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome)

    if (statSync(caminho).isDirectory()) {
      saida.push(...arquivos(caminho))

      continue
    }

    if (nome.endsWith('.ts') && !nome.endsWith('.test.ts') && !nome.endsWith('.d.ts')) saida.push(caminho)
  }

  return saida
}

const ARQUIVOS = arquivos(RAIZ)

/** Onde cada `registerXxxIpc` e DEFINIDO. */
function definicoes(): Map<string, string> {
  const mapa = new Map<string, string>()

  for (const caminho of ARQUIVOS) {
    const texto = readFileSync(caminho, 'utf8')
    const re = /^export function (register[A-Za-z]+Ipc)\b/gm
    let m: RegExpExecArray | null

    while ((m = re.exec(texto)) !== null) mapa.set(m[1] as string, caminho)
  }

  return mapa
}

/**
 * Quem CHAMA cada `registerXxxIpc` — fora da linha de definicao.
 *
 * **r125: `definicoes()` era chamado DENTRO do laco**, uma vez por arquivo, e cada chamada relia TODOS os
 * arquivos. Com 500 arquivos isso e 500 x 500 leituras: a suite levava **47 s** e, rodando junto com outros
 * arquivos, estourava o timeout do vitest — **parecendo uma falha de correcao que nao existia**.
 *
 * O nome e calculado **uma vez**, e cada arquivo e lido **uma vez**.
 */
function chamadas(): Map<string, string[]> {
  const mapa = new Map<string, string[]>()
  const nomes = [...definicoes().keys()]

  for (const caminho of ARQUIVOS) {
    const texto = readFileSync(caminho, 'utf8')

    for (const nome of nomes) {
      if (texto.includes(`${nome}(`)) {
        const lista = mapa.get(nome) ?? []

        lista.push(caminho)

        mapa.set(nome, lista)
      }
    }
  }

  return mapa
}

describe('o mapa de montagem', () => {
  it('todo registerXxxIpc exportado e CHAMADO em algum arquivo de producao', () => {
    // Um register que ninguem chama e um modulo morto com aparencia de pronto.
    const defs = definicoes()
    const usos = chamadas()
    const orfaos = [...defs.keys()].filter(nome => !usos.has(nome))

    expect(orfaos).toEqual([])
  })

  it('sao 53 registers — se o numero mudou, revise a montagem', () => {
    expect(definicoes().size).toBe(53)
  })

  it('os tres da r109 ESTAO montados — o bug que este teste existe para pegar', () => {
    // Se este teste falhar, o cenario da r109 voltou: canal, preload, wrapper e tela, e nenhum deles ligado.
    const usos = chamadas()

    expect(usos.has('registerProjectIpc')).toBe(true)
    expect(usos.has('registerWorkItemIpc')).toBe(true)
    expect(usos.has('registerOrganizationIpc')).toBe(true)
  })

  it('o canal de estoque tambem — o teste de onde o bug da r109 apareceu', () => {
    expect(chamadas().has('registerInventoryIpc')).toBe(true)
  })
})
