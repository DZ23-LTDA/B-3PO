// r26 do V5 — o invariante que faltava: canal registrado no main tem de ser ALCANÇÁVEL do renderer.
//
// POR QUE ESTE ARQUIVO EXISTE
//
// Três vezes neste goal a mesma falha de camada:
//   r11 — `hermes:sofia:delegar` nasceu no main e a ponte "deixou de ser código morto" (tinha teste);
//   r15 — a seção de conectores existia e não estava montada (typecheck passava);
//   r25 — `delegar` **nunca foi exposto no preload**: nenhum código do renderer podia chamá-lo.
//
// Nos três, o teste verde media a camada errada. Este mede a JUNÇÃO: o canal que o main registra e o
// método que o preload expõe.
//
// O QUE ELE **NÃO** VERIFICA
//
// Não diz que o handler funciona — só que a porta existe. Comportamento tem cobertura própria.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from 'vitest'

const AQUI = __dirname

/** Os canais `hermes:sofia:*` que o processo principal registra. */
function canaisDoMain(): string[] {
  const fonte = readFileSync(join(AQUI, 'sofia-ipc.ts'), 'utf8')

  return [...new Set(fonte.match(/hermes:sofia:[a-z:]+/g) ?? [])].sort()
}

/** Os canais `hermes:sofia:*` que o preload expõe ao renderer. */
function canaisDoPreload(): string[] {
  const fonte = readFileSync(join(AQUI, 'preload.ts'), 'utf8')

  return [...new Set(fonte.match(/hermes:sofia:[a-z:]+/g) ?? [])].sort()
}

test('todo canal de Sofia registrado no main é alcançável pelo preload', () => {
  const main = canaisDoMain()
  const preload = canaisDoPreload()
  const inalcancaveis = main.filter(canal => !preload.includes(canal))

  // A mensagem nomeia o canal: "faltou expor" é acionável; "conjuntos diferem" não é.
  expect(inalcancaveis).toEqual([])
})

test('o preload não expõe canal de Sofia que o main não registra', () => {
  const main = canaisDoMain()
  const preload = canaisDoPreload()
  const orfaos = preload.filter(canal => !main.includes(canal))

  // Um método exposto que chama canal inexistente daria `No handler registered` em runtime.
  expect(orfaos).toEqual([])
})

test('a contagem é a mesma dos dois lados', () => {
  // Guarda contra o caso em que os dois arquivos perdem o mesmo canal: o teste acima passaria.
  expect(canaisDoPreload().length).toBe(canaisDoMain().length)
  expect(canaisDoMain().length).toBeGreaterThanOrEqual(8)
})
