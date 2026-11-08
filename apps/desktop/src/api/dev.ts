/**
 * Cliente dos canais de desenvolvimento (r9 da V6).
 *
 * O QUE ELE NAO FAZ
 *
 * Nao escolhe comando, nao monta string de shell, nao interpreta saida. Ele chama os dois canais
 * (`dev:detect`, `dev:run`) e oferece duas funcoes puras que a UI precisa para ser honesta:
 *
 *   - `rotuloDoComando` — mostrar **o que vai rodar** antes de rodar;
 *   - `resumoDaExecucao` — dizer passou/falhou a partir do exit code, nao de heuristica sobre o texto.
 *
 * POR QUE AS FUNCOES PURAS IMPORTAM
 *
 * "Passou" tem de vir do `exit_code`. Um `grep` por "fail" na saida daria falso positivo em qualquer
 * projeto que imprima a palavra por outro motivo, e falso negativo num runner silencioso. O exit code e'
 * o unico sinal que o runner de fato promete.
 */
export interface ComandoDoProjeto {
  argv: string[]
  origem: string
}

export interface DeteccaoDoProjeto {
  build: ComandoDoProjeto | null
  gerenciador: null | string
  testes: ComandoDoProjeto | null
}

export interface ResultadoDeExecucao {
  duracao_ms: number
  exit_code: number
  erro: string
  saida: string
  sinal: null | string
}

export type Recusa = { error: string }

interface PonteDev {
  detect: (payload: { cwd: string }) => Promise<unknown>
  run: (payload: { argv: string[]; cwd: string }) => Promise<unknown>
}

/**
 * A ponte do preload, quando existe.
 *
 * Devolve `null` no renderer de teste e no webview — casos em que a resposta certa e' "nao ha produto
 * aqui", nao uma excecao. Mesmo contrato de `chamarSofia`.
 */
function ponte(): PonteDev | null {
  return (globalThis as { hermesDesktop?: { dev?: PonteDev } }).hermesDesktop?.dev ?? null
}

/** Como este projeto roda testes e build. `null` nos campos quando nao ha runner reconhecivel. */
export async function detectarProjeto(cwd: string): Promise<DeteccaoDoProjeto | Recusa | null> {
  const api = ponte()

  if (!api) return null

  return (await api.detect({ cwd })) as DeteccaoDoProjeto | Recusa
}

/**
 * Roda um `argv` dentro de `cwd` e devolve o resultado.
 *
 * Recebe lista, nunca string: quem chama nao tem como injetar `;` ou `&&` porque nao ha shell no
 * caminho.
 */
export async function rodarComando(
  cwd: string,
  argv: string[]
): Promise<null | Recusa | ResultadoDeExecucao> {
  const api = ponte()

  if (!api) return null

  return (await api.run({ argv, cwd })) as Recusa | ResultadoDeExecucao
}

/** O comando como uma pessoa lê. So' para exibir — o que executa e' o `argv`. */
export function rotuloDoComando(argv: readonly string[]): string {
  return argv
    .map(parte => (/\s/.test(parte) ? `"${parte}"` : parte))
    .join(' ')
}

export interface ResumoDaExecucao {
  /** `null` quando o processo nao terminou por si (sinal) — nao e' falha do projeto. */
  passou: null | boolean
  titulo: string
}

/**
 * Traduz o resultado em "passou/falhou" **pelo exit code**.
 *
 * Sinal sem exit code (morto por `SIGTERM`, timeout) vira `passou: null` com o titulo do sinal: chamar
 * isso de "falhou" culparia o projeto por algo que o app fez.
 */
export function resumoDaExecucao(resultado: ResultadoDeExecucao): ResumoDaExecucao {
  if (resultado.sinal) {
    return { passou: null, titulo: `interrompido (${resultado.sinal})` }
  }

  if (resultado.exit_code === 0) {
    return { passou: true, titulo: `passou em ${formatarDuracao(resultado.duracao_ms)}` }
  }

  return {
    passou: false,
    titulo: `falhou (exit ${resultado.exit_code}) em ${formatarDuracao(resultado.duracao_ms)}`
  }
}

export function formatarDuracao(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '—'
  if (ms < 1000) return `${Math.round(ms)} ms`

  const segundos = ms / 1000

  return segundos < 60 ? `${segundos.toFixed(1)} s` : `${Math.floor(segundos / 60)} min ${Math.round(segundos % 60)} s`
}
