// Limite de taxa por ator (r70 do GOAL V2).
//
// O QUE O §19 PEDE, E O QUE ELE NÃO RESPONDE
//
// O §19 lista `rate limiting` entre os controles. **Não diz qual é o limite** — porque não existe um
// número certo em abstrato: depende de quem usa e do que a operação faz.
//
// O NÚMERO, E POR QUE ELE É ESTE
//
// **20 faturamentos por minuto, por ator.**
//
//   - Uma pessoa digitando uma venda leva **~30 segundos** (escolher produto, quantidade, cliente). 20 por
//     minuto é **10× o ritmo humano** — não atrapalha ninguém que esteja trabalhando.
//   - Um renderer comprometido chama **milhares** por segundo. 20 corta o abuso na primeira fração de
//     segundo.
//
// **O limite não é sobre velocidade: é sobre a diferença entre uma pessoa e um laço.**
//
// POR QUE ESTADO EM MEMÓRIA, E ELE É HONESTO SOBRE ISSO
//
// Reiniciar o app **zera o contador**. Isso significa que a proteção vale **dentro de uma sessão** — e é
// suficiente: o abuso que ela barra é um **laço no renderer**, e um laço não sobrevive a um reinício que o
// próprio usuário faria.
//
// **Persistir o contador seria pior**: um arquivo que cresce com cada chamada, para proteger contra algo
// que **já teria terminado** quando o app reabrisse.
//
// O QUE ELE **NÃO** PROTEGE
//
//   - vários processos com o mesmo ator (cada um tem o seu contador)
//   - abuso lento (19 por minuto para sempre) — que é **uso**, não ataque
//   - um ator diferente a cada chamada (que exigiria outra camada: criação de ator)

/** Quantas chamadas por janela. Ver o comentário do cabeçalho para o número. */
export const LIMITE_PADRAO = 20

/** A janela: um minuto. Longa o bastante para absorver rajada, curta o bastante para reagir. */
export const JANELA_PADRAO_MS = 60_000

export type ResultadoLimite = { ok: true } | { error: 'limite_excedido'; espere_ms: number; restantes: 0 }

/**
 * Janela deslizante por chave.
 *
 * **Deslizante, e não fixa**: uma janela fixa permitiria 20 chamadas no fim do minuto e 20 no começo do
 * seguinte — **40 de uma vez**, que é exatamente a rajada que o limite existe para conter.
 *
 * `registrar` **conta a chamada**; `consultar` **só olha**. A distinção importa: um handler que recusa por
 * outro motivo (permissão, validação) **não deve gastar a cota** — senão uma tentativa malformada
 * consumiria o direito de uma legítima.
 */
export class RateLimiter {
  private readonly registros = new Map<string, number[]>()

  constructor(
    private readonly limite: number = LIMITE_PADRAO,
    private readonly janelaMs: number = JANELA_PADRAO_MS
  ) {}

  private recentes(chave: string, agora: number): number[] {
    const lista = this.registros.get(chave) ?? []

    // Expira o que saiu da janela. Sem isto, o mapa cresceria para sempre e a contagem seria cumulativa.
    return lista.filter(t => agora - t < this.janelaMs)
  }

  /** Só olha: não gasta cota. */
  consultar(chave: string, agora: number = Date.now()): ResultadoLimite {
    const dentro = this.recentes(chave, agora)

    if (dentro.length < this.limite) return { ok: true }

    const maisAntigo = dentro[0] ?? agora

    return { error: 'limite_excedido', espere_ms: Math.max(0, this.janelaMs - (agora - maisAntigo)), restantes: 0 }
  }

  /** Conta a chamada e devolve o veredito. Recusar quando já estourou **não** adiciona ao registro. */
  registrar(chave: string, agora: number = Date.now()): ResultadoLimite {
    const veredito = this.consultar(chave, agora)

    if ('error' in veredito) return veredito

    const dentro = this.recentes(chave, agora)

    dentro.push(agora)
    this.registros.set(chave, dentro)

    return { ok: true }
  }

  /** Quantas chamadas ainda cabem. Para a mensagem de recusa ser útil. */
  restantes(chave: string, agora: number = Date.now()): number {
    return Math.max(0, this.limite - this.recentes(chave, agora).length)
  }

  resetar(): void {
    this.registros.clear()
  }
}

/** Um limitador por processo, carregado sob demanda. */
const limitadores = new Map<string, RateLimiter>()

export function limitadorDe(nome: string, limite: number = LIMITE_PADRAO): RateLimiter {
  const existente = limitadores.get(nome)

  if (existente) return existente

  const novo = new RateLimiter(limite)

  limitadores.set(nome, novo)

  return novo
}

/** Para os testes não herdarem cota de um caso para o outro. */
export function esquecerLimitadores(): void {
  limitadores.clear()
}

/** A mensagem que a tela mostra. Diz **quanto esperar**, não só que falhou. */
export function mensagemDeLimite(r: { espere_ms: number }): string {
  const segundos = Math.ceil(r.espere_ms / 1000)

  return `Muitas operações em pouco tempo. Espere ${segundos} segundo(s) e tente de novo.`
}
