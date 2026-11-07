// Fila de escrita para stores de arquivo JSON (rodada 236).
//
// O PROBLEMA
//
// Todo store deste produto segue o mesmo desenho: `read()` -> valida -> muta -> `write()`. O `write` é atômico
// (temp + rename), mas a SEQUÊNCIA não é serializada. Duas chamadas que se sobrepõem leem o mesmo estado e a
// segunda grava por cima da primeira.
//
// Isso foi provado no estoque (r234) e no financeiro/vendas (r235): três vendas simultâneas viraram UM registro,
// com as três respondendo sucesso. O inventário da r236 encontrou o mesmo desenho em 22 dos 25 stores.
//
// A SOLUÇÃO
//
// Uma fila por instância. A escrita N+1 só começa quando a N termina. Não muda a lógica de negócio: o método
// público entra na fila e delega ao privado.
//
// O QUE ISTO NÃO RESOLVE
//
// É por INSTÂNCIA, que é a unidade de escrita do arquivo. Duas instâncias sobre o mesmo arquivo continuam sem
// proteção mútua — isso exigiria lock de sistema de arquivos, e o produto usa uma instância por diretório.

/**
 * Fila de escrita serializada.
 *
 * O erro engolido no fim da fila é de propósito: uma escrita que falha não pode travar as seguintes. Quem
 * chamou recebe a rejeição (`serializar` devolve o resultado real); a fila só segue limpa.
 */
export class WriteQueue {
  private ultima: Promise<unknown> = Promise.resolve()

  /** Executa `run` quando todas as escritas anteriores tiverem terminado. */
  serializar<T>(run: () => Promise<T>): Promise<T> {
    const resultado = this.ultima.then(run)

    this.ultima = resultado.catch(() => undefined)

    return resultado
  }
}
