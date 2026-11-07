// Varredura de condicoes vencidas, com memoria do que ja foi avisado.
//
// POR QUE ISSO E DIFERENTE DE UM EVENTO
//
// `ticket.atrasado` nao "acontece": ele PASSA A SER verdade quando o prazo vence, e continua verdade
// enquanto o ticket estiver atrasado. Sem memoria, uma varredura a cada minuto dispararia a automacao
// 60 vezes por hora para o mesmo ticket — e a regra que "avisa o cliente" mandaria 60 mensagens.
//
// A memoria e por (gatilho, entidade): enquanto a condicao persistir, nao avisa de novo. Quando a
// condicao deixa de existir (o ticket foi resolvido), a memoria daquela chave e esquecida — e se o
// ticket atrasar outra vez, avisa de novo. **Rearmar ao resolver e o que separa "avisar uma vez por
// ocorrencia" de "avisar uma vez para sempre".**

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import type { AutomationReport, AutomationTrigger } from './automation-store'

/** Gatilhos que SAO condicao: derivados do relogio, verificados por varredura. */
export const SWEEP_TRIGGERS = ['ticket.atrasado', 'conta.vencendo'] as const

export type SweepTrigger = (typeof SWEEP_TRIGGERS)[number]

export interface SweepState {
  /** `trigger:entityId` -> quando avisou. Presenca significa "ja avisou e a condicao persiste". */
  fired: Record<string, number>
  schema_version: 1
}

export interface Condition {
  /** Identidade da entidade na condicao (id do ticket, id do lancamento). */
  entity_id: string
  /** Derivado do dominio dono; nunca inventado aqui. */
  tenant_id: string
  trigger: SweepTrigger
}

export function sweepStatePath(userDataDir: string): string {
  return join(userDataDir, 'b3po', 'automation-sweep.json')
}

export function conditionKey(trigger: SweepTrigger, entityId: string): string {
  return `${trigger}:${entityId}`
}

export function parseSweep(raw: string): SweepState {
  try {
    const parsed = JSON.parse(raw) as Partial<SweepState>

    if (!parsed || typeof parsed.fired !== 'object' || parsed.fired === null) {
      return { fired: {}, schema_version: 1 }
    }

    const fired: Record<string, number> = {}

    for (const [chave, valor] of Object.entries(parsed.fired)) {
      if (typeof valor === 'number' && Number.isFinite(valor)) fired[chave] = valor
    }

    return { fired, schema_version: 1 }
  } catch {
    return { fired: {}, schema_version: 1 }
  }
}

export interface SweepPlan {
  /** Condicoes que devem disparar agora (novas). */
  disparar: Condition[]
  /** Quantas condicoes persistiam e foram silenciadas por ja terem avisado. */
  silenciadas: number
}

/**
 * Decide o que disparar, sem executar nada.
 *
 * Funcao pura: recebe as condicoes ativas e a memoria, devolve o plano. Testar isso com numeros
 * escolhidos e possivel porque nao ha I/O no meio.
 */
export function planSweep(condicoes: readonly Condition[], state: SweepState): SweepPlan {
  const disparar: Condition[] = []
  let silenciadas = 0

  for (const condicao of condicoes) {
    if (state.fired[conditionKey(condicao.trigger, condicao.entity_id)] === undefined) {
      disparar.push(condicao)
    } else {
      silenciadas += 1
    }
  }

  return { disparar, silenciadas }
}

/**
 * Teto de avisos por varredura. Sem ele, um incidente que atrasa 500 tickets criaria 500 execucoes
 * de automacao no mesmo ciclo, cada uma podendo escrever no disco.
 */
export const MAX_SWEEP_PER_RUN = 20

export interface SweepDeps {
  /** Condicoes ativas AGORA, perguntadas ao dono de cada dominio. */
  conditions: () => Promise<Condition[]>
  now: () => number
  /** Executa as regras do gatilho. Devolve o relatorio para auditoria. */
  run: (trigger: SweepTrigger, condicao: Condition) => Promise<AutomationReport>
}

export interface SweepRunResult {
  avisados: number
  interrompido: boolean
  rearmados: string[]
  silenciados: number
}

export class SweepStore {
  constructor(private readonly filePath: string) {}

  async read(): Promise<SweepState> {
    try {
      return parseSweep(await readFile(this.filePath, 'utf8'))
    } catch {
      return { fired: {}, schema_version: 1 }
    }
  }

  async write(state: SweepState): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true })
    const temp = `${this.filePath}.tmp`
    await writeFile(temp, JSON.stringify(state, null, 2), 'utf8')
    await rename(temp, this.filePath)
  }

  /**
   * Varre, dispara o que e novo, e rearma o que resolveu.
   *
   * A ordem importa: primeiro decide com a memoria atual, depois executa, depois grava. Gravar antes
   * de executar marcaria como avisado algo que falhou em avisar.
   */
  async run(deps: SweepDeps): Promise<SweepRunResult> {
    const state = await this.read()
    const condicoes = await deps.conditions()
    const plano = planSweep(condicoes, state)

    const avisar = plano.disparar.slice(0, MAX_SWEEP_PER_RUN)
    const interrompido = plano.disparar.length > MAX_SWEEP_PER_RUN
    const agora = deps.now()

    for (const condicao of avisar) {
      await deps.run(condicao.trigger, condicao)
      state.fired[conditionKey(condicao.trigger, condicao.entity_id)] = agora
    }

    // Rearme: o que estava marcado e NAO esta mais ativo foi resolvido. Esquecer devolve a condicao ao
    // estado "nunca avisado", para que uma nova ocorrencia volte a avisar.
    const ativas = new Set(condicoes.map(c => conditionKey(c.trigger, c.entity_id)))
    const rearmados: string[] = []

    for (const chave of Object.keys(state.fired)) {
      if (!ativas.has(chave)) {
        delete state.fired[chave]
        rearmados.push(chave)
      }
    }

    // Grava so o que foi avisado mais os rearmes. Se `interrompido`, as condicoes nao atendidas seguem
    // sem marca e serao avisadas na proxima varredura.
    if (avisar.length > 0 || rearmados.length > 0) {
      await this.write(state)
    }

    return { avisados: avisar.length, interrompido, rearmados, silenciados: plano.silenciadas }
  }
}
