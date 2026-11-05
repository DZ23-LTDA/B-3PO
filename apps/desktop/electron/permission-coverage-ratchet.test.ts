// Cobertura de permissao nos canais IPC (rodada 214).
//
// O PROBLEMA
//
// `permission-guard.ts` diz, no proprio cabecalho:
//
//   "Sem isto, `rbac.ts` e uma politica que ninguem consulta - permissao que nao decide nada."
//
// A medicao de hoje: **2 de 40 canais** consultam a guarda (`admin-ipc`, `sales-ipc`). Os outros 38 gravam e
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
  'after-sales-ipc.ts',
  'agent-ipc.ts',
  'analytics-ipc.ts',
  'automation-ipc.ts',
  'catalog-ipc.ts',
  'challenge-window-ipc.ts',
  'clipboard-ipc.ts',
  'companies-ipc.ts',

  'documents-ipc.ts',
  'erp-ipc.ts',
  'fiscal-ipc.ts',
  'fs-ipc.ts',
  'git-ipc.ts',
  'hud-ipc.ts',
  'lookup-ipc.ts',
  'marketing-ipc.ts',
  'mcp-oauth-callback-ipc.ts',
  'notification-ipc.ts',
  'pet-overlay-ipc.ts',
  'plugin-files-ipc.ts',
  'privacy-ipc.ts',
  'purchases-ipc.ts',
  'scheduling-block-ipc.ts',
  'scheduling-catalog-ipc.ts',
  'scheduling-ipc.ts',
  'service-desk-ipc.ts',
  'services-ipc.ts',
  'spellcheck-dictionary-ipc.ts',
  'startup-latency-ipc.ts',
  'terminal-ipc.ts',
  'ui-preferences-ipc.ts'
]

function canais(): string[] {
  return readdirSync(DIR).filter(nome => nome.endsWith('-ipc.ts') && !nome.endsWith('.test.ts'))
}

function temGuarda(nome: string): boolean {
  const fonte = readFileSync(join(DIR, nome), 'utf8')

  // `exigirAtor` e o helper dos canais de dominio (r216). Nao reconhece-lo faria o ratchet mentir.
  return fonte.includes('withPermission') || fonte.includes('guardedHandler') || fonte.includes('exigirAtor')
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
  })

  it('a divida medida hoje e 31 de 40', () => {
    // Numero congelado de proposito: muda-lo e uma decisao consciente, nao um efeito colateral.
    expect(SEM_GUARDA).toHaveLength(31)
    expect(canais()).toHaveLength(40)
  })
})
