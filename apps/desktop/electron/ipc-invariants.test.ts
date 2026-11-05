// Invariantes estruturais dos canais IPC (r31 do GOAL V2).
//
// O BUG QUE ESTE TESTE IMPEDE
//
// A r30 descobriu que `purchases-ipc.ts` tinha **10 cópias** de dois canais (`definirLimite` e
// `limite`). A duplicação nasceu na r27 e foi **commitada duas vezes** — e nenhuma verificação pegou:
//
//   typecheck      valida SINTAXE; 10 handlers idênticos compilam
//   gate           não inspeciona contagem de handlers
//   testes         `registra exatamente os canais` compara a LISTA, não a QUANTIDADE
//
// O efeito em produção: `ipcMain.handle` para o mesmo canal N vezes — **a última vence**. O
// comportamento seria correto e o custo invisível, até alguém mudar **uma** das cópias.
//
// O QUE ELE VERIFICA
//
//   1. Nenhum canal aparece duas vezes no mesmo arquivo
//   2. Nenhum canal aparece em DOIS arquivos diferentes
//
// A segunda é mais grave que a primeira: dois `ipcMain.handle` para o mesmo canal em arquivos distintos
// significa que **a ordem de import decide qual vence** — e ordem de import não é contrato.

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const DIR = join(__dirname)

/** Todo `ipcMain.handle('canal', ...)` do diretório, com o arquivo de origem. */
function canaisPorArquivo(): Map<string, string[]> {
  const mapa = new Map<string, string[]>()

  for (const nome of readdirSync(DIR)) {
    if (!nome.endsWith('.ts') || nome.endsWith('.test.ts')) continue

    const fonte = readFileSync(join(DIR, nome), 'utf8')
    const encontrados: string[] = []

    // Aceita `ipcMain.handle('x'` e `ipcMain.handle(\n  'x'` — o segundo é o formato multilinha.
    for (const m of fonte.matchAll(/ipcMain\.handle\(\s*'([^']+)'/g)) {
      if (m[1]) encontrados.push(m[1])
    }

    if (encontrados.length > 0) mapa.set(nome, encontrados)
  }

  return mapa
}

describe('invariantes dos canais IPC', () => {
  const canais = canaisPorArquivo()

  it('há canais registrados (o detector não pode passar por vacuidade)', () => {
    // Sem isto, um erro no regex faria todos os testes abaixo passarem sem verificar nada.
    const total = [...canais.values()].reduce((soma, lista) => soma + lista.length, 0)

    expect(canais.size).toBeGreaterThan(20)
    expect(total).toBeGreaterThan(100)
  })

  it('nenhum canal aparece duas vezes no MESMO arquivo', () => {
    const problemas: string[] = []

    for (const [arquivo, lista] of canais) {
      const contagem = new Map<string, number>()

      for (const canal of lista) contagem.set(canal, (contagem.get(canal) ?? 0) + 1)

      for (const [canal, n] of contagem) {
        if (n > 1) problemas.push(`${arquivo}: '${canal}' registrado ${n} vezes`)
      }
    }

    // Esta é a asserção que a r30 precisava. `ipcMain.handle` duplicado não quebra o typecheck.
    expect(problemas, `canais duplicados no mesmo arquivo:\n${problemas.join('\n')}`).toEqual([])
  })

  it('nenhum canal aparece em DOIS arquivos diferentes', () => {
    const dono = new Map<string, string[]>()
    const problemas: string[] = []

    for (const [arquivo, lista] of canais) {
      for (const canal of new Set(lista)) {
        const lista_ = dono.get(canal) ?? []

        lista_.push(arquivo)
        dono.set(canal, lista_)
      }
    }

    for (const [canal, arquivos] of dono) {
      // Dois handlers para o mesmo canal em arquivos distintos: a ORDEM DE IMPORT decide qual vence,
      // e ordem de import não é contrato.
      if (arquivos.length > 1) problemas.push(`'${canal}' em ${arquivos.join(' + ')}`)
    }

    expect(problemas, `canais registrados em mais de um arquivo:\n${problemas.join('\n')}`).toEqual([])
  })

  it('o nome do arquivo `-ipc.ts` implica handler: arquivo sem canal é nome que mente', () => {
    // A r26 renomeou `purchase-approval-ipc.ts` → `-decision.ts` exatamente por isto: o nome prometia
    // uma porta que não existia. Este teste impede que o erro volte.
    //
    // DUAS EXCEÇÕES, e cada uma diz por que — uma exceção silenciosa é um buraco invisível:
    //
    //   erp-ipc.ts            é a MONTAGEM: chama 23 `registerXxxIpc` e não registra canal próprio.
    //                         O nome é herdado e o papel é legítimo; renomear mexeria em 23 imports.
    //   ui-preferences-ipc.ts é um ADAPTADOR: recebe `hermesHome` e delega para `ui-preferences.ts`,
    //                         que é quem tem os handlers.
    const MONTAGEM_OU_ADAPTADOR = new Set(['erp-ipc.ts', 'ui-preferences-ipc.ts'])

    const mentirosos = readdirSync(DIR)
      .filter(nome => nome.endsWith('-ipc.ts') && !nome.endsWith('.test.ts'))
      .filter(nome => !MONTAGEM_OU_ADAPTADOR.has(nome))
      .filter(nome => !(canais.get(nome)?.length))

    expect(mentirosos, `arquivos -ipc.ts sem nenhum ipcMain.handle: ${mentirosos.join(', ')}`).toEqual([])
  })
})

