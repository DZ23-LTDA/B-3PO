import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { listarBackups, restaurarBackup } from './backup-restore'
import { backupRotativo } from './store-backup'

/**
 * O restore é a metade perigosa do backup: ele **sobrescreve dado de negócio**. Três garantias precisam
 * ser verdade, e este arquivo as exercita uma por uma.
 *
 * 1. O estado atual vira mais uma versão antes da troca — **restore é reversível**.
 * 2. Uma versão que não é JSON válido é **recusada**: trocar dado bom por lixo é pior que não restaurar.
 * 3. Um pedido não alcança arquivo de outro store nem caminho fora da pasta de dados.
 */
describe('restaurarBackup', () => {
  let dir: string
  let arquivo: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'b3po-restore-'))
    arquivo = join(dir, 'inventory.json')
    // A primeira escrita não tem o que copiar, então o backup não cria a pasta. Os testes que injetam
    // uma versão à mão precisam dela antes.
    await mkdir(join(dir, 'backups'), { recursive: true })
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  /** Grava o arquivo e faz um backup do estado anterior — o mesmo caminho que os stores usam. */
  async function escrever(conteudo: string) {
    await backupRotativo(arquivo)
    await writeFile(arquivo, conteudo, 'utf8')
    // o mtime define a ordem das versões; sem isto duas versões no mesmo ms empatam
    await new Promise(r => setTimeout(r, 20))
  }

  async function versoes() {
    return (await listarBackups(dir)).find(a => a.nome === 'inventory.json')?.versoes ?? []
  }

  it('lista os arquivos que têm versões, sem os que não têm', async () => {
    await escrever('{"v":1}')
    await escrever('{"v":2}')
    await writeFile(join(dir, 'outro.json'), '{"x":1}', 'utf8')

    const lista = await listarBackups(dir)

    expect(lista.map(a => a.nome)).toEqual(['inventory.json'])
    expect(lista[0]!.versoes.length).toBeGreaterThan(0)
    // mais recente primeiro
    expect(lista[0]!.versoes[0]!.quando).toBeGreaterThanOrEqual(lista[0]!.versoes.at(-1)!.quando)
  })

  it('restaura o conteudo de uma versao', async () => {
    await escrever('{"v":1}')
    await escrever('{"v":2}')

    const alvo = (await versoes()).find(v => v.arquivo.includes('inventory.'))!

    const r = await restaurarBackup(dir, 'inventory.json', alvo.arquivo)

    expect(r.ok).toBe(true)

    if (!r.ok) return

    expect(JSON.parse(await readFile(arquivo, 'utf8'))).toEqual({ v: 1 })
  })

  it('o restore e REVERSIVEL: o estado atual vira mais uma versao', async () => {
    await escrever('{"v":1}')
    await escrever('{"v":2}')

    const antes = (await versoes()).length
    const alvo = (await versoes()).find(v => v.arquivo.includes('inventory.'))!

    await restaurarBackup(dir, 'inventory.json', alvo.arquivo)

    // ganhou uma versão (a do estado que foi sobrescrito)
    const depois = await versoes()

    expect(depois.length).toBe(antes + 1)

    // e uma delas contém o estado que estava lá antes do restore
    const conteudos = await Promise.all(
      depois.map(async v => JSON.parse(await readFile(join(dir, 'backups', v.arquivo), 'utf8')))
    )

    expect(conteudos).toContainEqual({ v: 2 })
  })

  it('recusa versao que nao e JSON valido', async () => {
    await escrever('{"v":1}')

    // injeta uma versão corrompida à mão
    await writeFile(join(dir, 'backups', 'inventory.999.json'), 'isto nao e json', 'utf8')

    const r = await restaurarBackup(dir, 'inventory.json', 'inventory.999.json')

    expect(r.ok).toBe(false)

    expect('error' in r ? r.error : 'sem_erro').toBe('versao_corrompida')
    // e o arquivo de trabalho continua intacto
    expect(JSON.parse(await readFile(arquivo, 'utf8'))).toEqual({ v: 1 })
  })

  it('recusa versao que pertence a OUTRO arquivo', async () => {
    await escrever('{"v":1}')
    await writeFile(join(dir, 'backups', 'sales.123.json'), '{"s":1}', 'utf8')

    const r = await restaurarBackup(dir, 'inventory.json', 'sales.123.json')

    expect(r.ok).toBe(false)

    expect('error' in r ? r.error : 'sem_erro').toBe('versao_de_outro_arquivo')
  })

  it('recusa caminho com separador ou ..', async () => {
    expect((await restaurarBackup(dir, '../inventory.json', 'inventory.1.json')).ok).toBe(false)
    expect((await restaurarBackup(dir, 'sub/inventory.json', 'inventory.1.json')).ok).toBe(false)
    expect((await restaurarBackup(dir, 'inventory.json', '../inventory.1.json')).ok).toBe(false)
    expect((await restaurarBackup(dir, 'inventory.json', 'sales/../inventory.1.json')).ok).toBe(false)
  })

  it('recusa arquivo que nao termina em .json', async () => {
    const r = await restaurarBackup(dir, 'inventory.txt', 'inventory.1.json')

    expect(r.ok).toBe(false)

    expect('error' in r ? r.error : 'sem_erro').toBe('arquivo_invalido')
  })

  it('versao inexistente e erro, nao crash', async () => {
    await escrever('{"v":1}')

    const r = await restaurarBackup(dir, 'inventory.json', 'inventory.000.json')

    expect(r.ok).toBe(false)

    expect('error' in r ? r.error : 'sem_erro').toBe('versao_nao_encontrada')
  })

  it('o backup rotativo mantem o restore seguro com o cap de versoes', async () => {
    // 8 escritas -> 5 versoes (cap). Restaurar a mais antiga disponivel tem de funcionar.
    for (let i = 0; i < 8; i++) {
      await escrever(`{"v":${i}}`)
    }

    const vs = await versoes()

    expect(vs.length).toBeLessThanOrEqual(5)

    const r = await restaurarBackup(dir, 'inventory.json', vs.at(-1)!.arquivo)

    expect(r.ok).toBe(true)
    expect(await readdir(join(dir, 'backups'))).toBeTruthy()
  })
})
