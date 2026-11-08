// Retencao de dados pessoais (rodada 212).
//
// O QUE FALTAVA
//
// `privacy.ts` cobre o art. 18 I (acesso) e VI (eliminacao). Nao cobria o prazo: por quanto tempo cada
// categoria de dado pode ficar guardada antes de virar passivo.
//
// A REGRA QUE GOVERNA ESTE MODULO
//
// **Retencao NAO apaga.** Ela diz "este dado venceu" e o humano decide. O `privacy.ts` ja documenta que
// exclusao e destrutiva e que o armazenamento nao tem lixeira: apagar um contato do CRM leva junto as tarefas
// e as oportunidades ligadas a ele. Um prazo que apagasse sozinho transformaria uma politica de conformidade
// num incidente de perda de dado.
//
// O QUE ELE TAMBEM NAO FAZ
//
// Nao julga a base legal. Um dado com obrigacao legal de guarda (fiscal, trabalhista) nao vence por prazo de
// marketing — quem declara isso e o dono, na politica. O modulo aplica o prazo que recebe.

export type CategoriaDeDado =
  | 'cadastro' // nome, telefone, e-mail de contato
  | 'conversa'
  | 'financeiro' // tem guarda legal; prazo tipicamente maior
  | 'rh'
  | 'marketing'

export type Prazos = Partial<Record<CategoriaDeDado, number | null>>

export type Registro = {
  categoria: CategoriaDeDado
  criado_em: number
  /** Identificador legivel, para o relatorio nomear o que venceu sem expor o conteudo. */
  id: string
}

export type Vencido = {
  categoria: CategoriaDeDado
  /** Dias alem do prazo. 0 = vence hoje. */
  dias_alem: number
  id: string
}

export type ResultadoRetencao = {
  /** Registros cuja categoria nao tem prazo — nao vencem, e a tela diz isso em vez de omitir. */
  sem_prazo: number
  vencidos: Vencido[]
}

const DIA_MS = 24 * 60 * 60 * 1000

/**
 * Registros que passaram do prazo da propria categoria.
 *
 * Regras:
 *
 * 1. **Categoria sem prazo nunca vence.** `null` e ausencia de politica, nao "prazo zero" — tratar como zero
 *    marcaria todo o banco como vencido no primeiro dia.
 * 2. **A data de referencia e parametro.** Um relatorio de conformidade que usa o relogio muda de resposta
 *    entre duas execucoes do mesmo dia.
 * 3. **A ordem e estavel** (mais antigo primeiro, empate pelo id): dois relatorios do mesmo conjunto
 *    concordam.
 */
export function vencidos(registros: readonly Registro[], prazos: Prazos, agora: number): ResultadoRetencao {
  const lista: Vencido[] = []
  let semPrazo = 0

  for (const registro of registros) {
    const prazo = prazos[registro.categoria]

    // `null` e `undefined` sao a mesma coisa aqui: ninguem declarou prazo para esta categoria.
    if (typeof prazo !== 'number' || !Number.isFinite(prazo) || prazo < 0) {
      semPrazo += 1
      continue
    }

    const limite = registro.criado_em + prazo * DIA_MS

    if (agora <= limite) continue

    lista.push({
      categoria: registro.categoria,
      dias_alem: Math.floor((agora - limite) / DIA_MS),
      id: registro.id
    })
  }

  lista.sort((a, b) => (a.dias_alem !== b.dias_alem ? b.dias_alem - a.dias_alem : a.id.localeCompare(b.id)))

  return { sem_prazo: semPrazo, vencidos: lista }
}

/** Resumo por categoria, para o relatorio nao listar mil linhas quando o dono quer o quadro. */
export function resumoPorCategoria(resultado: ResultadoRetencao): Record<string, { quantidade: number; mais_antigo_dias: number }> {
  const resumo: Record<string, { quantidade: number; mais_antigo_dias: number }> = {}

  for (const vencido of resultado.vencidos) {
    const atual = resumo[vencido.categoria]

    if (atual) {
      atual.quantidade += 1
      atual.mais_antigo_dias = Math.max(atual.mais_antigo_dias, vencido.dias_alem)
    } else {
      resumo[vencido.categoria] = { mais_antigo_dias: vencido.dias_alem, quantidade: 1 }
    }
  }

  return resumo
}
