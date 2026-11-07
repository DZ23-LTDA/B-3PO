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

import { readdirSync } from 'node:fs'

/** Todo canal `hermes:*` que algum arquivo de `electron/` registra via `ipcMain.handle`. */
function canaisRegistrados(): string[] {
  const canais = new Set<string>()

  for (const arquivo of readdirSync(AQUI)) {
    if (!arquivo.endsWith('.ts') || arquivo.endsWith('.test.ts') || arquivo.endsWith('.d.ts')) continue

    const fonte = readFileSync(join(AQUI, arquivo), 'utf8')

    // Só `handle`: `ipcMain.on` é síncrono e atende janelas com superfície própria.
    for (const m of fonte.matchAll(/ipcMain\.handle\(\s*['"`](hermes:[a-z:-]+)['"`]/g)) canais.add(m[1])
  }

  return [...canais].sort()
}

/** Todo canal `hermes:*` que o preload entrega ao renderer. */
function canaisInvocados(): string[] {
  const fonte = readFileSync(join(AQUI, 'preload.ts'), 'utf8')

  return [...new Set([...fonte.matchAll(/ipcRenderer\.invoke\(\s*['"`](hermes:[a-z:-]+)['"`]/g)].map(m => m[1]))].sort()
}


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

/**
 * Canais que o main registra e o preload **não** expõe, com o motivo.
 *
 * Nenhum entra aqui por conveniência: cada linha tem de explicar por que a ausência de porta é
 * correta. Um canal novo que não esteja aqui e não tenha porta **falha o teste**.
 */
const SEM_PORTA_JUSTIFICADO: Record<string, string> = {
  // `hud:*` nao aparecem aqui porque sao `ipcMain.on` (sincrono, `event.returnValue`) e o coletor
  // so conta `handle` — a janela HUD tem superficie propria.
  // ⚠️ CANDIDATO AO MESMO DEFEITO — `ipcMain.handle` registrado em main.ts e **nenhum chamador no
  // repo inteiro**. Não é "intencional sem porta": é código sem porta e sem uso. Fica visível aqui
  // em vez de ser apagado sem decisão de quem é dono do recurso de sync.
  'hermes:sync-status': 'MORTO: registrado, sem chamador, sem preload'
}

test('o invariante cobre TODOS os dominios: registrado no main tem porta, ou motivo escrito', () => {
  const main = canaisRegistrados()
  const preload = canaisInvocados()
  const inalcancaveis = main.filter(canal => !preload.includes(canal))
  const semJustificativa = inalcancaveis.filter(canal => !(canal in SEM_PORTA_JUSTIFICADO))

  // A mensagem lista só o que NÃO está justificado: um canal novo sem porta aparece aqui.
  expect(semJustificativa).toEqual([])
})

test('a lista de exceções não apodrece: toda entrada ainda é um canal real e ainda sem porta', () => {
  const main = canaisRegistrados()
  const preload = canaisInvocados()

  for (const canal of Object.keys(SEM_PORTA_JUSTIFICADO)) {
    // Se o canal sumiu do main, a linha virou mentira.
    expect(main).toContain(canal)
    // Se ganhou porta, a linha também virou mentira — e o teste de cima já cobre.
    expect(preload).not.toContain(canal)
  }
})
