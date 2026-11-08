// r7 da V6 — a deteccao tem de ser HONESTA: reconhecer o que existe e devolver null quando nao sabe.
//
// O caso mais importante e' o ultimo: pasta sem runner reconhecivel -> `null`. Um comando adivinhado
// produziria falha, e a pessoa concluiria que o projeto esta' quebrado.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'

import { detectarProjeto } from './dev-detect'

let pasta = ''

beforeEach(async () => {
  pasta = await mkdtemp(join(tmpdir(), 'b3po-detect-'))
})

afterEach(async () => {
  await rm(pasta, { recursive: true, force: true })
})

async function escrever(nome: string, conteudo: string) {
  await writeFile(join(pasta, nome), conteudo, 'utf8')
}

describe('detectarProjeto', () => {
  test('pasta vazia nao inventa comando', async () => {
    expect(await detectarProjeto(pasta)).toEqual({ build: null, gerenciador: null, testes: null })
  })

  test('package.json com script test e build, sem lockfile -> npm', async () => {
    await escrever('package.json', JSON.stringify({ scripts: { test: 'vitest run', build: 'tsc' } }))

    const r = await detectarProjeto(pasta)

    expect(r.gerenciador).toBe('npm')
    expect(r.testes).toEqual({ argv: ['npm', 'test'], origem: 'package.json' })
    expect(r.build).toEqual({ argv: ['npm', 'run', 'build'], origem: 'package.json' })
  })

  test('pnpm-lock.yaml decide o gerenciador', async () => {
    await escrever('package.json', JSON.stringify({ scripts: { test: 'vitest' } }))
    await escrever('pnpm-lock.yaml', '')

    expect((await detectarProjeto(pasta)).testes?.argv).toEqual(['pnpm', 'test'])
  })

  test('yarn.lock decide o gerenciador', async () => {
    await escrever('package.json', JSON.stringify({ scripts: { test: 'vitest' } }))
    await escrever('yarn.lock', '')

    expect((await detectarProjeto(pasta)).testes?.argv).toEqual(['yarn', 'test'])
  })

  test('package.json SEM script test nao vira comando', async () => {
    await escrever('package.json', JSON.stringify({ scripts: { build: 'tsc' } }))

    const r = await detectarProjeto(pasta)

    expect(r.testes).toBeNull()
    expect(r.build?.argv).toEqual(['npm', 'run', 'build'])
  })

  test('package.json invalido nao derruba a deteccao', async () => {
    await escrever('package.json', '{ isto nao e json')

    const r = await detectarProjeto(pasta)

    expect(r.testes).toBeNull()
  })

  test('pyproject.toml -> pytest', async () => {
    await escrever('pyproject.toml', '[project]\nname = "x"\n')

    expect((await detectarProjeto(pasta)).testes?.argv).toEqual(['python', '-m', 'pytest'])
  })

  test('Cargo.toml -> cargo test e cargo build', async () => {
    await escrever('Cargo.toml', '[package]\nname = "x"\n')

    const r = await detectarProjeto(pasta)

    expect(r.testes?.argv).toEqual(['cargo', 'test'])
    expect(r.build?.argv).toEqual(['cargo', 'build'])
  })

  test('go.mod -> go test ./...', async () => {
    await escrever('go.mod', 'module x')

    expect((await detectarProjeto(pasta)).testes?.argv).toEqual(['go', 'test', './...'])
  })

  test('Makefile -> make test', async () => {
    await escrever('Makefile', 'test:\n\techo ok')

    expect((await detectarProjeto(pasta)).testes?.argv).toEqual(['make', 'test'])
  })

  test('package.json gigante nao e lido como manifesto', async () => {
    await mkdir(join(pasta, 'sub'), { recursive: true })
    await escrever('package.json', 'x'.repeat(1024 * 1024 + 10))

    // Sem runner reconhecivel porque o arquivo passou do limite: null, nao erro.
    expect(await detectarProjeto(pasta)).toEqual({ build: null, gerenciador: null, testes: null })
  })
})
