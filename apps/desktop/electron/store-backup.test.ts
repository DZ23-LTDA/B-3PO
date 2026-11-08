import { mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { backupDirFor, backupRotativo, MAX_VERSOES } from './store-backup'

/**
 * O backup tem UM dever: existir quando o dado é sobrescrito.
 *
 * A r70 mediu que os 14 JSON de negócio estavam em `%APPDATA%/B-3PO/b3po/` com **zero backup** — a
 * escrita é atômica (`tmp` + `rename`), mas isso protege só contra o arquivo *meio escrito*; a próxima
 * escrita sobrescreve o anterior, e os parsers **descartam o inválido em vez de falhar**. A perda
 * podia passar silenciosa.
 *
 * Estes testes cobrem as três coisas que precisam ser verdade: (1) o arquivo anterior é preservado,
 * (2) a rotação respeita o limite, (3) um backup que falha NÃO impede a escrita do dado.
 */
describe('backupRotativo', () => {
  let dir: string
  let arquivo: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'b3po-backup-'))
    arquivo = join(dir, 'dados.json')
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('copia o arquivo anterior para backups/ com timestamp no nome', async () => {
    await writeFile(arquivo, '{"v":1}', 'utf8')

    await backupRotativo(arquivo)

    const versoes = await readdir(backupDirFor(arquivo))

    expect(versoes).toHaveLength(1)
    expect(versoes[0]).toMatch(/^dados\.\d+\.json$/)
    expect(await readFile(join(backupDirFor(arquivo), versoes[0]), 'utf8')).toBe('{"v":1}')
  })

  it('nao faz nada quando o arquivo ainda nao existe (primeira escrita)', async () => {
    await backupRotativo(arquivo)

    await expect(stat(backupDirFor(arquivo))).rejects.toThrow()
  })

  it(`mantem no maximo ${MAX_VERSOES} versoes`, async () => {
    await writeFile(arquivo, '{"v":0}', 'utf8')

    // 8 backups em sequencia; o mtime separa as versoes
    for (let i = 1; i <= 8; i++) {
      await backupRotativo(arquivo)
      await new Promise(r => setTimeout(r, 15))
    }

    const versoes = await readdir(backupDirFor(arquivo))

    expect(versoes).toHaveLength(MAX_VERSOES)
  })

  it('nao apaga versoes de OUTRO arquivo', async () => {
    const outro = join(dir, 'outro.json')

    await writeFile(arquivo, '{"a":1}', 'utf8')
    await writeFile(outro, '{"b":1}', 'utf8')

    for (let i = 0; i < 7; i++) {
      await backupRotativo(arquivo)
      await new Promise(r => setTimeout(r, 10))
    }

    await backupRotativo(outro)

    const versoes = await readdir(backupDirFor(arquivo))

    expect(versoes.filter(v => v.startsWith('dados.'))).toHaveLength(MAX_VERSOES)
    expect(versoes.filter(v => v.startsWith('outro.'))).toHaveLength(1)
  })

  it('nao lanca quando o alvo nao pode ser copiado (a escrita do dado segue)', async () => {
    // diretorio no lugar do arquivo: copyFile falha, e isso NAO pode propagar
    await expect(backupRotativo(dir)).resolves.toBeUndefined()
  })
})
