// Documento fiscal persistido (rodada 104).
//
// O QUE ESTE ARQUIVO RESOLVE
//
// O provedor sabe emitir, mas nada guardava o resultado: a nota existiria só na resposta de uma chamada. Sem
// registro, o operador não reimprime, o agente não consulta, e ninguém sabe se aquela venda já foi emitida.
//
// IDEMPOTÊNCIA POR `ref`
//
// `ref` é `venda:<id>`. Emitir duas vezes o mesmo pedido devolve o registro existente em vez de emitir de
// novo. Isso é o mesmo contrato do estoque e do financeiro: o `ref` é a chave natural da operação.
//
// HOMOLOGAÇÃO É UM CAMPO, NÃO UM ESTADO DE ESPÍRITO
//
// Todo registro carrega `homologacao`. A tela mostra a diferença entre "nota autorizada" e "documento de
// homologação" a partir deste campo — nunca de uma suposição sobre qual provedor está ativo.

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { avaliarMotivo } from './fiscal-cancel'
import type { FiscalDocumentKind, FiscalProvider, FiscalStatus, PedidoFiscal } from './fiscal-provider'

const DEFAULT_TENANT = 'local'

export interface FiscalRecord {
  chave: string
  created_at: number
  /** true quando o provedor não fala com a autoridade tributária. */
  homologacao: boolean
  id: string
  kind: FiscalDocumentKind
  mensagem: string
  numero: string
  /** `venda:<id>` — a chave natural da operação. */
  ref: string
  status: FiscalStatus
  tenant_id: string
  updated_at: number
  url_danfe: string
}

interface FiscalFile {
  documents: FiscalRecord[]
  schema_version: 1
}

export function fiscalStorePath(userDataDir: string): string {
  return join(userDataDir, 'b3po', 'fiscal.json')
}

function vazio(): FiscalFile {
  return { documents: [], schema_version: 1 }
}

function texto(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function parseFiscal(raw: string): FiscalFile {
  try {
    const dados = JSON.parse(raw) as Partial<FiscalFile>
    const lista = Array.isArray(dados.documents) ? dados.documents : []

    return {
      documents: lista
        .filter(d => d && typeof d === 'object')
        .map(d => ({
          chave: texto(d.chave),
          created_at: typeof d.created_at === 'number' ? d.created_at : 0,
          homologacao: d.homologacao === true,
          id: texto(d.id),
          kind: (d.kind === 'nfce' || d.kind === 'nfse' ? d.kind : 'nfe') as FiscalDocumentKind,
          mensagem: texto(d.mensagem),
          numero: texto(d.numero),
          ref: texto(d.ref),
          status: (['pendente', 'autorizado', 'rejeitado', 'cancelado'].includes(String(d.status))
            ? d.status
            : 'pendente') as FiscalStatus,
          tenant_id: texto(d.tenant_id) || DEFAULT_TENANT,
          updated_at: typeof d.updated_at === 'number' ? d.updated_at : 0,
          url_danfe: texto(d.url_danfe)
        }))
        .filter(d => d.id && d.ref),
      schema_version: 1
    }
  } catch {
    return vazio()
  }
}

export class FiscalStore {
  constructor(private readonly filePath: string) {}

  async list(tenantId: string = DEFAULT_TENANT): Promise<FiscalRecord[]> {
    const file = await this.read()

    return file.documents.filter(d => d.tenant_id === tenantId)
  }

  /** Todos, sem filtro. Necessário porque `write` grava o arquivo inteiro (a armadilha da rodada 83). */
  private async readAll(): Promise<FiscalFile> {
    return this.read()
  }

  /**
   * Emite e grava. Idempotente por `ref`: se já existe registro para a mesma `ref`, devolve o existente.
   *
   * `created_at` do registro anterior é preservado quando o mesmo `ref` é reemitido — a data da primeira
   * emissão é o fato, não a data da última tentativa.
   */
  async emitir(provider: FiscalProvider, pedido: PedidoFiscal): Promise<{ error: string } | { existing: true; record: FiscalRecord } | { existing: false; record: FiscalRecord }> {
    const file = await this.readAll()
    const jaTem = file.documents.find(d => d.ref === pedido.ref && d.tenant_id === pedido.tenant_id)

    if (jaTem) return { existing: true, record: jaTem }

    const agora = Date.now()
    const pendente: FiscalRecord = {
      chave: '',
      created_at: agora,
      homologacao: !provider.homologado,
      id: `fis_${agora}_${Math.random().toString(36).slice(2, 8)}`,
      kind: pedido.kind,
      mensagem: '',
      numero: '',
      ref: pedido.ref,
      status: 'pendente',
      tenant_id: pedido.tenant_id,
      updated_at: agora,
      url_danfe: ''
    }

    // Grava o pendente ANTES de falar com o provedor: se a resposta se perder no meio, o registro existe e
    // o operador vê "pendente" em vez de não ver nada. É o mesmo motivo da ordem de escrita do estoque.
    file.documents.push(pendente)
    await this.write(file)

    const resposta = await provider.emitir(pedido)

    const registro: FiscalRecord =
      'error' in resposta
        ? { ...pendente, mensagem: resposta.error, status: 'rejeitado', updated_at: Date.now() }
        : {
            ...pendente,
            chave: resposta.resultado.chave,
            homologacao: resposta.resultado.homologacao,
            mensagem: resposta.resultado.mensagem,
            numero: resposta.resultado.numero,
            status: resposta.resultado.status,
            updated_at: Date.now(),
            url_danfe: resposta.resultado.url_danfe
          }

    const atualizado = await this.readAll()
    const indice = atualizado.documents.findIndex(d => d.id === pendente.id)

    if (indice >= 0) atualizado.documents[indice] = registro
    else atualizado.documents.push(registro)

    await this.write(atualizado)

    return 'error' in resposta ? { error: resposta.error } : { existing: false, record: registro }
  }

  /** Cancela pelo `ref` da venda. Recusa quando não há documento autorizado para cancelar. */
  async cancelar(provider: FiscalProvider, ref: string, motivo: string, tenantId: string = DEFAULT_TENANT): Promise<{ error: string } | { record: FiscalRecord }> {
    // Valida ANTES de tocar no registro: um motivo curto nao pode marcar documento como cancelado.
    const avaliado = avaliarMotivo(motivo)

    if (avaliado.erro) return { error: avaliado.erro }

    const file = await this.readAll()
    const indice = file.documents.findIndex(d => d.ref === ref && d.tenant_id === tenantId)

    if (indice < 0) return { error: 'documento_nao_encontrado' }

    const atual = file.documents[indice]!

    if (atual.status !== 'autorizado') return { error: 'documento_nao_autorizado' }

    const resposta = await provider.cancelar(atual.chave, avaliado.texto)

    if ('error' in resposta) return { error: resposta.error }

    const registro: FiscalRecord = {
      ...atual,
      mensagem: resposta.resultado.mensagem,
      status: resposta.resultado.status,
      updated_at: Date.now(),
      url_danfe: resposta.resultado.url_danfe
    }

    file.documents[indice] = registro
    await this.write(file)

    return { record: registro }
  }

  private async read(): Promise<FiscalFile> {
    try {
      return parseFiscal(await readFile(this.filePath, 'utf8'))
    } catch {
      return vazio()
    }
  }

  private async write(file: FiscalFile): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true })

    const temp = `${this.filePath}.${process.pid}.tmp`

    await writeFile(temp, JSON.stringify(file, null, 2), 'utf8')
    await rename(temp, this.filePath)
  }
}