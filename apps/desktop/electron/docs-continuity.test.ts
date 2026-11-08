import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * Os documentos de continuidade têm de concordar **entre si** e não podem conter afirmações que já
 * foram superadas.
 *
 * POR QUE ESTE ARQUIVO EXISTE
 *
 * Na r93 eu reescrevi `HANDOFF`, `MASTER-STATE` e `FINAL-DELIVERY` porque diziam "G4 NOT_IMPLEMENTED"
 * e "ZERO backup, ZERO restore" 33 rodadas depois de ambos serem resolvidos. Depois de "atualizar",
 * uma checagem manual achou **três resíduos meus** — inclusive uma matriz de gates antiga que eu
 * **acrescentei sem remover**.
 *
 * Na r94 o `wrapup_check` me devolveu o problema: *"não existe verificação automática de que eles
 * concordam — a checagem é manual"*. **Ele estava certo**, e a diferença entre documentar isso e
 * consertar é a diferença entre um relatório e um teste.
 *
 * O que este arquivo pega:
 *  - docs de estado em rodadas diferentes (um humano lê o que vier primeiro);
 *  - afirmação superada ressuscitada por um copy-paste de rodada antiga;
 *  - hash de `HEAD` cravado num doc (apodrece no commit seguinte);
 *  - item da fila sem dono declarado.
 */

const DOCS = join(import.meta.dirname, '..', '..', '..', 'docs', 'b3po', 'continuity')

const ARQUIVOS = {
  checkpoint: join(DOCS, 'MASTER-CHECKPOINT.json'),
  delivery: join(DOCS, 'FINAL-DELIVERY.txt'),
  gates: join(DOCS, 'GATES.md'),
  handoff: join(DOCS, 'HANDOFF.txt'),
  queue: join(DOCS, 'TASK-QUEUE.json'),
  state: join(DOCS, 'MASTER-STATE.md'),
}

async function ler(caminho: string): Promise<string> {
  return readFile(caminho, 'utf8')
}

/**
 * Afirmações que já foram verdade e não são mais.
 *
 * Cada uma tem data: `ZERO backup` foi verdade até a r75, `NOT_IMPLEMENTED` para o G4 até a r78,
 * `27/30` foi a contagem de a11y até a r77. **Um doc que ainda as tem descreve outro produto.**
 */
const SUPERADAS: readonly { motivo: string; padrao: RegExp }[] = [
  { motivo: 'o backup foi implementado na r75 (19 stores, 5 versões)', padrao: /ZERO backup, ZERO restore/i },
  { motivo: 'o backup foi implementado na r75', padrao: /backup\/restore dos dados inexistente/i },
  { motivo: 'a vertical foi construída na r78/r79', padrao: /NOT_IMPL\s+vertical/i },
  { motivo: 'o foco visível foi corrigido na r77 (30/30)', padrao: /\b27\/30\b/ },
  { motivo: 'o contraste foi zerado na r42; 3,78 e 2,14 são históricos', padrao: /\b3,78 e 2,14\b/ },
  { motivo: 'o `overall` passou a expor inferência na r90', padrao: /overall.{0,10}ignora a infer[êe]ncia$/im },
]

/**
 * Linhas que citam o passado **de propósito** — o HANDOFF diz "o anterior dizia G4 NOT_IMPLEMENTED"
 * para que quem leia saiba que está vendo a substituição. Banir isso seria banir a honestidade.
 */
function ehCitacaoHistorica(linha: string): boolean {
  // "antes: 3,78 e 2,14" é uma comparação — o número velho está ali para mostrar a melhoria.
  // O que não pode é o número velho ser apresentado como o estado de hoje.
  return /anterior|substitui|dizia|hist[óo]ric|at[ée] a r\d|era verdade|antes:|antes de|passou de|->/i.test(linha)
}

