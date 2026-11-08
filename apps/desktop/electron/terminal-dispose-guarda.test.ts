// r50 do V5 — `terminal:dispose` é da janela que abriu a sessão.
//
// A r10 fechou `write`, `resize` e `cwd` com `webContentsId === sender.id` e deixou `dispose` passar:
// um renderer podia encerrar o terminal de OUTRA janela. Não vaza dado, mas derrubar o terminal de
// alguém no meio de um comando é pior que ler.
//
// A regra foi extraída (`sessaoPertenceAoRenderer`) porque `terminalSessions` nasce dentro de
// `registerTerminalIpc`: testar o canal exigiria um PTY falso só para comparar dois ids.
import { expect, test } from 'vitest'
import { sessaoPertenceAoRenderer } from './terminal-ipc'

test('sessão de OUTRA janela não pertence', () => {
  expect(sessaoPertenceAoRenderer({ webContentsId: 1 }, 2)).toBe(false)
})

test('sessão da PRÓPRIA janela pertence', () => {
  expect(sessaoPertenceAoRenderer({ webContentsId: 2 }, 2)).toBe(true)
})

test('sessão inexistente não bloqueia o chamador', () => {
  expect(sessaoPertenceAoRenderer(undefined, 2)).toBe(true)
})
