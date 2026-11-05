// Cotacoes persistidas: a proposta deixa de morrer quando a tela fecha (rodada 198).
//
// O QUE ISTO RESOLVE
//
// A r194 montou o painel de cotacao, mas as propostas viviam no estado do componente: sair de `#/compras` e
// voltar apagava tudo. Quem cotou cinco fornecedores perdia o trabalho ao trocar de tela.
//
// O QUE ISTO NAO RESOLVE, DE PROPOSITO
//
// Cotacao gravada NAO e pedido. Ela nao compromete dinheiro, nao entra no estoque e nao gera conta a pagar.
// Transformar proposta em compromisso e a operacao seguinte (`saveOrder`), com aprovacao propria (r182). Se
// este store criasse pedido, comparar tres fornecedores criaria tres dividas.
//
// E ELA NAO E IMUTAVEL. Uma cotacao envelhece: o fornecedor muda o preco, o prazo passa. Por isso guarda
// `created_at` e a tela decide se ainda vale — o store nao apaga sozinho o que pode estar sendo usado.

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { DEFAULT_TENANT } from './catalog-store'

export interface CotacaoGravada {
  /** Prazo em dias, ja normalizado da proposta. `null` = nao informado. */
  prazo_dias: number | null
  created_at: number
  /** Chave estavel para remover sem depender do indice na lista. */
  id: string
  preco_unit_cents: number
  /**
   * O produto cotado (r47 do GOAL V2).
   *
   * Sem ele a cotacao comparava fornecedores SEM SABER DE QUE PRODUTO - e escolhia o mais
   * barato entre propostas que podiam ser de itens diferentes.
   *
   * Vazio em cotacao antiga (compatibilidade): a leitura aceita, a gravacao exige.
   */
  product_sku: string
  quantidade_disponivel: number
  supplier_id: string
  tenant_id: string
}

export interface CotacaoStoreFile {
  cotacoes: CotacaoGravada[]
  version: 1
}

export const COTACAO_VERSION = 1

export function quotationsStorePath(userDataDir: string): string {
  return join(userDataDir, 'b3po', 'quotations.json')
}

const VAZIO: CotacaoStoreFile = { cotacoes: [], version: COTACAO_VERSION }

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : ''
}

/** Le um registro gravado, ou `null` se ele nao for reconhecivel. Nunca "conserta" adivinhando. */
export function lerCotacao(bruto: unknown): CotacaoGravada | null {
  if (!bruto || typeof bruto !== 'object') return null

  const raw = bruto as Record<string, unknown>
  const id = texto(raw['id'])
  const supplier_id = texto(raw['supplier_id'])
  const preco = Number(raw['preco_unit_cents'])
  const quantidade = Number(raw['quantidade_disponivel'])
  const created_at = Number(raw['created_at'])

  if (!id || !supplier_id) return null
  if (!Number.isFinite(preco) || preco <= 0) return null
  if (!Number.isFinite(quantidade) || quantidade <= 0) return null
  if (!Number.isFinite(created_at) || created_at <= 0) return null

  const prazo = raw['prazo_dias']

  return {
    created_at,
    id,
    prazo_dias: typeof prazo === 'number' && Number.isFinite(prazo) && prazo >= 0 ? prazo : null,
    preco_unit_cents: Math.round(preco),
    // r47: cotação gravada antes desta rodada não tem SKU. Ler como vazio é o que permite abrir um
    // arquivo antigo — exigir aqui puniria o usuário por uma atualização.
    product_sku: texto(raw['product_sku']),
    quantidade_disponivel: Math.round(quantidade),
    supplier_id,
    tenant_id: texto(raw['tenant_id']) || DEFAULT_TENANT
  }
}

/**
 * Le o arquivo inteiro. Arquivo ausente ou corrompido devolve vazio em vez de derrubar a janela — a mesma
 * disciplina dos outros dominios.
 */
