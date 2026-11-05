// O menu dos módulos existe e aponta para rotas que existem (rodada 96).
//
// POR QUE ESTE TESTE É DIFERENTE DOS DE ROTA
//
// `routes.test.ts` prova que uma rota resolve. Não prova que alguém chega nela. A navegação é populada
// por contribuições `SIDEBAR_NAV_AREA`, não por `APP_ROUTES` — medido antes desta rodada, havia duas no
// código inteiro (kanban e uma de teste), e nenhuma tela do produto tinha item de menu.
//
// Este teste liga as duas pontas: cada path do menu tem que existir em `APP_ROUTES`, e os módulos do
// produto têm que estar no menu.

import { describe, expect, it, vi } from 'vitest'

import { APP_ROUTES } from '@/app/routes'
import b3poNavPlugin from './plugin'

interface Contribuicao {
  area: string
  data: { codicon: string; label: string; path: string }
  id: string
  order: number
}

function contribuicoes(): Contribuicao[] {
  const vistas: Contribuicao[] = []

  b3poNavPlugin.register({
    registerMany: (itens: Contribuicao[]) => {
      vistas.push(...itens)
    }
  } as never)

  return vistas
}

describe('menu dos módulos', () => {
  it('registra na area da navegacao lateral', () => {
    const itens = contribuicoes()

    expect(itens.length).toBeGreaterThan(10)
    expect(itens.every(i => i.area === 'sidebar.nav')).toBe(true)
  })

  it('todo path do menu resolve numa rota registrada', () => {
    // É a asserção que faltava: um menu apontando para path inexistente levaria a tela em branco.
    const paths = new Set<string>(APP_ROUTES.map(r => r.path))

    for (const item of contribuicoes()) {
      expect(paths.has(item.data.path), `menu aponta para ${item.data.path}, que não é rota`).toBe(true)
    }
  })

  it('os modulos do produto estao no menu', () => {
    const paths = contribuicoes().map(i => i.data.path)

    for (const esperado of [
      '/painel',
      '/products',
      '/stock',
      '/sales',
      '/finance',
      '/agenda',
      '/compras',
      '/empresa',
      '/servicos',
      '/rh',
      '/atendimento',
      '/posvenda',
      '/marketing',
      '/automacoes',
      '/documentos',
      '/privacidade'
    ]) {
      expect(paths, `${esperado} não aparece no menu`).toContain(esperado)
    }
  })

  it('cada item tem rotulo e icone: um menu sem texto nao e menu', () => {
    for (const item of contribuicoes()) {
      expect(item.data.label.length, item.id).toBeGreaterThan(1)
      expect(item.data.codicon.length, item.id).toBeGreaterThan(1)
    }
  })

  it('todo icone existe no conjunto de codicons', async () => {
    // A captura da r97 mostrou Compras, Financeiro e Empresa SEM icone: cart, wallet e building nao
    // existem. Um nome invalido nao quebra nada - o item so fica desalinhado -, entao so a tela mostrava.
    // Este teste le a folha de icones de verdade, em vez de confiar na lista que eu escrevi de memoria.
    const { readFile } = await import('node:fs/promises')
    const css = await readFile('../../node_modules/@vscode/codicons/dist/codicon.css', 'utf8')

    for (const item of contribuicoes()) {
      const seletor = '.codicon-' + item.data.codicon + ':before'

      expect(css.includes(seletor), 'icone invalido: ' + item.data.codicon).toBe(true)
    }
  })

  it('nao repete um item que o menu do nucleo ja tem', () => {
    // A captura da r97 mostrou "CRM" duas vezes: o menu do nucleo (junto de Capacidades, Mensageria,
    // Artefatos e Tarefas agendadas) ja contribui com /crm, e o plugin contribuia de novo. Dois itens
    // para o mesmo destino confundem, e o usuario foi quem viu - nao o teste.
    const paths = contribuicoes().map(i => i.data.path)

    for (const doNucleo of ['/crm']) {
      expect(paths, doNucleo + ' ja vem do menu do nucleo').not.toContain(doNucleo)
    }
  })

  it('nao ha path repetido', () => {
    const paths = contribuicoes().map(i => i.data.path)

    expect(new Set(paths).size).toBe(paths.length)
  })

  it('o plugin vem ligado: um menu que o usuario precisa ativar nao e menu', () => {
    expect(b3poNavPlugin.defaultEnabled).toBe(true)
  })

  it('registrar duas vezes nao lanca', () => {
    expect(() => {
      b3poNavPlugin.register({ registerMany: vi.fn() } as never)
      b3poNavPlugin.register({ registerMany: vi.fn() } as never)
    }).not.toThrow()
  })
})
describe('ordem do menu (r15 do GOAL V2)', () => {
  it('Empresa vem logo depois de Painel, nao no fim', () => {
    const paths = contribuicoes().map(i => i.data.path)

    // O proprietario reportou: "a criacao da empresa esta misturada com os demais". Empresa estava na
    // 17a e ultima posicao, logo depois de Privacidade e Documentos - tres coisas sem relacao.
    //
    // Empresa e o cadastro que da contexto aos outros modulos (moeda, fuso, imposto). Vem antes deles.
    expect(paths[0]).toBe('/painel')
    expect(paths[1]).toBe('/empresa')

    // E nao esta mais no fim.
    expect(paths[paths.length - 1]).not.toBe('/empresa')
  })

  it('Empresa nao esta entre Documentos e Privacidade', () => {
    const paths = contribuicoes().map(i => i.data.path)
    const empresa = paths.indexOf('/empresa')
    const documentos = paths.indexOf('/documentos')
    const privacidade = paths.indexOf('/privacidade')

    // A ordenacao antiga colocava os tres no mesmo bloco final.
    const noBlocoFinal = empresa > documentos && empresa > privacidade
    expect(noBlocoFinal).toBe(false)
  })

  it('o menu tem exatamente os 20 modulos, sem duplicata e sem buraco', () => {
    const paths = contribuicoes().map(i => i.data.path)

    expect(paths).toHaveLength(20)
    expect(new Set(paths).size).toBe(20)
  })

  it('os itens de operacao mantem a ordem relativa', () => {
    const paths = contribuicoes().map(i => i.data.path)

    // O bloco comercial continua na ordem em que a operacao acontece.
    expect(paths.indexOf('/products')).toBeLessThan(paths.indexOf('/stock'))
    expect(paths.indexOf('/stock')).toBeLessThan(paths.indexOf('/compras'))
    expect(paths.indexOf('/compras')).toBeLessThan(paths.indexOf('/sales'))
    expect(paths.indexOf('/sales')).toBeLessThan(paths.indexOf('/finance'))
  })
})