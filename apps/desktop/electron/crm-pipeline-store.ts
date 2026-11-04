// Funil do CRM no disco do usuário, dono do dado: o processo principal do Electron.
//
// Mesmo desenho do store de contatos: um JSON sob `userData`, gravação atômica (`write` + `rename`). A
// oportunidade é ligada ao contato pelo telefone (o índice do CRM) e o estágio anda pelo funil; "ganho" e
// "perdido" são terminais e não voltam por acidente.

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { cents } from './money'

export const PIPELINE_STAGES = ['novo', 'contato', 'qualificacao', 'proposta', 'negociacao', 'ganho', 'perdido'] as const

export type PipelineStage = (typeof PIPELINE_STAGES)[number]

export interface CrmOpportunity {
  contact_phone: string
  created_at: number
  /** Código da moeda; o valor é guardado em centavos para não perder precisão. */
  currency: string
  id: string
  /** Só existe quando o estágio é `perdido`: o CRM exige saber por quê. */
  lost_reason: string
  stage: PipelineStage
  title: string
  updated_at: number
  value_cents: number
}

export interface PipelineFile {
  opportunities: CrmOpportunity[]
  schema_version: 1
}

function emptyPipeline(): PipelineFile {
  return { opportunities: [], schema_version: 1 }
}

export function pipelineStorePath(userDataDir: string): string {
  return join(userDataDir, 'b3po', 'crm-pipeline.json')
}

export function isStage(value: unknown): value is PipelineStage {
  return typeof value === 'string' && (PIPELINE_STAGES as readonly string[]).includes(value)
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function normalizeOpportunity(input: unknown, now: number): { error: string } | { opportunity: CrmOpportunity } {
  const raw = (input ?? {}) as Record<string, unknown>
  const title = text(raw['title'])
  const contact = text(raw['contact_phone'])
  const stage = raw['stage']

  if (!title) {
    return { error: 'title_required' }
  }

  if (!contact) {
    return { error: 'contact_required' }
  }

  if (!isStage(stage)) {
    return { error: 'stage_invalid' }
  }

  const lostReason = text(raw['lost_reason'])

  if (stage === 'perdido' && !lostReason) {
    return { error: 'lost_reason_required' }
  }

  return {
    opportunity: {
      contact_phone: contact,
      created_at: typeof raw['created_at'] === 'number' ? raw['created_at'] : now,
      currency: (text(raw['currency']) || 'BRL').toUpperCase(),
      id: text(raw['id']) || `opp_${now}_${Math.random().toString(36).slice(2, 8)}`,
      // Motivo de perda só faz sentido em `perdido`; ao voltar para o funil ele é limpo.
      lost_reason: stage === 'perdido' ? lostReason : '',
      stage,
      title,
      updated_at: now,
      value_cents: cents(raw['value_cents'])
    }
  }
}

export function parsePipeline(raw: string): PipelineFile {
  try {
    const parsed = JSON.parse(raw) as Partial<PipelineFile>

    if (!parsed || !Array.isArray(parsed.opportunities)) {
      return emptyPipeline()
    }

    return {
      opportunities: parsed.opportunities.filter(
        entry => !!entry && typeof entry.id === 'string' && isStage((entry as CrmOpportunity).stage)
      ),
      schema_version: 1
    }
  } catch {
    return emptyPipeline()
  }
}

/** Total aberto (fora de ganho/perdido) e ganho, em centavos — números reais, nunca inventados. */
export function pipelineTotals(opportunities: readonly CrmOpportunity[]): { openCents: number; wonCents: number } {
  let openCents = 0
  let wonCents = 0

  for (const opportunity of opportunities) {
    if (opportunity.stage === 'ganho') {
      wonCents += opportunity.value_cents
    } else if (opportunity.stage !== 'perdido') {
      openCents += opportunity.value_cents
    }
  }

  return { openCents, wonCents }
}

export class CrmPipelineStore {
  constructor(private readonly filePath: string) {}

  async list(): Promise<CrmOpportunity[]> {
    const file = await this.read()
    const ordem = new Map(PIPELINE_STAGES.map((stage, index) => [stage, index]))

    return [...file.opportunities].sort((a, b) => {
      const byStage = (ordem.get(a.stage) ?? 0) - (ordem.get(b.stage) ?? 0)

      return byStage !== 0 ? byStage : b.updated_at - a.updated_at
    })
  }

  async upsert(input: unknown): Promise<{ error: string } | { opportunities: CrmOpportunity[] }> {
    const normalized = normalizeOpportunity(input, Date.now())

    if ('error' in normalized) {
      return normalized
    }

    const file = await this.read()
    const opportunity = normalized.opportunity
    const index = file.opportunities.findIndex(entry => entry.id === opportunity.id)

    if (index >= 0) {
      const anterior = file.opportunities[index]!

      // Estágio terminal não volta sem intenção explícita: o chamador precisa mandar o estágio novo.
      file.opportunities[index] = { ...anterior, ...opportunity, created_at: anterior.created_at }
    } else {
      file.opportunities.push(opportunity)
    }

    await this.write(file)

    return { opportunities: await this.list() }
  }

  async remove(id: string): Promise<{ opportunities: CrmOpportunity[] }> {
    const file = await this.read()
    file.opportunities = file.opportunities.filter(entry => entry.id !== id)
    await this.write(file)

    return { opportunities: await this.list() }
  }

  private async read(): Promise<PipelineFile> {
    try {
      return parsePipeline(await readFile(this.filePath, 'utf8'))
    } catch {
      return emptyPipeline()
    }
  }

  private async write(file: PipelineFile): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true })
    const temp = `${this.filePath}.tmp`
    await writeFile(temp, JSON.stringify(file, null, 2), 'utf8')
    await rename(temp, this.filePath)
  }
}
