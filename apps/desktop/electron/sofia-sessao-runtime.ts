// r38 do V5 — a prova de que a sessao existe, montada fora do `main.ts`.
//
// POR QUE ESTE ARQUIVO EXISTE
//
// `main.ts` esta no teto do ratchet de linhas: ele **nao pode crescer**. A verificacao da sessao
// precisa do cliente HTTP do gateway, que so vive la. A saida e uma fabrica: o `main` passa a
// funcao que ja tem e ganha **uma linha** no lugar de quinze.
//
// POR QUE FAIL-CLOSED
//
// Se o gateway estiver fora do ar, nao da para provar que a sessao existe — e o main nao afirma o
// que nao pode provar. A execucao continua `pendente`, que e a verdade.
type ApiRequest = (request: { method: string; path: string }) => Promise<unknown>

export function sessaoExisteCom(api: ApiRequest) {
  return async (sessionId: string): Promise<boolean> => {
    try {
      await api({ method: 'GET', path: `/api/sessions/${encodeURIComponent(sessionId)}` })

      return true
    } catch {
      return false
    }
  }
}
