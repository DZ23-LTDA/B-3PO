// r6 da V6 — `hermes:dev:run` executa comando arbitrario, entao os testes negativos vem primeiro.
//
// O que cada caso protege:
//   - sem ator -> recusa ANTES de qualquer efeito (nem valida caminho);
//   - `cwd` relativo ou com `..` -> recusa (o comando rodaria fora da pasta escolhida);
//   - `cwd` inexistente -> recusa;
//   - `argv` vazio -> recusa;
//   - caminho feliz -> devolve exit code e separa saida de erro.
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, sep } from 'node:path'
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest'

import { registerDevRunIpc } from './dev-run-ipc'

type Chamavel = (event: unknown, payload?: unknown) => Promise<unknown>

function montar(ator: null | { id: string; kind: string; level: string; role: string }) {
  const handlers = new Map<string, Chamavel>()
  const ipcMain = { handle: (canal: string, f: Chamavel) => handlers.set(canal, f) } as never

  registerDevRunIpc(ipcMain, { actorOf: async () => ator as never })

  return handlers.get('hermes:dev:run')!
}

const DONO = { id: 'a1', kind: 'human', level: 'SUPERVISED_AUTONOMY', role: 'owner' }

let pasta = ''

beforeAll(async () => {
  pasta = await mkdtemp(join(tmpdir(), 'b3po-dev-run-'))
})

afterAll(async () => {
  await rm(pasta, { recursive: true, force: true })
})

describe('hermes:dev:run', () => {
  test('sem ator recusa antes de qualquer efeito', async () => {
    const canal = montar(null)

    const r = await canal(null, { argv: ['node', '-e', '1'], cwd: pasta })

    expect(r).toMatchObject({ error: 'sem_permissao' })
  })

  test('cwd relativo e recusado', async () => {
    const canal = montar(DONO)

    expect(await canal(null, { argv: [process.execPath, '-e', '1'], cwd: 'projects' })).toEqual({
      error: 'cwd_invalido'
    })
  })

  test('cwd com .. e recusado', async () => {
    const canal = montar(DONO)

    // String literal de proposito: `path.join` NORMALIZA o `..` fora, e o teste passaria a exercitar
    // um caminho sem `..` — foi o que travou a primeira versao (rodou `node` sem argumentos e ficou
    // no REPL). O que precisa ser testado e' o texto que chega.
    const comTravessia = `${pasta}${sep}..${sep}..`

    expect(await canal(null, { argv: [process.execPath, '-e', '1'], cwd: comTravessia })).toEqual({
      error: 'cwd_invalido'
    })
  })

  test('cwd inexistente e recusado', async () => {
    const canal = montar(DONO)

    expect(
      await canal(null, { argv: [process.execPath, '-e', '1'], cwd: join(pasta, 'nao-existe-xyz') })
    ).toEqual({ error: 'cwd_inexistente' })
  })

  test('argv vazio e recusado', async () => {
    const canal = montar(DONO)

    expect(await canal(null, { argv: [], cwd: pasta })).toEqual({ error: 'comando_obrigatorio' })
  })

  test('comando que passa devolve exit_code 0 e a saida', async () => {
    const canal = montar(DONO)

    const r = (await canal(null, {
      argv: [process.execPath, '-e', 'console.log("ok-dev-run")'],
      cwd: pasta
    })) as { exit_code: number; saida: string }

    expect(r.exit_code).toBe(0)
    expect(r.saida).toContain('ok-dev-run')
  })

  test('comando que falha devolve exit_code diferente de zero e o erro', async () => {
    const canal = montar(DONO)

    const r = (await canal(null, {
      argv: [process.execPath, '-e', 'console.error("falhou-dev-run"); process.exit(3)'],
      cwd: pasta
    })) as { exit_code: number; erro: string }

    expect(r.exit_code).toBe(3)
    expect(r.erro).toContain('falhou-dev-run')
  })

  test('argv com metacaractere de shell NAO e interpretado', async () => {
    const canal = montar(DONO)

    // `;` e `&&` sao argumentos literais porque nao ha shell: o processo tem de receber a string.
    const r = (await canal(null, {
      argv: [process.execPath, '-e', 'console.log(process.argv.slice(1).join(" "))', 'a;b && c'],
      cwd: pasta
    })) as { exit_code: number; saida: string }

    expect(r.exit_code).toBe(0)
    expect(r.saida).toContain('a;b && c')
  })
})
