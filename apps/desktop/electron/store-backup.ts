// Backup rotativo dos arquivos de negócio.
//
// O PROBLEMA QUE ISTO RESOLVE
//
// Medido na r70: os dados do B-3PO vivem em `%APPDATA%/B-3PO/b3po/` (14 JSON, 606 KB) e **não havia
// backup nenhum** — nem `.bak`, nem `backups/`, nem código de cópia em store algum. A escrita é
// atômica (`{file}.tmp` + `rename`), e isso protege contra um arquivo *meio escrito*; **não protege o
// arquivo que já está lá**: a próxima escrita sobrescreve, e se o conteúdo novo estiver errado (bug,
// `JSON.parse` devolvendo `empty()`, edição manual) o anterior se foi.
//
// Pior: `parseAfterSales` e os seus irmãos **descartam o inválido em vez de falhar** — a perda pode
// passar silenciosa, sem erro e sem aviso.
//
// A REGRA
//
// Antes de cada `rename` que troca o arquivo real, copia o arquivo atual para
// `b3po/backups/<nome>.<epoch>.json` e mantém as `MAX_VERSOES` mais recentes. O que sobra é apagado.
//
// O QUE ESTA FUNÇÃO NÃO FAZ
//
// Não restaura. Um `restore` é uma operação com semântica própria (qual versão? sobrescreve? avisa o
// usuário?) e não deve ser um efeito colateral de um backup. O arquivo está lá, com timestamp no nome,
// e pode ser copiado de volta à mão — que é o que um restore automático faria, sem decidir por
// ninguém.
//
// Não falha a escrita. Se o backup não puder ser feito (disco cheio, permissão), a escrita do dado
// real **segue**: perder o backup é ruim, perder o dado por causa do backup é pior. A falha é
// registrada no console e engolida.

import { copyFile, mkdir, readdir, stat, unlink } from 'node:fs/promises'
import { basename, dirname, extname, join } from 'node:path'

/** Quantas versões de cada arquivo ficam guardadas. */
export const MAX_VERSOES = 5

/** Pasta de backup, ao lado dos stores (`b3po/backups/`). */
export function backupDirFor(filePath: string): string {
  return join(dirname(filePath), 'backups')
}

/**
 * Copia `filePath` para `backups/<nome>.<epoch>.json`, mantendo as `MAX_VERSOES` mais recentes.
 *
 * Chamar ANTES do `rename` que troca o arquivo real. Silenciosa por desenho: ver o cabeçalho.
 */
export async function backupRotativo(filePath: string, maxVersoes = MAX_VERSOES): Promise<void> {
  try {
    // Arquivo ainda não existe (primeira escrita): não há o que preservar.
    const existe = await stat(filePath).then(
      () => true,
      () => false
    )

    if (!existe) {
      return
    }

    const dir = backupDirFor(filePath)
    await mkdir(dir, { recursive: true })

    const nome = basename(filePath)
    const ext = extname(nome)
    const raiz = ext ? nome.slice(0, -ext.length) : nome
    const destino = join(dir, `${raiz}.${Date.now()}${ext || '.json'}`)

    await copyFile(filePath, destino)

    await podar(dir, raiz, ext, maxVersoes)
  } catch (erro) {
    // O backup falhou; a escrita do dado real não pode falhar por causa disso.
    console.warn(`[store-backup] ${basename(filePath)}: ${(erro as Error).message}`)
  }
}

/**
 * Apaga as versões mais antigas de um arquivo, deixando `maxVersoes`.
 *
 * O `Date.now()` do nome ordena lexicograficamente? Não — `1720000000001` e `1720000000010` têm o
 * mesmo comprimento, então ordenam certo **enquanto o comprimento não mudar** (século XXX). Para não
 * depender disso, ordeno pelo `mtime` do arquivo, que é o que `readdir` + `stat` dão de graça e não
 * tem esse risco.
 */
async function podar(dir: string, raiz: string, ext: string, maxVersoes: number): Promise<void> {
  const prefixo = `${raiz}.`
  const sufixo = ext || '.json'

  const versoes = (await readdir(dir))
    .filter(nome => nome.startsWith(prefixo) && nome.endsWith(sufixo))
    .map(async nome => ({ nome, mtime: (await stat(join(dir, nome))).mtimeMs }))

  const comData = await Promise.all(versoes)

  if (comData.length <= maxVersoes) {
    return
  }

  const sobra = comData.sort((a, b) => b.mtime - a.mtime).slice(maxVersoes)

  await Promise.all(sobra.map(v => unlink(join(dir, v.nome)).catch(() => undefined)))
}
