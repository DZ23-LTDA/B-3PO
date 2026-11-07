// Cobertura de permissao nos canais IPC (rodada 214).
//
// O PROBLEMA
//
// `permission-guard.ts` diz, no proprio cabecalho:
//
//   "Sem isto, `rbac.ts` e uma politica que ninguem consulta - permissao que nao decide nada."
//
// A medicao de hoje (r80): **33 de 49 canais** consultam a guarda (os tres padroes: `exigirAtor`,
// leem sem verificar permissao.
//
// POR QUE UM RATCHET E NAO UMA CORRECAO
//
// Envolver 38 canais de uma vez significaria ligar autorizacao sem sujeito: hoje o produto nao tem login, e
// `actorOf()` devolve o dono da instalacao. Uma guarda que sempre permite e pior que guarda nenhuma, porque
// parece protecao.
//
// Entao o que este teste faz e **congelar a divida**: a lista dos que nao tem guarda nao pode CRESCER. Cada
// canal novo nasce com guarda ou entra aqui com o numero subindo na revisao - nunca em silencio.

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const DIR = join(__dirname)

/**
 * Canais que NAO consultam permissao, medidos na rodada 214.
 *
 * Esta lista e a divida. Ela pode encolher livremente; crescer exige justificativa escrita no commit.
 */
const SEM_GUARDA: readonly string[] = [
  'challenge-window-ipc.ts',
  'clipboard-ipc.ts',
  'hud-ipc.ts',
  'lookup-ipc.ts',
  'mcp-oauth-callback-ipc.ts',
  'notification-ipc.ts',
  'pet-overlay-ipc.ts',
  'spellcheck-dictionary-ipc.ts',
  'startup-latency-ipc.ts',
]

/**
 * r6 do V4 — a unidade passa a ser **canal registrado**, não arquivo.
 *
 * O DEFEITO QUE ISTO CORRIGE
 *
 * A régua contava todo `*-ipc.ts` como dívida. Dois deles **não registram canal nenhum**:
 * `erp-ipc.ts` só fia stores (0 `handle`) e `ui-preferences-ipc.ts` delega a
 * `registerUiPreferencesIpc` em outro módulo. Contar arquivo inflava a dívida de 14 para 16 e —
 * pior — um arquivo de fiação aparecia como "canal sem guarda", que é uma acusação sem objeto.
 *
 * **Ponto cego que continua aberto, e fica declarado**: os canais de `ui-preferences-ipc.ts` vivem
 * em `ui-preferences.ts`, que **não** é `*-ipc.ts` e portanto **não é varrido por esta régua**. Fechar
 * isso exige varrer o grafo de delegação; não foi feito aqui, e omitir seria pior. (r6 do V4)
 */
function canais(): string[] {
  return readdirSync(DIR).filter(
    nome => nome.endsWith('-ipc.ts') && !nome.endsWith('.test.ts') && registraCanal(nome)
  )
}

