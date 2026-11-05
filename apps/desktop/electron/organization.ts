// O Organization Builder (r81 do GOAL V2).
//
// O QUE O §12 PEDE
//
// *"Organization Builder estrutura empresas conforme setor e operação."* — e lista o que a organização
// contém: *"empresa, unidades, departamentos, pessoas, agentes, processos, dados, permissões, indicadores e
// integrações."*
//
// O QUE JÁ EXISTIA, E O QUE FALTAVA
//
// `companies-store` guarda **o cadastro**: nome, CNPJ, endereço. Um cadastro não é uma estrutura — é a
// certidão. **O desenho — quem faz o quê, em que unidade — não existia.**
//
// A DECISÃO QUE DEFINE ESTE ARQUIVO
//
// **O catálogo de setores é fechado, e pequeno.**
//
// Um Organization Builder que "sugere" uma estrutura para qualquer negócio precisa conhecer o negócio. O
// produto serve **três**: a distribuidora de gás do §17, o varejo de balcão e o prestador de serviço. Para
// os outros, a função **devolve `null`** — e a tela pede que a pessoa monte, em vez de receber uma sugestão
// inventada.
//
// **Uma sugestão errada é pior que nenhuma sugestão**: ela vira a estrutura real de uma empresa, e desfazer
// uma estrutura é mais caro que criar uma.
//
// A SEGUNDA DECISÃO — e ela vem do próprio §12
//
// *"Não criar equipe enorme para tarefa simples."*
//
// `dimensionar` mede a estrutura contra o trabalho que existe. Uma empresa de **um** botijão por dia com
// **seis** departamentos é uma organização inventada para impressionar — e o produto se recusa a
// validá-la como razoável.

/** Os setores que o produto conhece. Fechado de propósito: ver o cabeçalho. */
export const SETORES = ['distribuidora_gas', 'varejo', 'servico'] as const

export type Setor = (typeof SETORES)[number]

export function isSetor(valor: unknown): valor is Setor {
  return typeof valor === 'string' && (SETORES as readonly string[]).includes(valor)
}

export const SETOR_LABEL: Record<Setor, string> = {
  distribuidora_gas: 'Distribuidora de gás',
  servico: 'Prestador de serviço',
  varejo: 'Varejo de balcão'
}

export interface Departamento {
  /** O que ele entrega. Uma frase, e a mesma pergunta que o projeto faz ao objetivo. */
  faz: string
  nome: string
}

/**
 * Estrutura sugerida por setor.
 *
 * **Três departamentos no máximo.** Uma estrutura que a pessoa não consegue explicar de memória não é uma
 * estrutura — é um organograma de apresentação.
 */
const ESTRUTURAS: Record<Setor, readonly Departamento[]> = {
  distribuidora_gas: [
    { faz: 'atende o pedido, agenda a entrega e resolve a troca', nome: 'Atendimento' },
    { faz: 'mantém o estoque, carrega o caminhão e recolhe o vazio', nome: 'Logística' },
    { faz: 'compra, cobra e paga', nome: 'Financeiro' }
  ],
  servico: [
    { faz: 'recebe o pedido, agenda e acompanha', nome: 'Atendimento' },
    { faz: 'executa o serviço', nome: 'Execução' }
  ],
  varejo: [
    { faz: 'atende no balcão e fecha a venda', nome: 'Balcão' },
    { faz: 'reposição e contagem', nome: 'Estoque' }
  ]
}

/**
 * A estrutura sugerida para um setor.
 *
 * **`null` para setor desconhecido** — e `null` é uma resposta, não uma falha: significa *"não sei este
 * negócio, monte você"*.
 */
export function estruturaPara(setor: unknown): Departamento[] | null {
  if (!isSetor(setor)) return null

  // Cópia: quem receber pode editar sem alterar o catálogo.
  return ESTRUTURAS[setor].map(d => ({ ...d }))
}

export interface Organizacao {
  departamentos: Departamento[]
  setor: Setor
  tenant_id: string
  unidades: string[]
}

export type RecusaOrganizacao =
  | 'departamento_duplicado'
  | 'departamento_sem_nome'
  | 'setor_invalido'
  | 'unidade_duplicada'

