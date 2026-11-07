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

  const start = canal('hermes:terminal:start')

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
test('bot com EXECUTE_ALLOWED e ZERO escopos: RECUSA — e nao spawna', async () => {
  // r7 do V5 (G1 §36, criterio B). Este teste antes DOCUMENTAVA o buraco: o bot passava porque o
  // `kind` nao era considerado. A decisao foi tomada — `EXECUTE_ALLOWED` isolado nao concede
  // permissao universal, e `Actor.scopes` ("vazio = nenhum") passou a valer para a maquina.
  const start = montar(BOT)
  const r = (await start(evento() as never, {} as never)) as { error?: string }

  assert.deepEqual(r, RECUSA_MAQUINA)
  assert.equal(spawnMock.fn.mock.calls.length, 0, 'a recusa tem de vir ANTES do spawn')
})

test('bot COM escopo explicito opera a maquina — o caminho legitimo continua', async () => {
  const comEscopo: Actor = { ...BOT, scopes: ['terminal'] }
  const start = montar(comEscopo)
  const r = (await start(evento() as never, {} as never)) as { error?: string }

  assert.equal(r.error, undefined, 'um bot autorizado nao pode ser barrado')
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


/*
 * r10 do V5 — o terminal pertence a JANELA que o abriu.
 *
 * `attach` ja exigia `webContentsId === event.sender.id`, mas `write`, `resize` e `cwd` só olhavam
 * se a sessão existia. Um renderer escrevia no terminal de outro — inclusive num shell privilegiado
 * aberto na outra janela. Não é "acesso à máquina": é acesso a uma sessão que esta janela não abriu.
 */
const janelaDe = (id: number) => ({
  sender: { id, isDestroyed: () => false, once: () => undefined, send: () => undefined }
})

/** O handler e tipado `(...args: never[])`; chamar com argumento real exige cast. */
type Chamavel = (event: unknown, ...args: unknown[]) => unknown

const canal = (nome: string): Chamavel | undefined => {
  const h = handles.map.get(nome)

  return h as unknown as Chamavel | undefined
}

function abrirTerminal(janela: ReturnType<typeof janelaDe>): string {
  const start = canal('hermes:terminal:start')

  assert.ok(start, 'terminal:start nao registrado')

  // `montar` ja registrou; o retorno e sincrono o bastante no mock.
  const r = start(janela as never, {} as never) as unknown as Promise<{ id?: string }> | { id?: string }

  return String((r as { id?: string })?.id ?? '')
}

test('a janela A escreve no proprio terminal; a janela B NAO escreve nele', async () => {
  montar(DONO)
  const A = janelaDe(71)
  const B = janelaDe(72)

  const start = canal('hermes:terminal:start')

  assert.ok(start)

  const aberta = (await start(A as never, {} as never)) as { id?: string }

  assert.ok(aberta?.id, 'terminal nao abriu: ' + JSON.stringify(aberta))

  const write = canal('hermes:terminal:write')

  assert.ok(write)

  spawnMock.fn.mock.calls.length

  const daDona = write(A as never, aberta.id, 'ls\n')

  assert.equal(daDona, true, 'a janela que abriu tem de poder escrever')

  const deOutra = write(B as never, aberta.id, 'rm -rf /\n')

  assert.equal(deOutra, false, 'outra janela NAO escreve no terminal alheio')
})

test('a janela B NAO redimensiona nem le o cwd do terminal da janela A', async () => {
  montar(DONO)
  const A = janelaDe(81)
  const B = janelaDe(82)

  const start = canal('hermes:terminal:start')

  assert.ok(start)

  const aberta = (await start(A as never, {} as never)) as { id?: string }

  assert.ok(aberta?.id)

  const resize = canal('hermes:terminal:resize')
  const cwd = canal('hermes:terminal:cwd')

  assert.ok(resize)
  assert.ok(cwd)
  assert.equal(resize(B as never, aberta.id, { cols: 10, rows: 10 }), false)
  assert.equal(await (cwd(B as never, aberta.id) as Promise<null>), null)
})
