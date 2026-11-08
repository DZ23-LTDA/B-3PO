// Restaurar uma versão de backup — a metade que faltava do T-10.
//
// POR QUE ESTE ARQUIVO EXISTE
//
// A r75 implementou o **backup** (cópia antes de cada escrita, 5 versões por arquivo) e eu registrei o
// **restore** como "deliberadamente não feito": *"um restore tem semântica própria e não deve ser efeito
// colateral de um backup"*. Isso é verdade sobre **ser automático** — e não é razão para **não existir**.
// Um arquivo `.bak` que ninguém consegue aplicar é um backup que só serve para conferir à mão.
//
// AS TRÊS COISAS QUE UM RESTORE PRECISA FAZER PARA SER SEGURO
//
// 1. **Backup do estado atual ANTES de sobrescrever.** Restaurar é uma escrita destrutiva; se ela própria
//    não for reversível, um restore errado termina o assunto. Aqui o restore chama `backupRotativo`
//    primeiro, então a versão que estava lá vira mais uma entrada da mesma série.
//
// 2. **Validar que a versão é JSON parseável antes de trocar.** Restaurar um arquivo corrompido é pior
//    que não restaurar: troca um dado bom por lixo. A verificação é `JSON.parse`, nada mais — o formato
//    de cada store é responsabilidade do store, e ler aqui seria duplicar 20 parsers.
//
// 3. **Recusar caminho fora da pasta de dados.** O pedido chega do renderer; `nomedoarquivo` com `..` ou
//    separador de caminho sairia de `b3po/`. A lista de nomes é **derivada do diretório**, mas a defesa
//    não pode depender de quem chamou ter bom comportamento.

import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'

import { backupDirFor, backupRotativo } from './store-backup'

export interface VersaoBackup {
  /** Nome do arquivo dentro de `backups/` — o que se passa para `restaurar`. */
  arquivo: string
  /** Tamanho em bytes daquela versão. */
  bytes: number
  /** Quando foi gravada (mtime, epoch ms). */
  quando: number
}

export interface ArquivoComBackup {
  /** Quantas versões existem. */
  versoes: VersaoBackup[]
  /** Nome do JSON de negócio, ex.: `inventory.json`. */
  nome: string
}

/**
 * Lista os arquivos de negócio e suas versões.
 *
 * Itera o **diretório** em vez de uma lista de stores: um store novo passa a aparecer aqui sem que
 * ninguém lembre de registrá-lo — e um arquivo que ninguém mapeou ainda tem backup, porque o backup mora
 * no `write` de cada store.
 */
export async function listarBackups(dadosDir: string): Promise<ArquivoComBackup[]> {
  const nomes = (await readdir(dadosDir)).filter(nome => nome.endsWith('.json') && !nome.endsWith('.tmp'))

  const saida: ArquivoComBackup[] = []

  for (const nome of nomes.sort()) {
    const raiz = nome.slice(0, -'.json'.length)
    const versoes = await versoesDe(join(dadosDir, 'backups'), raiz)

    if (versoes.length > 0) {
      saida.push({ nome, versoes })
    }
  }

  return saida
}

async function versoesDe(dir: string, raiz: string): Promise<VersaoBackup[]> {
  let arquivos: string[]

  try {
    arquivos = await readdir(dir)
  } catch {
    return []
  }

  const meus = arquivos.filter(nome => nome.startsWith(`${raiz}.`) && nome.endsWith('.json'))

  const comData = await Promise.all(
    meus.map(async arquivo => {
      const s = await stat(join(dir, arquivo)).catch(() => null)

      return s ? { arquivo, bytes: s.size, quando: s.mtimeMs } : null
    })
  )

  return comData
    .filter((v): v is VersaoBackup => v !== null)
    .sort((a, b) => b.quando - a.quando)
}

export type ResultadoRestore =
  | { arquivoSalvo: string; bytes: number; ok: true; versaoAplicada: string }
  | { error: string; ok: false }

/**
 * Aplica uma versão de backup sobre o arquivo de negócio.
 *
 * Ver o cabeçalho para as três garantias. `versaoArquivo` é o nome dentro de `backups/` — o mesmo que
 * `listarBackups` devolveu.
 */
export async function restaurarBackup(
  dadosDir: string,
  nomeArquivo: string,
  versaoArquivo: string
): Promise<ResultadoRestore> {
  // (3) o nome tem de ser um arquivo simples do diretório de dados, sem caminho embutido.
  if (basename(nomeArquivo) !== nomeArquivo || !nomeArquivo.endsWith('.json')) {
    return { error: 'arquivo_invalido', ok: false }
  }

  if (basename(versaoArquivo) !== versaoArquivo || !versaoArquivo.endsWith('.json')) {
    return { error: 'versao_invalida', ok: false }
  }

  const destino = join(dadosDir, nomeArquivo)
  const origem = join(backupDirFor(destino), versaoArquivo)

  // A versão tem de pertencer a ESTE arquivo (`inventory.<ts>.json` para `inventory.json`): sem isto,
  // um pedido trocado aplicaria a série de um store sobre outro — dois formatos diferentes no mesmo
  // caminho, e o parser do store descartaria tudo em silêncio.
  const raiz = nomeArquivo.slice(0, -'.json'.length)

  if (!versaoArquivo.startsWith(`${raiz}.`)) {
    return { error: 'versao_de_outro_arquivo', ok: false }
  }

  let conteudo: string

  try {
    conteudo = await readFile(origem, 'utf8')
  } catch {
    return { error: 'versao_nao_encontrada', ok: false }
  }

  // (2) só aplica o que é JSON válido.
  try {
    JSON.parse(conteudo)
  } catch {
    return { error: 'versao_corrompida', ok: false }
  }

  try {
    // (1) o estado atual vira mais uma versão da série — o restore é reversível.
    await backupRotativo(destino)
    // O conteúdo JÁ está em memória (lido acima). Escrever a memória em vez de `copyFile(origem,
    // destino)` não é estilo: `backupRotativo` PODA para 5 versões, e restaurar a mais antiga faz o
    // próprio restore apagar o arquivo de origem antes da cópia. O teste do limite pegou isso —
    // `falha_ao_restaurar` sem nada de errado com o disco.
    await writeFile(destino, conteudo, 'utf8')
  } catch {
    return { error: 'falha_ao_restaurar', ok: false }
  }

  const s = await stat(destino).catch(() => null)

  return { arquivoSalvo: nomeArquivo, bytes: s?.size ?? 0, ok: true, versaoAplicada: versaoArquivo }
}
