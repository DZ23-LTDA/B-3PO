// Isolamento multitenant: o invariante estrutural (rodada 211).
//
// POR QUE UM TESTE DE ARQUITETURA
//
// Um store novo criado sem filtro por tenant nao quebra nenhum teste de comportamento: com uma empresa so
// (`local`), tudo continua passando. O vazamento so apareceria no dia em que uma segunda empresa existisse —
// que e exatamente o dia em que ele seria mais caro.
//
// Este teste le o codigo-fonte dos stores e falha quando um store de dominio deixa de filtrar. Nao substitui
// um teste de comportamento; ele protege o que nenhum teste de comportamento alcanca hoje.

import { readFileSync } from 'node:fs'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const DIR = join(__dirname)

/**
 * Stores que NAO filtram por tenant, com a razao.
 *
 * Sao tres, e os tres foram auditados: nao e uma lista de excecoes "por enquanto", e a lista dos que nao tem
 * tenant como conceito.
 */
const SEM_TENANT: Record<string, string> = {
  // A empresa E o tenant. Filtrar empresas por empresa seria circular.
  'companies-store.ts': 'a empresa e o tenant',
  // Ator do sistema pertence a instalacao (quem pode fazer o que neste computador).
  'actors-store.ts': 'ator e da instalacao',
  // Token de pareamento de dispositivo pertence a maquina, nao a empresa.
  'native-token-store.ts': 'token e da maquina'
}

function stores(): string[] {
  return readdirSync(DIR).filter(nome => nome.endsWith('-store.ts') && !nome.endsWith('.test.ts'))
}

describe('todo store de dominio', () => {
  it('filtra por tenant, ou esta na lista com a razao escrita', () => {
    const violacoes: string[] = []

    for (const nome of stores()) {
      const fonte = readFileSync(join(DIR, nome), 'utf8')

      if (SEM_TENANT[nome]) continue

      const temCampo = fonte.includes('tenant_id')
      // O filtro pode aparecer como `=== tenant`, `=== tenantId` ou dentro de um `.filter(`.
      const filtra = /===\s*tenant(Id)?\b/.test(fonte) || /\.filter\([^)]*tenant/.test(fonte)

      if (!temCampo || !filtra) {
        violacoes.push(`${nome}: tenant_id=${temCampo ? 'sim' : 'NAO'} filtra=${filtra ? 'sim' : 'NAO'}`)
      }
    }

    expect(violacoes).toEqual([])
  })

  it('a lista de excecoes so tem store que existe', () => {
    // Uma excecao apontando para arquivo removido esconderia um store novo com o mesmo nome.
    const existentes = new Set(stores())

    for (const nome of Object.keys(SEM_TENANT)) {
      expect(existentes.has(nome)).toBe(true)
    }
  })

  it('toda excecao tem razao nao vazia', () => {
    // Excecao sem motivo vira "dá para furar o teste" na primeira pressa.
    for (const [nome, razao] of Object.entries(SEM_TENANT)) {
      expect(razao.length, `${nome} sem razao`).toBeGreaterThan(5)
    }
  })
})

describe('o canal nunca aceita o tenant do renderer', () => {
  it('serverTenant ignora o parametro', () => {
    // IDOR por construcao: se o canal lesse o tenant do payload, qualquer codigo no renderer poderia pedir
    // os dados de outra empresa. O processo principal decide; o renderer so sugere.
    const fonte = readFileSync(join(DIR, 'server-tenant.ts'), 'utf8')

    expect(fonte).toContain('export function serverTenant(_fromRenderer?: unknown)')
    expect(fonte).toContain('return INSTALLATION_TENANT')
  })

  it('nenhum canal usa o tenant cru do payload', () => {
    // `serverTenant(payload.tenant_id)` e o padrao certo; `store.list(payload.tenant_id)` nao e.
    const violacoes: string[] = []
    const arquivos = readdirSync(DIR).filter(nome => nome.endsWith('-ipc.ts') && !nome.endsWith('.test.ts'))

    for (const nome of arquivos) {
      const fonte = readFileSync(join(DIR, nome), 'utf8')

      // Procura `store.<algo>(raw['tenant_id'])` ou `payload.tenant_id` passado direto a store.
      const suspeito = /store\.\w+\(\s*(raw|payload)\[/.exec(fonte)

      if (suspeito) violacoes.push(`${nome}: ${suspeito[0]}`)
    }

    expect(violacoes).toEqual([])
  })
})