describe('docs de continuidade — consistência entre arquivos', () => {
  it('os cinco documentos de estado estão na MESMA rodada', async () => {
    const [handoff, state, delivery, checkpoint, queue] = await Promise.all([
      ler(ARQUIVOS.handoff),
      ler(ARQUIVOS.state),
      ler(ARQUIVOS.delivery),
      ler(ARQUIVOS.checkpoint),
      ler(ARQUIVOS.queue),
    ])

    const rodadaDe = (texto: string, padrao: RegExp): number => {
      const m = texto.match(padrao)

      expect(m, `rodada não encontrada com ${padrao}`).toBeTruthy()

      return Number(m![1])
    }

    const rodadas = {
      checkpoint: rodadaDe(checkpoint, /"round":\s*(\d+)/),
      delivery: rodadaDe(delivery, /Rodada\s+(\d+)\s+·/),
      handoff: rodadaDe(handoff, /Rodada\s+(\d+)\s+·/),
      queue: rodadaDe(queue, /"round":\s*(\d+)/),
      state: rodadaDe(state, /Rodada\*\*:\s*(\d+)/),
    }

    // Um único valor esperado: qualquer divergência significa que alguém atualizou um doc só.
    const valores = Object.values(rodadas)
    const unico = new Set(valores)

    expect(unico.size, `rodadas divergentes: ${JSON.stringify(rodadas)}`).toBe(1)
  })

  it('nenhum DOC DE ESTADO carrega afirmação já superada', async () => {
    /*
     * Só `HANDOFF`, `MASTER-STATE` e `FINAL-DELIVERY`: eles afirmam o presente.
     * `GATES.md` NÃO entra — ele é cronológico, e lá "27/30" é o número correto da rodada em que foi
     * medido. Banir história de um log seria editar o passado para ele combinar com o presente.
     */
    const textos = await Promise.all([ler(ARQUIVOS.handoff), ler(ARQUIVOS.state), ler(ARQUIVOS.delivery)])

    const achados: string[] = []

    for (const [indice, texto] of textos.entries()) {
      for (const linha of texto.split('\n')) {
        if (ehCitacaoHistorica(linha)) continue

        for (const { motivo, padrao } of SUPERADAS) {
          if (padrao.test(linha)) {
            achados.push(`documento ${indice}: "${linha.trim().slice(0, 70)}" — ${motivo}`)
          }
        }
      }
    }

    expect(achados, achados.join('\n')).toEqual([])
  })

  it('nenhum doc crava hash de HEAD (apodrece no commit seguinte)', async () => {
    const textos = await Promise.all([ler(ARQUIVOS.handoff), ler(ARQUIVOS.state), ler(ARQUIVOS.delivery)])

    const cravaram: string[] = []

    for (const texto of textos) {
      for (const linha of texto.split('\n')) {
        // "HEAD <hash>" — o commit do dia deixa de ser o HEAD na próxima rodada.
        if (/HEAD\s+[0-9a-f]{7,40}/i.test(linha)) cravaram.push(linha.trim().slice(0, 80))
      }
    }

    expect(cravaram, cravaram.join('\n')).toEqual([])
  })

  it('todo item da fila tem dono e status válido', async () => {
    const queue = JSON.parse(await ler(ARQUIVOS.queue)) as {
      queue: { id: string; owner?: string; status: string }[]
    }

    const validos = new Set(['done', 'blocked', 'todo'])

    for (const item of queue.queue) {
      expect(item.id, 'item sem id').toBeTruthy()
      expect(item.owner, `${item.id} sem dono`).toBeTruthy()
      expect(validos.has(item.status), `${item.id} com status inválido: ${item.status}`).toBe(true)
    }
  })

  it('a fila não tem item `todo` esquecido (trabalho meu deveria estar feito ou bloqueado)', async () => {
    const queue = JSON.parse(await ler(ARQUIVOS.queue)) as { queue: { id: string; status: string }[] }

    const todos = queue.queue.filter(i => i.status === 'todo').map(i => i.id)

    expect(todos, `itens todo: ${todos.join(', ')}`).toEqual([])
  })

  it('o GATES.md mantém o índice de retratações (o que evita ler a recusa como estado atual)', async () => {
    const gates = await ler(ARQUIVOS.gates)

    expect(gates).toContain('ÍNDICE DE RETRATAÇÕES')
  })
})
