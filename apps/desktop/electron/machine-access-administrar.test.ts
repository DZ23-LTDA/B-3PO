// r3 do V5 — `podeAdministrarInstalacao` e mais estreito que operar a maquina.
//
// Ele governa as acoes que mudam a INSTALACAO inteira: desinstalar o produto e desligar a
// criptografia de segredos (que decripta tudo para plaintext em disco).
import { expect, test } from 'vitest'
import { podeAdministrarInstalacao, podeOperarMaquina } from './machine-access'
import type { Actor } from './rbac'

const dono: Actor = { id: 'a1', kind: 'human', level: 'SUPERVISED_AUTONOMY', role: 'owner' }

test('o dono humano administra a instalacao', () => {
  expect(podeAdministrarInstalacao(dono)).toBe(true)
})

test('sem ator, recusa — e o default', () => {
  expect(podeAdministrarInstalacao(null)).toBe(false)
})

test('nivel null e sem acesso, nao acesso padrao', () => {
  expect(podeAdministrarInstalacao({ ...dono, level: null })).toBe(false)
})

test('nivel READ nao administra: ler nao e administrar', () => {
  expect(podeAdministrarInstalacao({ ...dono, level: 'READ' })).toBe(false)
})

test('operador com execucao escreve arquivo, mas NAO administra a instalacao', () => {
  const operador: Actor = { ...dono, role: 'operator' }
  // A distincao e o ponto: as duas coisas sao diferentes de proposito.
  expect(podeOperarMaquina(operador, 'escrita', 'terminal')).toBe(true)
  expect(podeAdministrarInstalacao(operador)).toBe(false)
})

test('bot nao administra a instalacao, mesmo com EXECUTE_ALLOWED e role owner', () => {
  // G1 §36: `EXECUTE_ALLOWED` isolado nao concede permissao universal. Foi este caso que o teste
  // de guarda da desinstalacao revelou na r2 — e que motivou o helper.
  // O bot recebe escopo de proposito: assim `podeOperarMaquina` e **true**, e o que barra a
  // administracao e exclusivamente o `kind`. Sem o escopo, ele seria barrado por dois motivos e o
  // teste nao provaria nada sobre o `kind`.
  const bot: Actor = { id: 'b1', kind: 'bot', level: 'EXECUTE_ALLOWED', role: 'owner', scopes: ['terminal'] }
  expect(podeOperarMaquina(bot, 'escrita', 'terminal')).toBe(true)
  expect(podeAdministrarInstalacao(bot)).toBe(false)
})
