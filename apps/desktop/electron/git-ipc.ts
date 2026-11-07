// IPC surface for git-driven features: worktree management ("Start work"),
// the composer coding rail's repo status, the Codex-style review pane, and
// repo-first project discovery. Extracted from main.ts; the git/gh binary
// resolvers stay injected because main.ts also uses them for self-update and
// plugin installs.
import { ipcMain } from 'electron'

import { scanGitRepos } from './git-repo-scan'
import {
  fileDiffVsHead,
  repoStatus,
  reviewCommit,
  reviewCommitContext,
  reviewCreatePr,
  reviewDiff,
  reviewList,
  reviewPrList,
  reviewPush,
  reviewRevert,
  reviewRevParse,
  reviewShipInfo,
  reviewStage,
  reviewUnstage
} from './git-review-ops'
import {
  addWorktree,
  listBaseBranches,
  listBranches,
  listWorktrees,
  removeWorktree,
  switchBranch
} from './git-worktree-ops'

import { RECUSA_MAQUINA, podeOperarMaquina, type MachineCapability } from './machine-access'
import type { Actor } from './rbac'

export interface GitIpcDeps {
  /**
   * Ator resolvido no processo principal. `null` recusa os canais de escrita e os externos.
   *
   * Fronteira de MÁQUINA, não de domínio: ver machine-access.ts. `git push` e `createPr` saem da
   * máquina e não têm desfazer.
   */
  actorOf: () => Promise<Actor | null>
  resolveGitBinary: () => string
  resolveGhBinary: () => string
}

export function registerGitIpc({ actorOf, resolveGitBinary, resolveGhBinary }: GitIpcDeps) {
  /**
   * Envolve um canal com a fronteira de máquina.
   *
   * A recusa nomeia o motivo (`capacidade_de_maquina`) em vez de um erro genérico: quem chamou precisa
   * saber que faltou permissão de máquina, e não que o git quebrou.
   */
  async function comMaquina<T>(
    capacidade: MachineCapability,
    run: () => Promise<T>
  ): Promise<T | typeof RECUSA_MAQUINA> {
    const ator = await actorOf()

    if (!podeOperarMaquina(ator, capacidade, 'git')) return RECUSA_MAQUINA

    return run()
  }

  // Git-driven worktree management ("Start work" flow). Errors surface to the
  // renderer as rejected promises so it can toast a friendly message.
  ipcMain.handle('hermes:git:worktreeList', async (_event, repoPath) => listWorktrees(repoPath, resolveGitBinary()))

  ipcMain.handle('hermes:git:worktreeAdd', async (_event, repoPath, options) =>
    comMaquina('escrita', async () => addWorktree(repoPath, options || {}, resolveGitBinary()))
  )

  ipcMain.handle('hermes:git:worktreeRemove', async (_event, repoPath, worktreePath, options) =>
    comMaquina('escrita', async () => removeWorktree(repoPath, worktreePath, options || {}, resolveGitBinary()))
  )

  ipcMain.handle('hermes:git:branchSwitch', async (_event, repoPath, branch) =>
    comMaquina('escrita', async () => switchBranch(repoPath, branch, resolveGitBinary()))
  )

  ipcMain.handle('hermes:git:branchList', async (_event, repoPath) => listBranches(repoPath, resolveGitBinary()))

  ipcMain.handle('hermes:git:baseBranchList', async (_event, repoPath) =>
    listBaseBranches(repoPath, resolveGitBinary())
  )

  // Compact repo status (branch, ahead/behind, change counts + files) for the
  // composer coding rail. Returns null on a non-repo / remote backend so the rail
  // hides cleanly rather than erroring.
  ipcMain.handle('hermes:git:repoStatus', async (_event, repoPath) => repoStatus(repoPath, resolveGitBinary()))

  // Codex-style review pane: list changed files for a scope, fetch one file's
  // unified diff, and stage / unstage / revert. Reads return empty on failure;
  // mutations reject so the renderer can toast.
  ipcMain.handle('hermes:git:review:list', async (_event, repoPath, scope, baseRef) =>
    reviewList(repoPath, scope, baseRef, resolveGitBinary())
  )
  ipcMain.handle('hermes:git:review:diff', async (_event, repoPath, filePath, scope, baseRef, staged) =>
    reviewDiff(repoPath, filePath, scope, baseRef, staged, resolveGitBinary())
  )
  // Working-tree-vs-HEAD diff for one file (the preview's "show the diff" view).
  ipcMain.handle('hermes:git:fileDiff', async (_event, repoPath, filePath) =>
    fileDiffVsHead(repoPath, filePath, resolveGitBinary())
  )
  ipcMain.handle('hermes:git:review:stage', async (_event, repoPath, filePath) =>
    comMaquina('escrita', async () => reviewStage(repoPath, filePath ?? null, resolveGitBinary()))
  )
  ipcMain.handle('hermes:git:review:unstage', async (_event, repoPath, filePath) =>
    comMaquina('escrita', async () => reviewUnstage(repoPath, filePath ?? null, resolveGitBinary()))
  )
  // evert descarta alteracao nao commitada — irreversivel pelo usuario.
  ipcMain.handle('hermes:git:review:revert', async (_event, repoPath, filePath) =>
    comMaquina('escrita', async () => reviewRevert(repoPath, filePath ?? null, resolveGitBinary()))
  )
  ipcMain.handle('hermes:git:review:revParse', async (_event, repoPath, ref) =>
    reviewRevParse(repoPath, ref, resolveGitBinary())
  )
  // commit com push=true publica: e externo, nao apenas escrita.
  ipcMain.handle('hermes:git:review:commit', async (_event, repoPath, message, push) =>
    comMaquina(push ? 'externo' : 'escrita', async () =>
      reviewCommit(repoPath, message, Boolean(push), resolveGitBinary())
    )
  )
  ipcMain.handle('hermes:git:review:commitContext', async (_event, repoPath) =>
    reviewCommitContext(repoPath, resolveGitBinary())
  )
  // PUBLICACAO: sai da maquina e nao tem desfazer.
  ipcMain.handle('hermes:git:review:push', async (_event, repoPath) =>
    comMaquina('externo', async () => reviewPush(repoPath, resolveGitBinary()))
  )
  ipcMain.handle('hermes:git:review:shipInfo', async (_event, repoPath) => reviewShipInfo(repoPath, resolveGhBinary()))
  ipcMain.handle('hermes:git:review:prList', async (_event, repoPath, branches, numbers) =>
    reviewPrList(repoPath, resolveGhBinary(), branches, numbers)
  )
  // PUBLICACAO: abre PR em nome da empresa.
  ipcMain.handle('hermes:git:review:createPr', async (_event, repoPath) =>
    comMaquina('externo', async () => reviewCreatePr(repoPath, resolveGitBinary(), resolveGhBinary()))
  )

  // Repo-first project discovery: scan bounded roots for git repos (pure fs walk,
  // no native addon). Never throws to the renderer — failures yield an empty list.
  ipcMain.handle('hermes:git:scanRepos', async (_event, roots, options) => {
    try {
      return await scanGitRepos(roots || [], options || {})
    } catch {
      return []
    }
  })
}
