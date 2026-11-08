// r2 do V5 (R-02) — a guarda de desinstalação, provada por negação.
//
// O defeito que estes testes fecham: `hermes:uninstall:run` não consultava ator. Qualquer JavaScript
// no renderer — XSS em saída de modelo, plugin, webview — desinstalava o produto sem interação. A
// confirmação na interface não protege, porque ela é código do próprio renderer.
//
// A regra: capacidade de `escrita` na máquina **e** papel `owner`. E a recusa tem de acontecer
// **antes** de o efeito ser decidido — `runUninstall` não pode nem ser chamado.
import { expect, test, vi } from 'vitest'
import { registerDesktopUninstallIpc } from './desktop-uninstall'
import type { DesktopUninstallIpcDeps, DesktopUninstallSummary } from './desktop-uninstall'
import type { Actor } from './rbac'

const resumoLocal: Omit<DesktopUninstallSummary, 'code_removal_allowed' | 'native_removal_instructions'> = {
  agent_installed: true,
  gui_installed: true,
  hermes_home: '/test/.hermes',
  packaged_app_paths: [],
  platform: process.platform,
  probe: 'fallback',
  source_built_artifacts: [],
  userdata_dir: '/test/desktop',
  userdata_exists: true
}

type Handler = Parameters<DesktopUninstallIpcDeps['ipcMain']['handle']>[1]

/** Monta o módulo com um ator controlado e devolve como chamar `uninstall:run`. */
function montar(ator: Actor | null) {
  const handlers = new Map<string, Handler>()
  const runUninstall = vi.fn<DesktopUninstallIpcDeps['runUninstall']>(async () => ({
    mode: 'gui' as const,
    ok: true as const,
    script_path: '/tmp/x.sh',
    will_remove_app_bundle: false
  }))

  registerDesktopUninstallIpc({
    actorOf: async () => ator,
    ipcMain: {
      handle: (canal: string, handler: Handler): void => {
        handlers.set(canal, handler)
      }
    },
    // `payload: 'bootstrap'` resolve installKind 'standard' — o unico que permite remover o bundle.
    // Sem isto o canal recusaria por 'externally-managed' antes da autorizacao, e o teste mediria
    // outra coisa que nao a guarda.
    stamp: { distribution: 'source', payload: 'bootstrap', source: 'git' },
    fallbackSummary: () => ({
      ...resumoLocal,
      code_removal_allowed: true,
      native_removal_instructions: null
    }),
    probeSummary: async () => ({
      ...resumoLocal,
      code_removal_allowed: true,
      native_removal_instructions: null
    }),
    removableAppPath: () => null,
    openAppsSettings: async () => {},
    runUninstall
  })

  const rodar = async (mode = 'gui') => {
    const h = handlers.get('hermes:uninstall:run')

    if (!h) throw new Error('hermes:uninstall:run nao registrado')

    return (await h({}, { mode })) as { error?: string; ok: boolean }
  }

  return { rodar, runUninstall }
}

test('sem ator, a desinstalacao recusa e NAO chama runUninstall', async () => {
  const { rodar, runUninstall } = await montar(null)
  const r = await rodar()

  expect(r.ok).toBe(false)
  expect(r.error).toBe('sem_permissao')
  // A prova que importa: a recusa vem antes do efeito.
  expect(runUninstall).not.toHaveBeenCalled()
})

test('ator sem nivel (null) tambem recusa — null nao e acesso padrao', async () => {
  const { rodar, runUninstall } = await montar({
    id: 'act_sem_nivel',
    kind: 'human',
    level: null,
    role: 'owner'
  })
  const r = await rodar()

  expect(r.error).toBe('sem_permissao')
  expect(runUninstall).not.toHaveBeenCalled()
})

test('ator com escrita mas sem papel owner recusa', async () => {
  const { rodar, runUninstall } = await montar({
    id: 'act_operador',
    kind: 'human',
    level: 'SUPERVISED_AUTONOMY',
    role: 'operator'
  })
  const r = await rodar()

  expect(r.error).toBe('sem_permissao')
  expect(runUninstall).not.toHaveBeenCalled()
})

test('bot com EXECUTE_ALLOWED nao desinstala — capacidade nao substitui papel', async () => {
  // G1 §36 do goal: `EXECUTE_ALLOWED` isolado nao concede permissao universal.
  const { rodar, runUninstall } = await montar({
    id: 'bot_qualquer',
    kind: 'bot',
    level: 'EXECUTE_ALLOWED',
    role: 'owner'
  })
  const r = await rodar()

  // O dono da instalacao e humano por construcao; um bot que se declara owner nao passa.
  expect(r.ok).toBe(false)
  expect(runUninstall).not.toHaveBeenCalled()
})

test('o dono desinstala — o fluxo normal continua funcionando', async () => {
  const { rodar, runUninstall } = await montar({
    id: 'act_owner',
    kind: 'human',
    level: 'SUPERVISED_AUTONOMY',
    role: 'owner'
  })
  const r = await rodar()

  expect(r.ok).toBe(true)
  expect(runUninstall).toHaveBeenCalledTimes(1)
  expect(runUninstall).toHaveBeenCalledWith('gui')
})
