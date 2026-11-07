// Gozo de férias — store (rodada 138).
//
// O que estes testes travam: período gozado não se repete, o último gozo alimenta `situacaoFerias`, e arquivo
// corrompido não derruba o RH.

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { situacaoFerias } from './hr-vacation'
import { hrVacationPath, openVacationStore } from './hr-vacation-store'

const DIA = 86_400_000
const utc = (iso: string) => Date.parse(`${iso}T00:00:00Z`)

let userData = ''

beforeEach(() => {
  userData = mkdtempSync(join(tmpdir(), 'b3po-ferias-'))
})

afterEach(() => {
  rmSync(userData, { force: true, recursive: true })
})

const entrada = (over: Record<string, unknown> = {}) => ({
  dias: 30,
  funcionario: 'ana',
  periodo_inicio: utc('2025-03-01'),
  ...over
})

describe('registrar', () => {
  it('grava e devolve o gozo', () => {
    const s = openVacationStore(userData)
    const r = s.registrar(entrada(), utc('2026-04-01'))

    expect(r.error).toBeUndefined()
    expect(r.gozo?.id).toMatch(/^fer_/)
    expect(s.listar()).toHaveLength(1)
  })

  it('recusa sem funcionario e com dias invalidos', () => {
    const s = openVacationStore(userData)

    expect(s.registrar(entrada({ funcionario: '  ' }))).toEqual({ error: 'funcionario_obrigatorio' })
    expect(s.registrar(entrada({ dias: 0 }))).toEqual({ error: 'dias_invalidos' })
    expect(s.registrar(entrada({ dias: -5 }))).toEqual({ error: 'dias_invalidos' })
  })

  it('recusa o MESMO periodo duas vezes', () => {
    // Um clique duplo registraria 60 dias e a situacao passaria a mentir a favor do colaborador.
    const s = openVacationStore(userData)

    s.registrar(entrada(), utc('2026-04-01'))

    expect(s.registrar(entrada(), utc('2026-04-01'))).toEqual({ error: 'periodo_ja_gozado' })
  })

  it('aceita periodos diferentes do mesmo funcionario', () => {
    const s = openVacationStore(userData)

    s.registrar(entrada(), utc('2025-04-01'))
    s.registrar(entrada({ periodo_inicio: utc('2026-03-01') }), utc('2026-04-01'))

    expect(s.listar()).toHaveLength(2)
  })

  it('trunca dias fracionados', () => {
    const s = openVacationStore(userData)

    expect(s.registrar(entrada({ dias: 12.7 }), utc('2026-04-01')).gozo?.dias).toBe(12)
  })
})

describe('listar', () => {
  it('filtra por funcionario', () => {
    const s = openVacationStore(userData)

    s.registrar(entrada(), utc('2025-04-01'))
    s.registrar(entrada({ funcionario: 'bruno' }), utc('2025-04-01'))

    expect(s.listar('ana')).toHaveLength(1)
    expect(s.listar('bruno')).toHaveLength(1)
    expect(s.listar()).toHaveLength(2)
  })

  it('ordena do periodo mais recente para o mais antigo', () => {
    const s = openVacationStore(userData)

    s.registrar(entrada({ periodo_inicio: utc('2024-03-01') }), utc('2025-04-01'))
    s.registrar(entrada({ periodo_inicio: utc('2025-03-01') }), utc('2026-04-01'))

    expect(s.listar().map(g => g.periodo_inicio)).toEqual([utc('2025-03-01'), utc('2024-03-01')])
  })

  it('sobrevive ao reabrir o store', () => {
    openVacationStore(userData).registrar(entrada(), utc('2026-04-01'))

    expect(openVacationStore(userData).listar()).toHaveLength(1)
  })

  it('arquivo corrompido nao derruba o RH', () => {
    mkdirSync(join(userData, 'b3po'), { recursive: true })
    writeFileSync(hrVacationPath(userData), '{ nao e json', 'utf8')

    expect(openVacationStore(userData).listar()).toEqual([])
  })
})

describe('remover', () => {
  it('remove pelo id', () => {
    const s = openVacationStore(userData)
    const r = s.registrar(entrada(), utc('2026-04-01'))

    expect(s.remover(r.gozo!.id)).toEqual({ removido: true })
    expect(s.listar()).toEqual([])
  })

  it('id inexistente devolve erro', () => {
    expect(openVacationStore(userData).remover('fer_nada')).toEqual({ error: 'gozo_nao_encontrado' })
  })
})

describe('ultimoGozo alimenta situacaoFerias', () => {
  it('sem gozo registrado, devolve undefined', () => {
    expect(openVacationStore(userData).ultimoGozo('ana')).toBeUndefined()
  })

  it('devolve o periodo AQUISITIVO mais recente, nao a data do lancamento', () => {
    const s = openVacationStore(userData)

    // Lancado depois, mas referente a periodo anterior.
    s.registrar(entrada({ periodo_inicio: utc('2024-03-01') }), utc('2026-01-01'))
    s.registrar(entrada({ periodo_inicio: utc('2025-03-01') }), utc('2026-02-01'))

    expect(s.ultimoGozo('ana')).toBe(utc('2025-03-01'))
  })

  it('a situacao deixa de ser indeterminada: com gozo, VENCIDA aparece', () => {
    // Esta e a razao de o store existir. Sem `ultimoGozo` a funcao nunca afirma `vencida`.
    const s = openVacationStore(userData)

    s.registrar(entrada({ periodo_inicio: utc('2024-03-01') }), utc('2025-04-01'))

    const admissao = utc('2024-03-01')
    const referencia = utc('2026-06-01')
    const ultimo = s.ultimoGozo('ana')

    expect(ultimo).toBe(utc('2024-03-01'))
    // Gozou o periodo que comecou em 2024-03. O pendente comeca ali: fecha em 2025-03 e o concessivo vai
    // ate 2026-02. Em 2026-06 ja passou - VENCIDA, e o alerta que dobra o valor finalmente sai.
    expect(situacaoFerias(admissao, referencia, 0, ultimo).situacao).toBe('vencida')

    // Logo apos o fim do pendente, dentro do concessivo: disponivel.
    expect(situacaoFerias(admissao, utc('2025-06-01'), 0, ultimo).situacao).toBe('disponivel')
  })
})
