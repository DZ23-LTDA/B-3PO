/**
 * A estrutura da organização no renderer (r90 do GOAL V2).
 *
 * O QUE A TELA PODE E NÃO PODE FAZER
 *
 * `definir` é ação; `estrutura`, `listar`, `sugestao` e `setorConhecido` são consulta.
 *
 * A SUGESTÃO VEM DO CANAL, NÃO DO CATÁLOGO LOCAL
 *
 * Seria mais simples importar `estruturaPara` e ter a sugestão na hora, sem IPC. **Mas o renderer é um
 * bundle**: ele é construído uma vez e pode ficar aberto enquanto o processo principal roda uma versão
 * diferente. Uma cópia local do catálogo **envelhece** — e a tela mostraria uma estrutura que o produto já
 * não sugere.
 *
 * `sugestaoDoSetor()` pergunta. É uma chamada por abertura de tela, e o custo é o de não mentir.
 */

export const SETOR_LABEL: Record<string, string> = {
  distribuidora_gas: 'Distribuidora de gás',
  servico: 'Prestador de serviço',
  varejo: 'Varejo de balcão'
}

export interface DepartamentoRow {
  faz: string
  nome: string
}

export interface EstruturaRow {
  company_id: string
  departamentos: DepartamentoRow[]
  setor: string
  tenant_id: string
  unidades: string[]
}

/** A sugestão **e** o catálogo: um `null` sem o catálogo não diz o que oferecer. */
export interface SugestaoRow {
  departamentos: DepartamentoRow[] | null
  setores: { label: string; setor: string }[]
}

export const ORGANIZACAO_ERRO: Record<string, string> = {
  company_obrigatoria: 'Empresa não informada.',
  departamento_duplicado:
    'Há dois departamentos com o mesmo nome. "Financeiro" e "financeiro" são o mesmo lugar.',
  departamento_sem_nome: 'Todo departamento precisa de um nome.',
  empresa_inexistente: 'Esta empresa não existe mais. Crie-a antes de desenhar a estrutura.',
  setor_invalido:
    'O produto não conhece este setor. Monte a estrutura à mão em vez de receber uma sugestão inventada.',
  unidade_duplicada: 'Há duas unidades com o mesmo nome.'
}

export function organizacaoErroText(codigo: string): string {
  return ORGANIZACAO_ERRO[codigo] ?? `Não foi possível: ${codigo}`
}

interface Bridge {
  definir: (payload: Record<string, unknown>) => Promise<{ error: string } | { estrutura: EstruturaRow; estruturas: EstruturaRow[] }>
  estrutura: (companyId: string) => Promise<{ error: string } | { estrutura: EstruturaRow | null }>
  listar: (tenantId?: string) => Promise<{ error: string } | { estruturas: EstruturaRow[] }>
  setorConhecido: (setor: string) => Promise<{ conhecido: boolean; label: null | string }>
  sugestao: (setor: string) => Promise<{ error: string } | SugestaoRow>
}

function bridge(): Bridge | null {
  return (globalThis as { hermesDesktop?: { organizacao?: Bridge } }).hermesDesktop?.organizacao ?? null
}

export function organizacaoDisponivel(): boolean {
  return bridge() !== null
}

/** A estrutura de uma empresa. `null` é **resposta**: quer dizer que ninguém desenhou ainda. */
export async function estruturaDaEmpresa(companyId: string): Promise<EstruturaRow | null> {
  const api = bridge()

  if (!api) return null

  const r = await api.estrutura(companyId)

  return 'estrutura' in r ? r.estrutura : null
}

export async function estruturasDefinidas(): Promise<EstruturaRow[]> {
  const api = bridge()

  if (!api) return []

  const r = await api.listar()

  return 'estruturas' in r ? r.estruturas : []
}

/**
 * A sugestão para um setor — **do processo principal**.
 *
 * Devolve `{ departamentos: null, setores }` quando o setor não é conhecido: a tela precisa poder dizer
 * *"não conheço este negócio"* **e** oferecer os que conhece.
 */
export async function sugestaoDoSetor(setor: string): Promise<SugestaoRow> {
  const api = bridge()

  if (!api) return { departamentos: null, setores: [] }

  const r = await api.sugestao(setor)

  return 'error' in r ? { departamentos: null, setores: [] } : r
}

export async function setorEhConhecido(setor: string): Promise<{ conhecido: boolean; label: null | string }> {
  const api = bridge()

  if (!api) return { conhecido: false, label: null }

  return api.setorConhecido(setor)
}

export async function definirEstrutura(
  companyId: string,
  desenho: { departamentos: DepartamentoRow[]; setor: string; unidades?: string[] }
): Promise<{ error: string } | { estrutura: EstruturaRow; estruturas: EstruturaRow[] }> {
  const api = bridge()

  if (!api) return { error: 'indisponivel' }

  // `company_id` em campo próprio: achatado, ele entraria na validação como campo de departamento.
  return api.definir({ company_id: companyId, desenho })
}

/**
 * Os departamentos que **não dizem o que fazem**.
 *
 * A tela usa isto para destacar: um departamento sem função é **uma caixa no organograma** (r81), e a frase
 * é a mesma do processo principal.
 */
export function departamentosSemFuncao(estrutura: EstruturaRow): string[] {
  return estrutura.departamentos.filter(d => !d.faz.trim()).map(d => d.nome)
}

/** "3 departamentos · 2 unidades · sem função: Compras" — a frase que a tela mostra. */
export function resumoDaEstrutura(estrutura: EstruturaRow): string {
  const partes = [`${estrutura.departamentos.length} departamento(s)`]

  if (estrutura.unidades.length > 0) partes.push(`${estrutura.unidades.length} unidade(s)`)

  const semFuncao = departamentosSemFuncao(estrutura)

  // Pelo NOME, não pela contagem: "2 sem função" obrigaria a procurar quais.
  if (semFuncao.length > 0) partes.push(`sem função: ${semFuncao.join(', ')}`)

  return partes.join(' · ')
}