export function validarOrganizacao(input: unknown): { error: RecusaOrganizacao } | { organizacao: Organizacao } {
  const raw = (input ?? {}) as Record<string, unknown>

  if (!isSetor(raw['setor'])) return { error: 'setor_invalido' }

  const lista = Array.isArray(raw['departamentos']) ? raw['departamentos'] : []
  const vistos = new Set<string>()
  const departamentos: Departamento[] = []

  for (const item of lista) {
    const d = (item ?? {}) as Record<string, unknown>
    const nome = typeof d['nome'] === 'string' ? d['nome'].trim() : ''

    if (!nome) return { error: 'departamento_sem_nome' }

    const chave = nome.toLowerCase()

    // Duplicata é recusada mesmo com caixa diferente: "Financeiro" e "financeiro" são o mesmo lugar, e
    // dois departamentos iguais dividiriam as pessoas entre duas listas.
    if (vistos.has(chave)) return { error: 'departamento_duplicado' }

    vistos.add(chave)
    departamentos.push({ faz: typeof d['faz'] === 'string' ? d['faz'].trim() : '', nome })
  }

  const unidades = Array.isArray(raw['unidades'])
    ? raw['unidades'].filter((u): u is string => typeof u === 'string' && u.trim().length > 0).map(u => u.trim())
    : []

  if (new Set(unidades.map(u => u.toLowerCase())).size !== unidades.length) return { error: 'unidade_duplicada' }

  return {
    organizacao: {
      departamentos,
      setor: raw['setor'],
      tenant_id: typeof raw['tenant_id'] === 'string' ? raw['tenant_id'] : 'local',
      unidades
    }
  }
}

/**
 * A estrutura está grande demais para o trabalho?
 *
 * Do §12: *"Não criar equipe enorme para tarefa simples."*
 *
 * **A régua é grosseira de propósito**: quantos departamentos existem contra quantas frentes de trabalho
 * estão abertas. Um departamento sem trabalho é uma cadeira vazia — e cadeira vazia vira reunião.
 *
 * **Não recusa** — avisa. Quem sabe que a estrutura é grande é o dono, e o produto não tem opinião sobre a
 * ambição de ninguém. O que ele faz é **dizer o número**.
 */
export function dimensionar(
  organizacao: Organizacao,
  frentesAbertas: number
): { aviso: null | string; departamentos: number; frentes: number; razoavel: boolean } {
  const departamentos = organizacao.departamentos.length
  const frentes = Math.max(0, Math.trunc(frentesAbertas))

  // Até 2 departamentos por frente é folgado; acima disso, a estrutura promete mais do que o trabalho pede.
  const razoavel = departamentos === 0 || departamentos <= Math.max(1, frentes) * 2

  return {
    aviso: razoavel
      ? null
      : `São ${departamentos} departamentos para ${frentes} frente(s) de trabalho. ` +
        'O §12 pede para não criar equipe grande para tarefa simples — comece com o que tem trabalho.',
    departamentos,
    frentes,
    razoavel
  }
}

/**
 * A organização está pronta para operar?
 *
 * Três perguntas, e **todas as três importam**:
 *
 * 1. tem setor conhecido?  — sem ele, a sugestão foi inventada
 * 2. tem pelo menos um departamento? — uma empresa sem departamento não tem onde o trabalho acontecer
 * 3. **todo departamento diz o que faz?** — um nome sem função é uma caixa no organograma
 */
export function podeOperar(organizacao: Organizacao): { motivo: 'departamento_sem_funcao' | 'sem_departamento' | 'sem_setor'; ok: false } | { ok: true } {
  if (!isSetor(organizacao.setor)) return { motivo: 'sem_setor', ok: false }

  if (organizacao.departamentos.length === 0) return { motivo: 'sem_departamento', ok: false }

  if (organizacao.departamentos.some(d => !d.faz.trim())) return { motivo: 'departamento_sem_funcao', ok: false }

  return { ok: true }
}

/** O resumo para a tela — diz quantos e **quais** frentes não têm nome. */
export function resumoDaOrganizacao(organizacao: Organizacao): string {
  const total = organizacao.departamentos.length

  if (total === 0) return 'Nenhum departamento definido.'

  const semFuncao = organizacao.departamentos.filter(d => !d.faz.trim()).map(d => d.nome)
  const partes = [`${total} departamento(s)`]

  if (organizacao.unidades.length > 0) partes.push(`${organizacao.unidades.length} unidade(s)`)

  // A ausência é dita pelo NOME, não pela contagem: "2 sem função" obriga a procurar quais.
  if (semFuncao.length > 0) partes.push(`sem função: ${semFuncao.join(', ')}`)

  return partes.join(' · ')
}
