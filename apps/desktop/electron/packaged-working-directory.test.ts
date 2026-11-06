import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdir, mkdtemp, rename, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'

import { build } from 'esbuild'
import { test } from 'vitest'

import { packagedWorkingDirectoryTarget, releasePackagedWorkingDirectory } from './packaged-working-directory'

// The resident helper (an IME cloud service, a WSL/ssh helper) that the app spawns
// WITHOUT a cwd of its own, so it inherits the app's. It outlives the app and holds
// that directory as its cwd for as long as it lives. `detached` keeps it out of
// libuv's kill-on-close job, as a process created natively (by an IME inside the
// app) never joins it.
const HELPER = 'console.log(JSON.stringify({ pid: process.pid, cwd: process.cwd() })); setInterval(() => {}, 1000)'

function killPid(pid: number | undefined): void {
  if (!pid) {
    return
  }

  try {
    process.kill(pid)
  } catch {
    // already gone
  }
}

/**
 * r189 do GOAL V2: espera o processo sumir antes de remover a árvore.
 *
 * **O `rm` do `finally` falhava com `EBUSY`** porque o helper órfão ainda segurava o `workspace` como CWD: **no
 * Windows, `process.kill()` retorna antes do processo morrer**, e o `rmdir` de um diretório que é o CWD de alguém é
 * recusado.
 *
 * **Não é o bug do produto.** A r188 leu o `EBUSY` como "o CWD não é liberado" — **e o `EBUSY` de que o teste fala
 * está na L149, dentro do `if (!packaged)`, e é ESPERADO**. **O que quebrava era a limpeza do diretório temporário.**
 *
 * A espera é limitada e não esconde um vazamento: **se o processo não morrer em 5 s, o teste falha no próprio
 * `rm`**, que é o comportamento certo para um helper que não morre.
 */
async function esperarMorrer(pid: number | undefined): Promise<void> {
  if (!pid) return

  for (let tentativa = 0; tentativa < 100; tentativa += 1) {
    try {
      process.kill(pid, 0)
    } catch {
      return // sumiu
    }

    await new Promise(resolve => setTimeout(resolve, 50))
  }
}

// The decision itself, on every CI host (the host is data); the live EBUSY proof below needs Windows.
test('a packaged Windows app leaves a CWD inside its install folder and keeps one outside it', () => {
  const app = { platform: 'win32', isPackaged: true, execPath: 'C:\\Hermes\\win-unpacked\\Hermes.exe' } as const
  const home = 'C:\\Users\\ada'

  const target = (cwd: string, facts: Partial<Parameters<typeof packagedWorkingDirectoryTarget>[0]> = {}) =>
    packagedWorkingDirectoryTarget({ ...app, cwd, homedir: home, ...facts })

  assert.equal(target('C:\\Hermes\\win-unpacked'), home, 'the install folder (shortcut "Start in")')
  assert.equal(target('c:\\hermes\\WIN-UNPACKED\\resources'), home, 'below it, any case')
  assert.equal(target('C:\\Hermes'), null, 'the parent folder is a workspace, not the app tree')
  assert.equal(target('D:\\work\\repo'), null, 'a workspace on another drive')
  assert.equal(target('C:\\Hermes\\win-unpacked-old'), null, 'a sibling that shares a name prefix')
  assert.equal(target('C:\\Hermes\\win-unpacked', { isPackaged: false }), null, 'dev runs keep their CWD')

  for (const platform of ['linux', 'darwin'] as const) {
    assert.equal(target('/opt/Hermes', { platform, execPath: '/opt/Hermes/hermes' }), null, platform)
  }
})