export function parseCotacaoStore(raw: string): CotacaoStoreFile {
  try {
    const bruto = JSON.parse(raw) as Record<string, unknown>
    const lista = Array.isArray(bruto['cotacoes']) ? bruto['cotacoes'] : []
    const cotacoes: CotacaoGravada[] = []

    for (const item of lista) {
      const lida = lerCotacao(item)

      if (lida) cotacoes.push(lida)
    }

    return { cotacoes, version: COTACAO_VERSION }
  } catch {
    return { ...VAZIO, cotacoes: [] }
  }
}

export type ResultadoCotacao =
  | { cotacoes: CotacaoGravada[] }
  | { error: 'cotacao_sem_id' | 'cotacao_produto_obrigatorio' | 'cotacao_sem_fornecedor' | 'cotacao_preco_invalido' | 'cotacao_quantidade_invalida' }

export class QuotationStore {
  constructor(private readonly file: string) {}

  private async carregar(): Promise<CotacaoStoreFile> {
    try {
      return parseCotacaoStore(await readFile(this.file, 'utf8'))
    } catch {
      return { ...VAZIO, cotacoes: [] }
    }
  }

  private async gravar(estado: CotacaoStoreFile): Promise<void> {
    await mkdir(dirname(this.file), { recursive: true })

    const temporario = `${this.file}.${process.pid}.tmp`

    await writeFile(temporario, JSON.stringify(estado, null, 2), 'utf8')
    await rename(temporario, this.file)
  }

  async list(tenantId?: string): Promise<CotacaoGravada[]> {
    const tenant = texto(tenantId) || DEFAULT_TENANT
    const estado = await this.carregar()

    return estado.cotacoes.filter(c => c.tenant_id === tenant).sort((a, b) => b.created_at - a.created_at)
  }

  /**
   * Grava uma proposta. Repetir o mesmo `id` substitui em vez de duplicar: uma recontagem do mesmo fornecedor
   * para o mesmo item e correcao, nao uma segunda proposta.
   */
  async save(payload: unknown): Promise<ResultadoCotacao> {
    const raw = (payload ?? {}) as Record<string, unknown>
    const id = texto(raw['id'])

    if (!id) return { error: 'cotacao_sem_id' }
    if (!texto(raw['supplier_id'])) return { error: 'cotacao_sem_fornecedor' }

    const preco = Number(raw['preco_unit_cents'])

    if (!Number.isFinite(preco) || preco <= 0) return { error: 'cotacao_preco_invalido' }

    const quantidade = Number(raw['quantidade_disponivel'])

    if (!Number.isFinite(quantidade) || quantidade <= 0) return { error: 'cotacao_quantidade_invalida' }

    const estado = await this.carregar()
    const prazo = Number(raw['prazo_dias'])

    // r47: a cotação agora SABE de que produto é. Sem isto ela comparava fornecedores de itens diferentes
    // — e escolhia o mais barato entre a proposta de parafuso e a proposta de areia.
    //
    // Na GRAVAÇÃO é obrigatório (é o que corrige o modelo); na LEITURA é opcional (é o que abre o arquivo
    // antigo). As duas decisões são diferentes de propósito.
    const sku = texto(raw['product_sku'])

    if (!sku) return { error: 'cotacao_produto_obrigatorio' }

    const nova: CotacaoGravada = {
      created_at: Number(raw['created_at']) > 0 ? Number(raw['created_at']) : Date.now(),
      id,
      prazo_dias: Number.isFinite(prazo) && prazo >= 0 ? Math.round(prazo) : null,
      preco_unit_cents: Math.round(preco),
      product_sku: sku,
      quantidade_disponivel: Math.round(quantidade),
      supplier_id: texto(raw['supplier_id']),
      tenant_id: texto(raw['tenant_id']) || DEFAULT_TENANT
    }

    estado.cotacoes = [...estado.cotacoes.filter(c => c.id !== id), nova]
    await this.gravar(estado)

    return { cotacoes: await this.list(nova.tenant_id) }
  }

  /** Remove uma proposta. Remover o que nao existe nao e erro: o estado final e o mesmo. */
  async remove(id: unknown): Promise<{ cotacoes: CotacaoGravada[] }> {
    const alvo = texto(id)
    const estado = await this.carregar()

    estado.cotacoes = estado.cotacoes.filter(c => c.id !== alvo)
    await this.gravar(estado)

    return { cotacoes: await this.list() }
  }
}
