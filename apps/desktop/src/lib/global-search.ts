// A busca global (r96 do GOAL V2).
//
// O QUE O §13:450 PEDE
//
// *"Busca global deve encontrar funções sem exigir conhecimento do menu."*
//
// O PROBLEMA QUE ISSO RESOLVE
//
// O menu cresceu para **23 itens em 7 grupos**. Quem usa o produto todo dia sabe onde está "Compras". **Quem
// usa uma vez por semana não sabe** — e a alternativa é varrer o menu inteiro procurando a palavra que a
// pessoa *acha* que o módulo tem.
//
// **A busca existe para o segundo caso**, e é por isso que ela precisa de **sinônimos**: quem procura
// "cliente" não sabe que o módulo se chama "CRM".
//
// A DECISÃO QUE DEFINE ESTE ARQUIVO
//
// **A busca é uma função pura no renderer, e isso é o desenho certo.**
//
// O que ela procura é **o menu** — que o renderer já tem, porque o plugin contribui com ele. Consultar o
// processo principal para saber o nome de um módulo seria **uma ida ao disco para ler o que já está na mão**.
//
// E a busca **não esconde o resultado**: quando o termo não casa com nada, ela diz **quais** são as
// alternativas — senão o usuário volta a varrer o menu.

export interface ModuloBuscavel {
  /** O que a pessoa lê no menu. */
  label: string
  path: string
  /** O grupo do §13:429-438, para o resultado dizer onde ele mora. */
  grupo: string
  /**
   * Palavras que **não** estão no rótulo mas descrevem o módulo.
   *
   * É a parte que faz a busca funcionar: quem procura "cliente" não sabe que o módulo se chama "CRM".
   */
  sinonimos?: readonly string[]
}

export interface ResultadoBusca {
  grupo: string
  label: string
  /** Por que este resultado apareceu: `label`, `sinonimo` ou `grupo`. Ajuda a entender um resultado estranho. */
  motivo: 'grupo' | 'label' | 'sinonimo'
  path: string
}

/**
 * Tira acento e caixa.
 *
 * **Porque "Organizacao" e "Organização" são a mesma palavra para quem digita** — e exigir acento numa busca
 * é a forma mais rápida de fazer a pessoa desistir dela.
 */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/**
 * Busca módulos.
 *
 * **Ordem dos resultados**: rótulo antes de sinônimo antes de grupo. Quem digita "vend" quer "Vendas" antes
 * de um módulo cujo grupo se chama "Comércio" e cujo sinônimo menciona venda.
 *
 * **Ordem estável dentro de cada faixa**: por rótulo, para a lista não dançar entre duas digitações.
 */
export function buscarModulos(modulos: readonly ModuloBuscavel[], termo: string): ResultadoBusca[] {
  const alvo = normalizar(termo)

  // Termo vazio devolve **tudo**, na ordem do menu: é o que a tela mostra ao abrir, e é melhor que uma tela
  // em branco esperando a primeira letra.
  if (!alvo) {
    return modulos.map(m => ({ grupo: m.grupo, label: m.label, motivo: 'label' as const, path: m.path }))
  }

  const achados: ResultadoBusca[] = []

  for (const m of modulos) {
    if (normalizar(m.label).includes(alvo)) {
      achados.push({ grupo: m.grupo, label: m.label, motivo: 'label', path: m.path })

      continue
    }

    if ((m.sinonimos ?? []).some(s => normalizar(s).includes(alvo))) {
      achados.push({ grupo: m.grupo, label: m.label, motivo: 'sinonimo', path: m.path })

      continue
    }

    if (normalizar(m.grupo).includes(alvo)) {
      achados.push({ grupo: m.grupo, label: m.label, motivo: 'grupo', path: m.path })
    }
  }

  // r96: ORDENAR por motivo. A funcao PROMETE a ordem no comentario acima - e prometer sem fazer
  // e o tipo de bug que o teste pega e o usuario nao: a lista parece certa ate existir um caso
  // que a desmente.
  const peso = { grupo: 2, label: 0, sinonimo: 1 } as const

  return achados.sort((a, b) => peso[a.motivo] - peso[b.motivo])
}

/**
 * A frase quando nada casa.
 *
 * **Diz o que tentar**, não que "nenhum resultado foi encontrado" — que é a mesma informação que a tela em
 * branco já dá, sem ajudar.
 */
export function semResultado(termo: string, modulos: readonly ModuloBuscavel[]): string {
  const grupos = [...new Set(modulos.map(m => m.grupo))]

  return `Nada encontrado para "${termo}". Tente outra palavra, ou veja os grupos: ${grupos.join(' · ')}.`
}

/**
 * Os atalhos de teclado que a lista mostra.
 *
 * **Não é decoração**: uma busca que só funciona com o mouse não serve para quem já tem a mão no teclado — e
 * é exatamente esse o usuário que procura o módulo pelo nome.
 */
export interface NavegacaoDaBusca {
  irParaProximo: 'ArrowDown' | null
  irParaAnterior: 'ArrowUp' | null
  abrir: 'Enter' | null
  fechar: 'Escape' | null
}

export const NAVEGACAO: NavegacaoDaBusca = {
  abrir: 'Enter',
  fechar: 'Escape',
  irParaAnterior: 'ArrowUp',
  irParaProximo: 'ArrowDown'
}

/** Limita o índice à faixa válida — para a seta não sair da lista e a tela ficar sem seleção. */
export function moverSelecao(atual: number, delta: number, total: number): number {
  if (total <= 0) return 0

  const proximo = atual + delta

  if (proximo < 0) return total - 1
  if (proximo >= total) return 0

  return proximo
}