// Review fold 3: this runs before main loads, so a home folder that cannot be entered must not
// crash startup; the app keeps its CWD as it did before the move existed.
test('a home folder that cannot be entered leaves the CWD and does not crash startup', () => {
  const facts = {
    platform: 'win32',
    isPackaged: true,
    execPath: 'C:\\Hermes\\win-unpacked\\Hermes.exe',
    cwd: 'C:\\Hermes\\win-unpacked',
    homedir: 'H:\\offline-roaming-profile'
  } as const

  const unreachable = (directory: string) => {
    throw Object.assign(new Error(`ENOENT: no such file or directory, chdir '${directory}'`), { code: 'ENOENT' })
  }

  assert.equal(releasePackagedWorkingDirectory(true, facts, unreachable), null)
})

// Exercise the real entry point before main loads: the main stand-in spawns the
// helper, the app is killed, and the directory swap runs with only the orphaned
// helper (exe outside the app tree) still alive.
test.skipIf(process.platform !== 'win32')(
  'packaged startup releases the install CWD before main can pass it to resident helpers',
  async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'hermes-entry-cwd-'))
    const install = path.join(root, 'win-unpacked')
    const workspace = path.join(root, 'workspace')
    await mkdir(install)
    await mkdir(workspace)

    try {
      for (const [packaged, cwd, expected] of [
        [false, install, install],
        [true, install, os.homedir()],
        [true, workspace, workspace]
      ] as const) {
        const fixture = path.join(root, 'entry.mjs')
        await build({
          entryPoints: [fileURLToPath(new URL('./entry.ts', import.meta.url))],
          outfile: fixture,
          bundle: true,
          platform: 'node',
          format: 'esm',
          define: {
            'process.execPath': JSON.stringify(path.join(install, 'Hermes.exe')),
            'process.env.HERMES_DESKTOP_IS_PACKAGED': 'undefined'
          },
          plugins: [
            {
              name: 'entry-cwd-fixture',
              setup(builder) {
                builder.onResolve({ filter: /^electron$/ }, () => ({ path: 'electron', namespace: 'fixture' }))
                builder.onResolve({ filter: /^\.\/main$/ }, () => ({ path: 'main', namespace: 'fixture' }))
                builder.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path: name }) => ({
                  contents:
                    name === 'electron'
                      ? // r186: `session` entrou. O `system-proxy-env` (alcançado pelo entry) importa
                        // `{ session } from 'electron'`, e um fixture que só exporta `app` **quebra o bundle** — o
                        // teste falhava em `No matching export in "fixture:electron" for import "session"`, que é
                        // um erro de FIXTURE e não do produto. Era o bug #2 da r181, e ele nunca foi flaky.
                        `export const app = { isPackaged: ${packaged} }\nexport const session = { defaultSession: { resolveProxy: async () => 'DIRECT' } }`
                      : [
                          `import { spawn } from 'node:child_process'`,
                          `spawn(process.env.FIXTURE_NODE, ['-e', ${JSON.stringify(HELPER)}], { detached: true, stdio: ['ignore', 'inherit', 'ignore'] })`,
                          `setInterval(() => {}, 1000)`
                        ].join('\n')
                }))
              }
            }
          ]
        })

        const app = spawn(process.execPath, [fixture], {
          cwd,
          env: { ...process.env, FIXTURE_NODE: process.execPath },
          stdio: ['ignore', 'pipe', 'ignore']
        })

        const appExited = once(app, 'exit')
        let helperPid: number | undefined

        try {
          const [line] = await once(createInterface({ input: app.stdout! }), 'line')
          const helper = JSON.parse(String(line)) as { pid: number; cwd: string }
          helperPid = helper.pid
          assert.equal(helper.cwd.toLowerCase(), expected.toLowerCase())

          // Quit the app: the helper is orphaned and keeps its inherited cwd.
          app.kill()
          await appExited
          process.kill(helperPid, 0)
          const moved = `${install}.previous`

          if (!packaged) {
            // Reproduce the original Windows sharing violation on an isolated tree.
            await assert.rejects(rename(install, moved), { code: 'EBUSY' })
          } else {
            await rename(install, moved)
            await rename(moved, install)
          }
        } finally {
          app.kill()
          killPid(helperPid)
        }
      }
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  }
)
