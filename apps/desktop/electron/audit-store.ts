// A trilha de auditoria em disco (r35 do GOAL V2).
//
// O QUE ESTE MÓDULO RESOLVE
//
// `permission-guard` decide e **registra** cada chamada — mas o `onAudit` nunca era passado na montagem.
// Medido na r35: **zero ocorrências** de `onAudit` em `erp-ipc.ts`. A trilha vivia só enquanto o processo
// vivia, e o §26 é explícito: **três dos quatro fluxos de aceite terminam em auditoria**.
//
// Sem persistência, "auditoria" era uma promessa que o produto não cumpria.
//
// POR QUE UM LEDGER E NÃO UM LOG
//
// Auditoria não é diagnóstico: é **prova**. Por isso:
//
//   - **append-only**: nunca se apaga nem se reescreve uma entrada. O que aconteceu, aconteceu.
//   - **fila serializada**: duas chamadas simultâneas não podem perder uma entrada.
//   - **truncagem pelo INÍCIO**: quando passa do teto, o registro mais antigo sai. A escolha é deliberada:
//     um ledger que cresce para sempre derruba o app, e um que apaga o recente esconde o que acabou de
//     acontecer — que é o que alguém investiga primeiro.
//
// O QUE ELE **NÃO** GUARDA
//
// Não guarda o corpo do pedido nem o resultado da ação. Guarda **quem, o quê, sobre o quê, permitido ou
// não, quando e por quê** — o suficiente para reconstruir a decisão, e nada que vaze dado de negócio para
// um arquivo que vive fora do domínio.
//
// POR QUE A ENTRADA TEM `tenant_id` E A DO `rbac` NÃO
//
// `AuditEntry` do `rbac` é a decisão pura (ator, ação, recurso, veredito). O tenant é do **produto**: uma
// decisão sobre `finance` da empresa A não pode ser lida como se fosse da B. Como o `rbac` não conhece
// tenant, ele é acrescentado aqui, na fronteira de persistência.

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import type { AuditEntry } from './rbac'
import { INSTALLATION_TENANT } from './server-tenant'
import { WriteQueue } from './write-queue'

/** Quantas entradas o arquivo guarda. Acima disso, as mais antigas saem. */
export const AUDIT_MAX_ENTRIES = 5_000

export interface AuditRecord extends AuditEntry {
  /** Tenant vigente na chamada. Ver o comentário do cabeçalho. */
  tenant_id: string
}

export interface AuditFile {
  entries: AuditRecord[]
  /** Quantas saíram por truncagem desde o início. Nunca escondido: se houve perda, ela está contada. */
  descartadas: number
  schema_version: 1
}

export function auditStorePath(userDataDir: string): string {
  return join(userDataDir, 'b3po', 'auditoria.json')
}

function vazio(): AuditFile {
  return { descartadas: 0, entries: [], schema_version: 1 }
}

export function parseAudit(raw: string): AuditFile {
  try {
    const parsed = JSON.parse(raw) as Partial<AuditFile>

    if (!parsed || !Array.isArray(parsed.entries)) return vazio()

    return {
      descartadas: typeof parsed.descartadas === 'number' ? parsed.descartadas : 0,
      entries: parsed.entries.filter(
        (e): e is AuditRecord =>
          !!e && typeof e === 'object' && typeof e.actorId === 'string' && typeof e.action === 'string'
      ),
      schema_version: 1
    }
  } catch {
    return vazio()
  }
}

/**
 * O ledger.
 *
 * `registrar` é **síncrono na assinatura** (devolve void) de propósito: ele é chamado de dentro do
 * `permission-guard`, que não é `async`. A escrita real acontece em segundo plano, na fila — e uma falha
 * de disco **não pode** derrubar a ação que está sendo auditada.
 */
export class AuditStore {
  private readonly fila = new WriteQueue()

  constructor(private readonly file: string) {}

  private pendentes: AuditRecord[] = []

  async carregar(): Promise<AuditFile> {
    try {
      return parseAudit(await readFile(this.file, 'utf8'))
    } catch {
      return vazio()
    }
  }

  /**
   * Registra uma decisão.
   *
   * Nunca lança: uma auditoria que falha não pode ser o motivo de uma ação legítima falhar. A falha é
   * **engolida**, e o efeito é o arquivo não ter aquela entrada — que é ruim, e é menos ruim que derrubar
   * a chamada.
   */
  registrar(entry: AuditEntry, tenantId: string = INSTALLATION_TENANT): void {
    const registro: AuditRecord = { ...entry, tenant_id: tenantId }

    this.pendentes.push(registro)

    void this.fila.serializar(async () => {
      const lote = this.pendentes.splice(0)

      if (lote.length === 0) return

      const conteudo = await this.carregar()

      conteudo.entries.push(...lote)

      // Truncagem pelo INÍCIO: o recente é o que se investiga primeiro.
      if (conteudo.entries.length > AUDIT_MAX_ENTRIES) {
        const excesso = conteudo.entries.length - AUDIT_MAX_ENTRIES

        conteudo.entries = conteudo.entries.slice(excesso)
        conteudo.descartadas += excesso
      }

      await mkdir(dirname(this.file), { recursive: true })

      const temp = `${this.file}.${process.pid}.tmp`

      await writeFile(temp, JSON.stringify(conteudo, null, 2), 'utf8')
      await rename(temp, this.file)
    })
  }

  /** As entradas, mais recentes primeiro. `limite` para a tela não carregar 5.000 de uma vez. */
  async listar(filtro: { limite?: number; tenant_id?: string } = {}): Promise<{ descartadas: number; entries: AuditRecord[] }> {
    const conteudo = await this.carregar()
    const doTenant = filtro.tenant_id ? conteudo.entries.filter(e => e.tenant_id === filtro.tenant_id) : conteudo.entries
    const ordem = [...doTenant].reverse()

    return {
      descartadas: conteudo.descartadas,
      entries: typeof filtro.limite === 'number' ? ordem.slice(0, filtro.limite) : ordem
    }
  }
}

/**
 * O coletor global.
 *
 * Existe porque o `permission-guard` é chamado em **30 canais** e em `admin-ipc`/`agent-tools`, cada um
 * com o seu próprio objeto `deps`. Passar `onAudit` em todos exigiria tocar em 30 assinaturas — e a
 * primeira que alguém esquecesse seria um buraco silencioso na trilha.
 *
 * Aqui há **um lugar**: a montagem configura o coletor, e toda chamada que não passar um `onAudit`
 * próprio cai nele.
 */
let coletor: AuditStore | null = null

export function configurarColetorDeAuditoria(store: AuditStore | null): void {
  coletor = store
}

export function coletorDeAuditoria(): AuditStore | null {
  return coletor
}

/** O `onAudit` padrão. `null` quando ninguém configurou — e aí nada é persistido, como antes da r35. */
export function registrarNaTrilha(entry: AuditEntry): void {
  coletor?.registrar(entry)
}
