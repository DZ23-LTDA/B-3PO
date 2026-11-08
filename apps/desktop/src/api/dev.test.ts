// r9 da V6 — as funcoes puras do cliente de desenvolvimento.
//
// O que cada caso protege:
//   - `resumoDaExecucao` decide passou/falhou pelo EXIT CODE, nunca por texto na saida;
//   - sinal sem exit code (morto por timeout/SIGTERM) nao vira "falhou": culpar o projeto por algo que
//     o app fez seria mentira;
//   - `rotuloDoComando` mostra o que vai rodar, entre aspas quando tem espaco.
import { expect, test } from 'vitest'

import { formatarDuracao, resumoDaExecucao, rotuloDoComando } from './dev'

const resultado = (extra: Partial<Parameters<typeof resumoDaExecucao>[0]>) => ({
  duracao_ms: 1200,
  erro: '',
  exit_code: 0,
  saida: '',
  sinal: null,
  ...extra
})

test('exit 0 e passou, e o titulo traz a duracao', () => {
  const r = resumoDaExecucao(resultado({ exit_code: 0 }))

  expect(r.passou).toBe(true)
  expect(r.titulo).toContain('1.2 s')
})

test('exit diferente de zero e falhou, e o titulo traz o codigo', () => {
  const r = resumoDaExecucao(resultado({ exit_code: 3 }))

  expect(r.passou).toBe(false)
  expect(r.titulo).toContain('exit 3')
})

test('saida dizendo "fail" NAO decide nada quando o exit e 0', () => {
  const r = resumoDaExecucao(resultado({ exit_code: 0, saida: 'no failures found' }))

  expect(r.passou).toBe(true)
})

test('exit 0 com erro no stderr continua passou: o codigo manda', () => {
  const r = resumoDaExecucao(resultado({ erro: 'warn: deprecado', exit_code: 0 }))

  expect(r.passou).toBe(true)
})

test('sinal sem exit code nao e falha do projeto', () => {
  const r = resumoDaExecucao(resultado({ exit_code: 1, sinal: 'SIGTERM' }))

  expect(r.passou).toBeNull()
  expect(r.titulo).toContain('SIGTERM')
})

test('rotulo junta argv simples', () => {
  expect(rotuloDoComando(['npm', 'test'])).toBe('npm test')
})

test('rotulo poe aspas em argumento com espaco', () => {
  // `console.log("oi")` NAO tem espaco e por isso nao leva aspas — a primeira versao deste teste
  // esperava aspas e o proprio teste falhou, provando que a funcao estava certa.
  expect(rotuloDoComando(['node', '-e', 'console.log("oi")'])).toBe('node -e console.log("oi")')
  expect(rotuloDoComando(['cmd', '--flag=um dois'])).toBe('cmd "--flag=um dois"')
})

test('duracao em ms, s e min', () => {
  expect(formatarDuracao(250)).toBe('250 ms')
  expect(formatarDuracao(1500)).toBe('1.5 s')
  expect(formatarDuracao(65_000)).toBe('1 min 5 s')
  expect(formatarDuracao(Number.NaN)).toBe('—')
})