/** O arquivo registra canal DIRETO? Fiação e delegação não contam como dívida. */
function registraCanal(nome: string): boolean {
  return /\.handle\(|ipcMain\.handle\(/.test(readFileSync(join(DIR, nome), 'utf8'))
}

function temGuarda(nome: string): boolean {
  const fonte = readFileSync(join(DIR, nome), 'utf8')

  // `exigirAtor` e o helper dos canais de dominio (r216). Nao reconhece-lo faria o ratchet mentir.
  /*
   * r7 do V4 — `podeOperarMaquina` entra na lista.
   *
   * `git-ipc.ts` NAO usa `exigirAtor`/`withPermission`: ele usa a **fronteira de acesso a maquina**
   * (`machine-access.ts`), que e uma politica diferente e correta para o que protege — "esta pessoa
   * pode operar o computador onde o B-3PO esta instalado?", nao "pode lancar no financeiro?".
   *
   * Ela nega por padrao (sem ator, sem decisao), exige poder de execucao para `escrita` e exige
   * papel `owner` para `externo` (push, PR). Sao **21 canais** que o ratchet contava como divida
   * sem estarem desprotegidos.
   */
  return (
    fonte.includes('withPermission') ||
    fonte.includes('guardedHandler') ||
    fonte.includes('exigirAtor') ||
    fonte.includes('podeOperarMaquina')
  )
}

describe('cobertura de permissao', () => {
  it('a divida nao cresce: nenhum canal novo nasce sem guarda', () => {
    const conhecidos = new Set(SEM_GUARDA)
    const novos = canais().filter(nome => !temGuarda(nome) && !conhecidos.has(nome))

    expect(novos, 'canal novo sem withPermission — passe pela guarda ou justifique no commit').toEqual([])
  })

  it('a lista nao mente: todo nome listado realmente nao tem guarda', () => {
    // Se alguem envolver um canal e esquecer de tirar da lista, o numero fica pior que a realidade.
    const mentirosos = SEM_GUARDA.filter(nome => {
      try {
        return temGuarda(nome)
      } catch {
        return false
      }
    })

    expect(mentirosos, 'canal ja tem guarda mas continua na divida — remova da lista').toEqual([])
  })

  it('a lista so tem arquivo que existe', () => {
    const existentes = new Set(canais())

    expect(SEM_GUARDA.filter(nome => !existentes.has(nome))).toEqual([])
  })

  it('os canais que decidem permissao continuam decidindo', () => {
    // Os dois unicos que aplicam. Se um deles perder a guarda, o produto fica sem nenhuma autorizacao.
    expect(temGuarda('admin-ipc.ts')).toBe(true)
    expect(temGuarda('sales-ipc.ts')).toBe(true)
    expect(temGuarda('finance-ipc.ts')).toBe(true)
    expect(temGuarda('inventory-ipc.ts')).toBe(true)
    expect(temGuarda('crm-contacts-ipc.ts')).toBe(true)
    expect(temGuarda('crm-pipeline-ipc.ts')).toBe(true)
    expect(temGuarda('crm-tasks-ipc.ts')).toBe(true)
    expect(temGuarda('crm-conversations-ipc.ts')).toBe(true)
    expect(temGuarda('hr-ipc.ts')).toBe(true)
    expect(temGuarda('purchases-ipc.ts')).toBe(true)
    expect(temGuarda('catalog-ipc.ts')).toBe(true)
    expect(temGuarda('companies-ipc.ts')).toBe(true)
    expect(temGuarda('services-ipc.ts')).toBe(true)
    expect(temGuarda('documents-ipc.ts')).toBe(true)
    expect(temGuarda('scheduling-ipc.ts')).toBe(true)
  })

it('a divida medida hoje e 9 de 48 — git, terminal e fs usam podeOperarMaquina', () => {
    /*
     * r6 do V4 — o numero encolheu de 16/50 para 14/48, e NAO por correcao de canal nenhum.
     *
     * `erp-ipc.ts` e `ui-preferences-ipc.ts` nao registram canal: o primeiro fia stores, o segundo
     * delega a `registerUiPreferencesIpc`. Eles apareciam como "canal sem guarda" sem ter canal —
     * uma acusacao sem objeto que inflava a divida em 2 e o denominador em 2.
     *
     * O denominador cai junto (50 -> 48) porque a unidade agora e **arquivo que registra canal**.
     * A divida em CANAIS e outra conta e esta em RISKS.md R3: 68 canais nos 14 arquivos, sendo
     * 49 em 5 arquivos sensiveis (git 21, fs 13, terminal 6, agent 5, plugin-files 4).
     *
     * Numero congelado de proposito: muda-lo e uma decisao consciente, nao um efeito colateral.
     */
    expect(SEM_GUARDA).toHaveLength(9)

    // r36: audit-ipc.ts nasceu COM guarda. r58: delivery-ipc.ts idem. O total sobe, a divida nao.
    expect(canais()).toHaveLength(48)
  })
})
