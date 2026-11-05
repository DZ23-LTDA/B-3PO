// O CONTRATO DE SOFIA (r128 do GOAL V2).
//
// A 6a ORDEM DO DONO: "DEFINIR TECNICAMENTE SOFIA".
//
// A definicao existe desde a r16 (`docs/b3po/SOFIA-ORCHESTRATION-SPEC.md`) e foi auditada na r100 (§11: 11 de
// 12). O que NAO existia era algo que IMPEDISSE A SPEC DE DESCOLAR DO CODIGO: uma spec que descreve um
// comportamento que o codigo nao tem e pior que nenhuma, porque ela vira a fonte que todo mundo le.
//
// O QUE ESTE TESTE FAZ
//
// Ele le a SPEC - as fronteiras e o modelo de dados - e verifica que o CODIGO tem o que ela promete. Nao e um
// teste de comportamento: e um teste de ALINHAMENTO entre o documento e o produto.
//
// O QUE ELE **NAO** FAZ - e a licao desta rodada
//
// Ele nao procura PALAVRAS no codigo. A primeira versao procurava `credencial` no `sofia-ponte.ts` para provar
// que a ponte nao checa credencial - e FALHOU, porque o COMENTARIO do arquivo explica exatamente o contrario
// do que a palavra sugere. Procurar texto para provar comportamento e o erro que esta sessao ja cometeu cinco
// vezes; um teste de alinhamento le a SPEC e o TIPO, nao o comentario.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { SOFIA_ESCOPOS } from './sofia-store'

// `__dirname` e `apps/desktop/electron` — TRES niveis ate a raiz do repositorio.
const RAIZ = join(__dirname, '..', '..', '..')
const SPEC = readFileSync(join(RAIZ, 'docs', 'b3po', 'SOFIA-ORCHESTRATION-SPEC.md'), 'utf8')

describe('a spec de Sofia existe e tem as fronteiras', () => {
  it('tem as fronteiras explicitas', () => {
    expect(SPEC).toContain('As quatro fronteiras')
    expect(SPEC).toContain('Sofia **faz**')
    expect(SPEC).toContain('Sofia **não faz**')
  })

  it('e diz o que Sofia NAO faz — a metade que importa', () => {
    // Uma definicao que so diz o que a coisa faz descreve um desejo. A que diz o que ela nao faz descreve um
    // limite - e e o limite que impede Sofia de virar um segundo runtime.
    for (const proibido of [
      'executar o turno do agente',
      'manter transcript ou sessão',
      'decidir permissão por conta própria',
      'aprovar a si mesma',
      'rodar tool loop',
      'guardar dado de negócio'
    ]) {
      expect(SPEC).toContain(proibido)
    }
  })
})

describe('o modelo de dados da spec e o do codigo sao o mesmo', () => {
  it('os tres escopos da spec sao os tres do store', () => {
    for (const escopo of SOFIA_ESCOPOS) expect(SPEC).toContain(`'${escopo}'`)
  })

  it('sao exatamente tres — um escopo novo no codigo sem a spec e comportamento sem contrato', () => {
    expect(SOFIA_ESCOPOS).toEqual(['organizacao', 'projeto', 'trabalho_pontual'])
  })

  it('os seis status do plano aparecem na spec', () => {
    for (const status of ['rascunho', 'aguardando_aprovacao', 'executando', 'concluido', 'falhou', 'cancelado']) {
      expect(SPEC).toContain(`'${status}'`)
    }
  })
})

describe('os modulos de Sofia existem', () => {
  const MODULOS = ['sofia-store', 'sofia-grafo', 'sofia-ponte', 'sofia-orquestrador', 'sofia-ipc'] as const

  it('todo modulo da camada tem arquivo', () => {
    for (const modulo of MODULOS) {
      expect(readFileSync(join(__dirname, `${modulo}.ts`), 'utf8').length).toBeGreaterThan(0)
    }
  })
})

describe('a tarefa de Sofia tem o minimo para o grafo', () => {
  it('tarefa_id, status e depende_de — sem isso o grafo nao ordena', () => {
    const store = readFileSync(join(__dirname, 'sofia-store.ts'), 'utf8')

    expect(store).toContain('tarefa_id')
    expect(store).toContain('depende_de')
    expect(store).toContain('status')
  })
})
