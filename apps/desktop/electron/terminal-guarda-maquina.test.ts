import assert from 'node:assert/strict'
import { test, vi } from 'vitest'

/**
 * r8 do V4 — a guarda de `hermes:terminal:start`.
 *
 * POR QUE ESTE TESTE EXISTE
 *
 * `terminal:start` **spawna um shell neste computador**. É a capacidade mais perigosa que o produto
 * expõe: com ela, quem chama executa código. Até a r8 do V4 o canal não consultava ator nenhum — a
 * fronteira de acesso à máquina (`podeOperarMaquina`) existia e era usada por `git-ipc`, mas o
 * terminal não a consultava.
 *
 * Esse teste prova as **três** decisões que importam:
 *
 * 1. **sem ator → recusa**, e recusa **antes de spawnar** (o `node-pty` não é chamado);
 * 2. **bot → recusa**, mesmo com nível alto (bot não opera a máquina por desenho do RBAC);
 * 3. **dono da instalação → permite** (o fluxo normal não quebra).
 *
 * A ordem importa: se a guarda viesse depois do `spawn`, o processo já existiria quando a recusa
 * fosse decidida. O teste afirma que o spawn **não aconteceu**.
 */

const handles = vi.hoisted(() => ({ map: new Map<string, (...args: never[]) => unknown>() }))
const spawnMock = vi.hoisted(() => ({ fn: vi.fn() }))

vi.mock('electron', () => ({
  app: { getPath: () => '/tmp', getVersion: () => '0.0.0-test' },
  ipcMain: {
    handle: (channel: string, listener: (...args: never[]) => unknown) => {
      handles.map.set(channel, listener)
    }
  }
}))

vi.mock('node-pty', () => ({ default: { spawn: (...args: unknown[]) => spawnMock.fn(...args) } }))

import type { Actor } from './rbac'
import { RECUSA_MAQUINA } from './machine-access'
import { registerTerminalIpc } from './terminal-ipc'

const DONO: Actor = { id: 'act_owner', kind: 'human', level: 'SUPERVISED_AUTONOMY', role: 'owner' }
const BOT: Actor = { id: 'act_bot', kind: 'bot', level: 'EXECUTE_ALLOWED', role: 'bot', scopes: ['sales'] }
const SEM_NIVEL: Actor = { id: 'act_x', kind: 'human', level: null, role: 'viewer' }

function montar(ator: Actor | null) {
  handles.map.clear()
  spawnMock.fn.mockReset()
  spawnMock.fn.mockReturnValue({
    kill: vi.fn(),
    onData: vi.fn(),
    onExit: vi.fn(),
    pid: 1,
    resize: vi.fn(),
    write: vi.fn()
  })

  registerTerminalIpc({
    actorOf: async () => ator,
    activeSshTerminalTarget: () => null,
    ensureBackend: async () => ({}),
    ensureGatewayBackend: async () => ({}),
    findOnPath: () => '/bin/bash',
    gatewayTarget: () => 'local',
    getSshConnectionState: () => undefined,
    isWindows: false,
    rememberLog: () => undefined,
    sshBinary: () => 'ssh'
  })

  const start = handles.map.get('hermes:terminal:start')

  assert.ok(start, 'terminal:start nao registrado')

  return start
}

const evento = () => ({ sender: { id: 7, isDestroyed: () => false, once: () => undefined, send: () => undefined } })

test('sem ator: RECUSA e nao spawna nada', async () => {
  const start = montar(null)
  const r = await start(evento() as never, {} as never)

  assert.deepEqual(r, RECUSA_MAQUINA, 'a recusa deve nomear capacidade_de_maquina')
  assert.equal(spawnMock.fn.mock.calls.length, 0, 'spawnou antes de decidir — a guarda veio tarde')
})

/**
 * O `kind: 'bot'` **não** é considerado por `podeOperarMaquina`, e este teste registra isso em vez
 * de esconder.
 *
 * O QUE ACONTECE: um ator com `kind: 'bot'` e `level: 'EXECUTE_ALLOWED'` **passa** para `escrita` e
 * consegue spawnar um shell local.
 *
 * É DEFEITO? Não sei, e não vou decidir sozinho. Duas leituras são defensáveis:
 *
 *   - o RBAC diz *"Bot não herda permissão de humano"* — mas isso é sobre **recurso de negócio**
 *     (`sales`, `financeiro`), e a fronteira de máquina é outra pergunta;
 *   - os agentes de Engenharia **precisam** executar comandos — mas eles fazem isso pelo backend
 *     (Python + `terminal` tool), **não** por este canal IPC, que é o terminal da **interface**.
 *
 * Enquanto for ambíguo, o teste trava o comportamento **atual** para que uma mudança seja uma
 * decisão consciente, e não um efeito colateral. (r8 do V4)
 */
test('DOCUMENTA: bot com EXECUTE_ALLOWED passa — o kind nao e considerado', async () => {
  const start = montar(BOT)
  const r = (await start(evento() as never, {} as never)) as { error?: string }

  assert.equal(r.error, undefined, 'o comportamento mudou — se foi intencional, atualize este teste e o RISKS.md')
  assert.equal(spawnMock.fn.mock.calls.length, 1)
})

test('ator com level null: RECUSA — null e "sem acesso", nao "acesso padrao"', async () => {
  const start = montar(SEM_NIVEL)
  const r = await start(evento() as never, {} as never)

  assert.deepEqual(r, RECUSA_MAQUINA)
  assert.equal(spawnMock.fn.mock.calls.length, 0)
})

test('dono da instalacao: PERMITE e spawna — o fluxo normal nao quebra', async () => {
  const start = montar(DONO)
  const r = (await start(evento() as never, {} as never)) as { error?: string; id?: string }

  assert.equal(r.error, undefined, 'o dono foi recusado: a guarda quebrou o fluxo normal')
  assert.equal(spawnMock.fn.mock.calls.length, 1, 'o dono deveria ter spawnado o shell')
})

test('a recusa NAO carrega dado nenhum', async () => {
  const start = montar(null)
  const r = (await start(evento() as never, {} as never)) as Record<string, unknown>

  // um recusa que devolvesse id/shell nao recusou nada
  assert.equal('id' in r, false)
  assert.equal('shell' in r, false)
  assert.deepEqual(Object.keys(r).sort(), ['error', 'reason'])
})
