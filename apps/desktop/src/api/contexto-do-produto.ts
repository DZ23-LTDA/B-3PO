/**
 * O contexto do produto que acompanha `prompt.submit` (r274).
 *
 * O PROBLEMA QUE ESTE ARQUIVO RESOLVE
 *
 * O contexto é montado em `lib/contexto-da-sofia.ts` (puro) e enviado pelo `api/client.ts`
 * (transporte). **Nenhum dos dois deve conhecer o outro lado**: a `lib` não importa `api`, e o
 * `api` não importa `store`, porque o mesmo cliente serve Desktop, TUI e web — e só o Desktop tem
 * "ambiente".
 *
 * Então o encontro acontece aqui: **uma variável de módulo que o app instala no boot**. O
 * `client.ts` chama `contextoDoProduto()`; se ninguém instalou, ela devolve `null` e nenhuma chave
 * é enviada.
 *
 * POR QUE UMA VARIÁVEL DE MÓDULO, E NÃO UMA PROPRIEDADE POR CLIENTE
 *
 * O Desktop cria **um `HermesGateway` por perfil secundário** (`store/gateway.ts::createSecondary`)
 * além do principal. Instalar o provider em cada criação significaria lembrar dele em cada novo
 * ponto que constrói um gateway — e **o que precisa ser lembrado em N lugares é esquecido em N-1**.
 * A variável é do PROCESSO, não da conexão: o ambiente é uma preferência da janela, não do socket.
 */

let provider: (() => null | string) | null = null

/**
 * Instala o provider. **Feito uma vez, no boot.**
 *
 * Devolve a função de desinstalação, para o teste (e um reload de módulo) não deixar um provider
 * de uma janela anterior respondendo pela atual.
 */
export function instalarContextoDoProduto(fn: () => null | string): () => void {
  provider = fn

  return () => {
    if (provider === fn) provider = null
  }
}

/** O contexto do turno, ou `null` quando não há o que dizer (ou ninguém instalou). */
export function contextoDoProduto(): null | string {
  return provider?.() ?? null
}

/** Só para o teste: esquece o provider instalado. */
export function limparContextoDoProduto(): void {
  provider = null
}
