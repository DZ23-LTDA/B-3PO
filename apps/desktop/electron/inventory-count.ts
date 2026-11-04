// Inventario: a contagem fisica que corrige o saldo (rodada 186).
//
// O PROBLEMA QUE ISTO RESOLVE
//
// O saldo do estoque e a soma do ledger: entrada menos saida. Se o fisico diverge — quebra, furto, erro de
// recebimento — o ledger nao sabe. O inventario e o unico evento que reconcilia os dois, e ele precisa gerar
// MOVIMENTO, nao sobrescrever saldo: o ledger e imutavel, e um ajuste que substitui o saldo apagaria a historia
// que explica a diferenca.
//
// O QUE ESTE MODULO NAO FAZ
//
// Nao sabe onde a contagem aconteceu (deposito, prateleira) nem quem contou. Recebe os numeros e devolve os
// ajustes; quem grava decide o resto.

export type Contagem = {
  /** Quanto o contador fisico encontrou. */
  contado_milli: number
  /** SKU contado. */
  product_sku: string
}

export type Ajuste = {
  /** Diferenca em milesimos: positivo = sobra, negativo = falta. */
  diferenca_milli: number
  /** O que o ledger dizia antes da contagem. */
  esperado_milli: number
  product_sku: string
  /** `saida` quando falta, `entrada` quando sobra. */
  tipo: 'entrada' | 'saida'
}

export type ResultadoInventario = {
  ajustes: Ajuste[]
  /** SKUs contados que ja batiam com o ledger. */
  sem_diferenca: string[]
  /** Contagens ignoradas por dado invalido. */
  invalidas: string[]
}

/**
 * Compara o contado com o saldo e devolve os ajustes necessarios.
 *
 * Regras que evitam erro silencioso:
 *
 * 1. **Diferenca zero nao gera movimento.** Um lancamento de quantidade zero poluiria o ledger sem mudar nada.
 * 2. **SKU sem saldo conhecido nao vira ajuste.** Se o produto nunca teve movimento, a contagem pode ser de um
 *    SKU digitado errado; gerar entrada por isso criaria estoque de um produto que talvez nao exista.
 * 3. **Contagem negativa e invalida.** Nao existe -3 unidades fisicas; e erro de digitacao, e virar ajuste
 *    esconderia o erro.
 * 4. **SKU repetido na contagem** — a ultima contagem vale, porque e a correcao do contador.
 */
export function planejarInventario(
  contagens: readonly Contagem[],
  saldos: Readonly<Record<string, number>>
): ResultadoInventario {
  const ajustes: Ajuste[] = []
  const sem_diferenca: string[] = []
  const invalidas: string[] = []

  // A ultima contagem de cada SKU vence: se o contador recontou, ele quis corrigir o primeiro numero.
  const porSku = new Map<string, number>()

  for (const contagem of contagens) {
    const sku = String(contagem?.product_sku ?? '').trim()
    const contado = Number(contagem?.contado_milli)

    if (!sku || !Number.isFinite(contado) || contado < 0) {
      invalidas.push(sku || '(sem sku)')
      continue
    }

    porSku.set(sku, Math.round(contado))
  }

  for (const [sku, contado] of porSku) {
    const esperado = saldos[sku]

    // Sem saldo conhecido nao ha o que reconciliar: pode ser SKU errado, e criar estoque por isso seria pior
    // que nao fazer nada.
    if (typeof esperado !== 'number' || !Number.isFinite(esperado)) {
      invalidas.push(sku)
      continue
    }

    const diferenca = contado - esperado

    if (diferenca === 0) {
      sem_diferenca.push(sku)
      continue
    }

    ajustes.push({
      diferenca_milli: diferenca,
      esperado_milli: esperado,
      product_sku: sku,
      tipo: diferenca > 0 ? 'entrada' : 'saida'
    })
  }

  // Ordem estavel por SKU: dois inventarios do mesmo conjunto geram a mesma lista, e o teste (ou um diff de
  // auditoria) compara sem ruido de ordem de insercao.
  ajustes.sort((a, b) => a.product_sku.localeCompare(b.product_sku))

  return { ajustes, invalidas, sem_diferenca }
}

/** Movimentos prontos para o ledger, com `ref` deterministico por inventario. */
export function movimentosDoInventario(
  resultado: ResultadoInventario,
  inventarioId: string
): Array<{ kind: 'entrada' | 'saida'; product_sku: string; quantity_milli: number; reason: string; ref: string }> {
  return resultado.ajustes.map(ajuste => ({
    kind: ajuste.tipo,
    product_sku: ajuste.product_sku,
    quantity_milli: Math.abs(ajuste.diferenca_milli),
    reason: 'inventario',
    ref: `inventario:${inventarioId}:${ajuste.product_sku}`
  }))
}
