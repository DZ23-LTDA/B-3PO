/**
 * Rodar um comando de desenvolvimento e **ler o resultado** (r6 da V6).
 *
 * POR QUE ESTE CANAL EXISTE
 *
 * O B-3PO ja' tinha terminal (PTY), mas "abrir terminal e digitar `npm test`" e' uma capacidade
 * **humana**: nada devolve exit code, nada separa stdout de stderr, nada sabe se passou. O §3 pede
 * "executar testes e builds" e o §10 pede "executar testes e corrigir falhas" — as duas exigem o
 * resultado, nao o terminal aberto.
 *
 * SEGURANCA — e' execucao ARBITRARIA, a capacidade mais perigosa do produto
 *
 *   - a guarda vem **antes** de qualquer efeito (mesmo padrao de `terminal:start`, r8 da V4);
 *   - o `cwd` e' validado: absoluto, sem `..`, existente e diretorio. Um comando roda **dentro** de
 *     uma pasta que a pessoa escolheu, nunca no cwd do processo;
 *   - `argv` e' lista, nunca string: sem shell nao ha interpolacao, entao `;`, `&&`, `|` e `$()` sao
 *     argumentos literais, nao operadores;
 *   - `timeout` e `maxBuffer`: um comando travado ou que imprime gigabytes nao derruba o app.
 *
 * O QUE ELE NAO FAZ
 *
 * Nao executa em segundo plano nem destaca processo: uma chamada = um comando, com saida limitada.
 * Trabalho longo continua sendo assunto do terminal.
 */
import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { stat } from 'node:fs/promises'
import { isAbsolute, join, normalize } from 'node:path'

import { detectarProjeto } from './dev-detect'
import type { IpcRegistrar } from './ipc-types'
import { podeOperarMaquina, RECUSA_MAQUINA } from './machine-access'
import type { Actor } from './rbac'

export interface DevRunIpcDeps {
  actorOf: () => Promise<Actor | null>
}

/** 15 min: um build grande cabe; um comando travado nao fica para sempre. */
const LIMITE_MS = 15 * 60_000

/** 4 MB de saida: suficiente para a saida de um teste; insuficiente para derrubar o processo. */
const LIMITE_BYTES = 4 * 1024 * 1024

export interface ResultadoDeExecucao {
  duracao_ms: number
  exit_code: number
  saida: string
  erro: string
  sinal: null | string
}

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : ''
}

function lista(valor: unknown): string[] {
  return Array.isArray(valor) ? valor.filter((v): v is string => typeof v === 'string' && v !== '') : []
}

/**
 * Resolve `argv[0]` no PATH do Windows (r14 da V6).
 *
 * O BUG QUE ISTO CORRIGE — medido no app, nao teorizado
 *
 * Clicar "Rodar testes" num projeto Node devolvia `exit_code: 1` em **3 ms** com **saida e erro vazios**.
 * No Windows `npm` e' `npm.cmd`, e `execFile('npm', ...)` nao o encontra. O `node` direto funcionava —
 * os dois lados da comparacao estavam na mesma medicao.
 *
 * O repo ja' resolve o mesmo problema em `updater/checkout-source.ts:118`: `.cmd` nao roda por execFile,
 * e `shell: true` interpolaria argumento nao confiavel. A solucao de la' — `ComSpec` com guarda de
 * metacaractere — e' a mesma adotada aqui.
 */
function resolverNoPath(nome: string): string {
  if (process.platform !== 'win32') return nome
  if (/[\\/]/.test(nome)) return nome
  if (/\.[a-z0-9]+$/i.test(nome)) return nome

  const extensoes = ['.cmd', '.exe', '.bat', '']
  const caminhos = (process.env.PATH ?? '').split(';').filter(Boolean)

  for (const dir of caminhos) {
    for (const ext of extensoes) {
      const candidato = join(dir, nome + ext)

      if (existsSync(candidato)) return candidato
    }
  }

  return nome
}

/**
 * Monta o que o `execFile` recebe.
 *
 * Para `.cmd`/`.bat` no Windows e' preciso passar pelo `ComSpec`, e ai' o `cmd.exe` **interpreta** a linha:
 * por isso o guarda de metacaractere. Um argumento com `&`, `|`, `>` ou `"` seria comando, nao dado —
 * e recusar e' melhor que executar.
 */
