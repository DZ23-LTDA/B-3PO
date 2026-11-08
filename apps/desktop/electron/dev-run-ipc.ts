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
import { stat } from 'node:fs/promises'
import { isAbsolute, normalize } from 'node:path'

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

export function registerDevRunIpc(ipcMain: IpcRegistrar, deps: DevRunIpcDeps): void {
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

      const inicio = Date.now()

      const resultado = await new Promise<ResultadoDeExecucao>((resolve) => {
        execFile(
          argv[0],
          argv.slice(1),
          {
            cwd: alvo,
            encoding: 'utf8',
            maxBuffer: LIMITE_BYTES,
            timeout: LIMITE_MS,
            windowsHide: true
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
