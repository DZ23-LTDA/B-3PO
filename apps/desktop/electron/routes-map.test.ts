// O MAPA DE ROTAS, como teste (r99 do GOAL V2).
//
// O QUE O §13:459-462 PEDE
//
// *"Entregáveis: B3PO-INFORMATION-ARCHITECTURE.md, B3PO-NAVIGATION-AND-UX-SPEC.md, **mapa de rotas e matriz
// de migração**."*
//
// POR QUE O MAPA É UM TESTE, E NÃO SÓ UMA TABELA
//
// Um mapa de rotas num documento **envelhece na próxima rodada** — e um mapa errado **é pior que nenhum**
// (a r93 provou isso: três de três achados falsos).
//
// **Este arquivo lê `routes.ts` e `plugin.tsx` e falha quando o mapa deixa de ser verdade.** O documento diz
// o que existe; o teste **obriga** o documento a continuar certo.
//
// O QUE ELE **NÃO** FAZ
//
// **Não lê `b3po-modulos.ts`** — o catálogo da busca é uma lista à parte (r97), e ele tem o seu próprio teste
// (`b3po-modulos.test.ts`) comparando com o menu. Aqui a pergunta é outra: **as rotas declaradas estão
// registradas, e as do menu existem?**

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const APP = join(__dirname, '..', 'src', 'app')
const ROUTES = readFileSync(join(APP, 'routes.ts'), 'utf8')
const NAV = readFileSync(join(__dirname, '..', 'src', 'plugins', 'b3po-nav', 'plugin.tsx'), 'utf8')

/** `NOME_ROUTE = '/path'` */
function constantes(): Map<string, string> {
  const mapa = new Map<string, string>()
  const re = /^export const (\w+_ROUTE) = '([^']+)'$/gm
  let m: RegExpExecArray | null

  while ((m = re.exec(ROUTES)) !== null) mapa.set(m[1] as string, m[2] as string)

  return mapa
}

/** `{ id: 'x', path: CONST_ROUTE, view: 'x' }` */
function registradas(): string[] {
  const paths: string[] = []
  const re = /^\s+\{ id: '[^']+', path: (\w+_ROUTE), view: '[^']+' \},?$/gm
  let m: RegExpExecArray | null

  while ((m = re.exec(ROUTES)) !== null) paths.push(m[1] as string)

  return paths
}

/** `path: '/x'` no `b3po-nav` */
function noMenu(): Set<string> {
  const set = new Set<string>()
  // r125: tolerante ao grupo (r122) e a espacos. A forma do item mudou e este regex e a UNICA leitura
  // do plugin no ambiente electron (que nao importa .tsx) - entao ele aceita o campo novo em vez de exigir
  // a forma antiga.
  const re = /\{ codicon: '[^']+',(?: grupo: '[^']+',)? label: '[^']+', path: '([^']+)'[^}]*\}/g
  let m: RegExpExecArray | null

  while ((m = re.exec(NAV)) !== null) set.add(m[1] as string)

  return set
}

describe('o mapa de rotas', () => {
  it('40 rotas declaradas — se o número mudou, o documento do §13 precisa mudar junto', () => {
    expect(constantes().size).toBe(40)
  })

  it('TODA constante está registrada em APP_ROUTES — nenhuma rota declarada e esquecida', () => {
    const todas = constantes()
    const registradasSet = new Set(registradas())
    const esquecidas = [...todas.keys()].filter(k => !registradasSet.has(k))

    expect(esquecidas).toEqual([])
  })

  it('TODA rota registrada tem constante — nenhuma string mágica', () => {
    const todas = constantes()
    const semConstante = registradas().filter(k => !todas.has(k))

    expect(semConstante).toEqual([])
  })

  it('não há path repetido entre as constantes', () => {
    const paths = [...constantes().values()]

    expect(new Set(paths).size).toBe(paths.length)
  })

  it('TODO item do menu aponta para uma rota que EXISTE', () => {
    // Um menu que aponta para uma rota inexistente é um link morto com aparência de módulo.
    const paths = new Set(constantes().values())
    const mortos = [...noMenu()].filter(p => !paths.has(p))

    expect(mortos).toEqual([])
  })

  it('o menu tem 26 itens, todos distintos', () => {
    expect(noMenu().size).toBe(26)
  })
})

describe('as rotas que existem e NÃO estão no menu do produto', () => {
  it('são 13, e são conhecidas — não é um número que aparece por acidente', () => {
    // O §13:456 manda MAPEAR antes de remover. Este teste é o mapa: se uma rota sair do menu sem entrar
    // nesta lista, alguém a removeu sem decidir.
    const menu = noMenu()
    const todas = [...constantes().values()]
    const fora = todas.filter(p => !menu.has(p)).sort()

    expect(fora).toEqual([
      '/',
      '/agents',
    // r124: a tela do ambiente. Fica fora do menu porque o seletor de ambiente ainda nao filtra a barra.
    '/ambiente',
      '/artifacts',
      '/capabilities',
      '/command-center',
      '/crm',
      '/cron',
      '/messaging',
      '/profiles',
      '/session-import',
      '/settings',
      '/starmap',
      '/webhooks'
    ])
  })
})