function prepararExecucao(argv: string[]): { args: string[]; comando: string; verbatim: boolean } | { recusa: string } {
  const resolvido = resolverNoPath(argv[0])
  const viaCmd = process.platform === 'win32' && /\.(cmd|bat)$/i.test(resolvido)

  if (!viaCmd) {
    return { args: argv.slice(1), comando: resolvido, verbatim: false }
  }

  const suspeito = argv.some(parte => /["%&|<>^\r\n]/.test(parte))

  if (suspeito) {
    return { recusa: 'argumento_inseguro' }
  }

  const linha = `""${resolvido}" ${argv.slice(1).map(p => `"${p}"`).join(' ')}"`

  return {
    args: ['/d', '/v:off', '/s', '/c', linha],
    comando: process.env.ComSpec ?? 'cmd.exe',
    verbatim: true
  }
}

export function registerDevRunIpc(ipcMain: IpcRegistrar, deps: DevRunIpcDeps): void {
  /*
   * r7 da V6 — `dev:detect` responde "como este projeto roda testes e build".
   *
   * Mesma guarda do `dev:run`: descobrir o comando de um projeto e' reconhecimento de maquina, e sem
   * ator com `leitura` nao ha razao para o renderer saber o que existe naquela pasta.
   *
   * Devolve `null` quando nao reconhece — a UI nao mostra botao. Um comando adivinhado produziria
   * falha e a pessoa concluiria que o projeto esta' quebrado.
   */
  ipcMain.handle('hermes:dev:detect', async (_event: unknown, payload: unknown): Promise<unknown> => {
    if (!podeOperarMaquina(await deps.actorOf(), 'leitura', 'terminal')) return RECUSA_MAQUINA

    const cwd = texto((payload as { cwd?: unknown } | null)?.cwd)

    if (!cwd) return { error: 'cwd_obrigatorio' }
    if (!isAbsolute(cwd)) return { error: 'cwd_invalido' }
    if (cwd.split(/[\\/]+/).includes('..')) return { error: 'cwd_invalido' }

    const alvo = normalize(cwd)
    const info = await stat(alvo).catch(() => null)

    if (!info?.isDirectory()) return { error: 'cwd_inexistente' }

    return detectarProjeto(alvo)
  })

  ipcMain.handle(
    'hermes:dev:run',
    async (_event: unknown, payload: unknown): Promise<unknown> => {
      /*
       * r6 da V6 — a guarda antes do efeito.
       *
       * `dev:run` executa o que o renderer mandar, entao sem ator com poder de execucao nao ha
       * nem validacao de caminho: recusa na fronteira, como o terminal faz desde a V4.
       */
      if (!podeOperarMaquina(await deps.actorOf(), 'escrita', 'terminal')) {
        return RECUSA_MAQUINA
      }

      const bruto = (payload ?? {}) as Record<string, unknown>
      const cwd = texto(bruto['cwd'])
      const argv = lista(bruto['argv'])

      if (!cwd) return { error: 'cwd_obrigatorio' }
      if (!argv.length) return { error: 'comando_obrigatorio' }

      // Absoluto e sem `..` ANTES de `normalize`: depois de normalizar o `..` ja' foi resolvido e nao
      // aparece — a mesma armadilha que o teste da r5 pegou no campo de caminho do projeto.
      if (!isAbsolute(cwd)) return { error: 'cwd_invalido' }
      if (cwd.split(/[\\/]+/).includes('..')) return { error: 'cwd_invalido' }

      const alvo = normalize(cwd)
      const info = await stat(alvo).catch(() => null)

      if (!info?.isDirectory()) return { error: 'cwd_inexistente' }

      const preparado = prepararExecucao(argv)

      if ('recusa' in preparado) return { error: preparado.recusa }

      const inicio = Date.now()

      const resultado = await new Promise<ResultadoDeExecucao>((resolve) => {
        execFile(
          preparado.comando,
          preparado.args,
          {
            cwd: alvo,
            encoding: 'utf8',
            maxBuffer: LIMITE_BYTES,
            timeout: LIMITE_MS,
            windowsHide: true,
            windowsVerbatimArguments: preparado.verbatim
          },
          (falha, saida, erro) => {
            const codigo = falha && typeof (falha as { code?: unknown }).code === 'number'
              ? (falha as { code: number }).code
              : falha
                ? 1
                : 0

            resolve({
              duracao_ms: Date.now() - inicio,
              exit_code: codigo,
              saida: String(saida ?? ''),
              erro: String(erro ?? ''),
              sinal: falha && typeof (falha as { signal?: unknown }).signal === 'string'
                ? ((falha as { signal: string }).signal)
                : null
            })
          }
        )
      })

      return resultado
    }
  )
}