// ─── r32: a mesma invariante onde o padrão do bug também se aplica ────────────────────────────────
//
// A r30 encontrou 10 cópias de dois canais em `purchases-ipc.ts`. A r31 criou a guarda para arquivos
// `-ipc.ts`. Esta rodada estende para os dois lugares onde o mesmo script poderia ter causado o mesmo
// dano — e **mede o estado atual**, não só previne.

describe('invariantes de main.ts', () => {
  it('nenhum canal registrado duas vezes', () => {
    const fonte = readFileSync(join(DIR, 'main.ts'), 'utf8')
    const canais: string[] = []

    for (const m of fonte.matchAll(/ipcMain\.handle\(\s*'([^']+)'/g)) {
      if (m[1]) canais.push(m[1])
    }

    // Sem esta guarda, um regex errado passaria por vacuidade.
    expect(canais.length).toBeGreaterThan(50)

    const contagem = new Map<string, number>()

    for (const canal of canais) contagem.set(canal, (contagem.get(canal) ?? 0) + 1)

    const problemas = [...contagem.entries()].filter(([, n]) => n > 1).map(([canal, n]) => `${canal} x${n}`)

    expect(problemas, `canais duplicados em main.ts:\n${problemas.join('\n')}`).toEqual([])
  })
})

describe('invariantes dos stores', () => {
  /**
   * Métodos de instância declarados no corpo da classe.
   *
   * O padrão `^  async nome(` / `^  nome(` casa métodos de classe e **não** casa funções de módulo
   * (que ficam na coluna 0) nem métodos privados (`private async`), que são internos e podem ter
   * nomes repetidos em classes diferentes.
   */
  function metodosPublicos(fonte: string): string[] {
    const nomes: string[] = []

    for (const m of fonte.matchAll(/^ {2}(?:async )?([a-zA-Z_]\w*)\s*(?:<[^>]*>)?\(/gm)) {
      const nome = m[1]

      if (nome && !['catch', 'constructor', 'for', 'if', 'switch', 'while'].includes(nome)) nomes.push(nome)
    }

    return nomes
  }

  it('nenhum store declara o mesmo método público duas vezes', () => {
    const problemas: string[] = []

    for (const nome of readdirSync(DIR)) {
      if (!nome.endsWith('-store.ts') || nome.endsWith('.test.ts')) continue

      const lista = metodosPublicos(readFileSync(join(DIR, nome), 'utf8'))
      const contagem = new Map<string, number>()

      for (const m of lista) contagem.set(m, (contagem.get(m) ?? 0) + 1)

      for (const [metodo, n] of contagem) {
        if (n > 1) problemas.push(`${nome}: ${metodo}() declarado ${n} vezes`)
      }
    }

    expect(problemas, `métodos duplicados em stores:\n${problemas.join('\n')}`).toEqual([])
  })

  it('o detector de métodos encontra algo (não passa por vacuidade)', () => {
    // Se o regex parar de casar, o teste acima passa sem verificar nada. Este mede o detector.
    const amostra = metodosPublicos(readFileSync(join(DIR, 'finance-store.ts'), 'utf8'))

    expect(amostra.length).toBeGreaterThan(2)
  })
})
