import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * r16 do V4 — a guarda de `hermes:fs:*`.
 *
 * `fs` é **capacidade de máquina**: ler e escrever arquivo arbitrário neste computador. A política é
 * a mesma de `git` e `terminal` (`podeOperarMaquina`), não o RBAC de recurso de negócio.
 *
 * O QUE ESTES TESTES PROVAM
 *
 * 1. **sem ator → recusa**, e a recusa **não toca o disco** (o arquivo não é criado);
 * 2. **`level: null` → recusa** — `null` é "sem acesso", não "acesso padrão";
 * 3. **dono → permite**, então o fluxo normal do app não quebra;
 * 4. **leitura também é guardada** — listar diretório com ator sem nível é recusado.
 *
 * O ponto 1 é o que importa: uma guarda que rodasse **depois** da escrita deixaria o arquivo no
 * disco quando a recusa fosse decidida.
 */

const { handlers } = vi.hoisted(() => ({
  handlers: new Map<string, (...args: never[]) => unknown>()
}))

vi.mock('electron', () => ({
  app: { getPath: () => os.tmpdir(), getVersion: () => '0.0.0-test' },
  dialog: { showMessageBox: async () => ({ response: 1 }) },
  ipcMain: {
    handle: (channel: string, listener: (...args: never[]) => unknown) => {
      handlers.set(channel, listener)
    }
  },
  shell: { openPath: async () => '', showItemInFolder: () => undefined, trashItem: async () => undefined }
}))

import type { Actor } from './rbac'
import { RECUSA_MAQUINA } from './machine-access'
import { registerFsIpc } from './fs-ipc'

const DONO: Actor = { id: 'act_owner', kind: 'human', level: 'SUPERVISED_AUTONOMY', role: 'owner' }
const SEM_NIVEL: Actor = { id: 'act_x', kind: 'human', level: null, role: 'viewer' }

let scratch = ''

function montar(ator: Actor | null) {
  scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'b3po-fs-guarda-'))
  handlers.clear()

  registerFsIpc({
    actorOf: async () => ator,
    directoryExists: (v: string) => fs.existsSync(v),
    expandUserPath: (v: string) => (v.startsWith('~/') ? path.join(scratch, v.slice(2)) : v),
    hermesHome: scratch,
    readActiveDesktopProfile: () => 'launch-profile',
    resolveGitBinary: () => 'git',
    resolveRequestedPathForIpc: (v: string) => v
  })

  return (canal: string) => {
    const h = handlers.get(canal)

    if (!h) throw new Error(canal + ' nao registrado')

    return (...args: unknown[]) => (h as (...a: unknown[]) => unknown)(...args)
  }
}

afterEach(() => {
  if (scratch) fs.rmSync(scratch, { force: true, recursive: true })
})

describe('escrita: sem ator, a recusa vem ANTES do disco', () => {
  it('writeText recusa e o arquivo NAO e criado', async () => {
    const pegar = montar(null)
    const alvo = path.join(scratch, 'nao-deveria-existir.txt')

    const r = await pegar('hermes:fs:writeText')({ sender: { id: 1 } } as never, alvo, 'conteudo', {} as never)

    expect(r).toEqual(RECUSA_MAQUINA)
    expect(fs.existsSync(alvo)).toBe(false)
  })

  it('level null recusa — null e "sem acesso"', async () => {
    const pegar = montar(SEM_NIVEL)

    const r = await pegar('hermes:fs:writeText')(
      { sender: { id: 1 } } as never,
      path.join(scratch, 'x.txt'),
      'c',
      {} as never
    )

    expect(r).toEqual(RECUSA_MAQUINA)
  })

  it('o dono escreve — o fluxo normal nao quebra', async () => {
    const pegar = montar(DONO)
    const alvo = path.join(scratch, 'permitido.txt')

    const r = (await pegar('hermes:fs:writeText')({ sender: { id: 1 } } as never, alvo, 'ok', {} as never)) as {
      error?: string
    }

    expect(r.error).toBeUndefined()
  })
})

describe('leitura tambem e guardada', () => {
  it('readDir recusa sem ator', async () => {
    const pegar = montar(null)

    const r = await pegar('hermes:fs:readDir')({ sender: { id: 1 } } as never, scratch, {} as never)

    expect(r).toEqual(RECUSA_MAQUINA)
  })

  it('readDir permite com o dono', async () => {
    const pegar = montar(DONO)

    const r = await pegar('hermes:fs:readDir')({ sender: { id: 1 } } as never, scratch, {} as never)

    expect(r).not.toEqual(RECUSA_MAQUINA)
  })
})

describe('todos os canais de escrita e leitura passaram pela guarda', () => {
  it('nenhum dos 13 canais responde sem ator', async () => {
    montar(null)

    // os canais que tocam o disco ou revelam caminho
    const canais = [
      'hermes:fs:readDir',
      'hermes:fs:gitRoot',
      'hermes:fs:desktopPluginsRoot',
      'hermes:fs:logsRoot',
      'hermes:fs:reveal',
      'hermes:fs:openDir',
      'hermes:fs:rename',
      'hermes:fs:writeText',
      'hermes:fs:trash',
      'hermes:fs:reconcileDesktopPlugins',
      'hermes:plugin:probe',
      'hermes:plugin:installDesktop',
      'hermes:plugin:removeDesktop'
    ]

    for (const canal of canais) {
      const h = handlers.get(canal)

      expect(h, canal + ' nao registrado').toBeTruthy()

      const r = await h!(

        { sender: { id: 1 } } as never,
        '' as never,
        {} as never,
        {} as never
      )

      expect(r, canal + ' respondeu sem ator — guarda ausente').toEqual(RECUSA_MAQUINA)
    }
  })
})
