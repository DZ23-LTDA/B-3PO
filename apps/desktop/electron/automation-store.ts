// Automacoes: regra que reage a um evento e executa uma acao de dominio.
//
// O QUE ESTE MODULO NAO FAZ
//
// Nao tem ferramentas proprias. Uma acao e uma chamada ao MESMO catalogo de ferramentas que os agentes
// usam (`callTool`), com o MESMO ator e as MESMAS guardas de escopo e nivel. Se a automacao pudesse
// chamar o store direto, ela viraria um caminho de escrita sem permissao — exatamente o que o GOAL
// proibe ("Nao permitir escalada de privilegios entre Bots").
//
// TRES TRAVAS CONTRA LOOP
//
// 1. **Regra nao dispara regra.** O evento gerado por uma acao nao reentra no executor.
// 2. **Teto por disparo.** Uma regra executa no maximo uma vez por evento.
// 3. **Teto por rodada.** O executor para depois de N acoes, mesmo que haja mais regras.
//
// Sem isso, "quando vender, registre no financeiro" + "quando lancar no financeiro, venda" e um laco
// que drena o disco em silencio.

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { callTool, type AgentTool } from './agent-tools'
import { DEFAULT_TENANT } from './catalog-store'
import type { Actor } from './rbac'

export const AUTOMATION_TRIGGERS = [
  'venda.faturada',
  'estoque.zerado',
  'ticket.aberto',
  'ticket.atrasado',
  'conta.vencendo'
] as const

export type AutomationTrigger = (typeof AUTOMATION_TRIGGERS)[number]

export interface AutomationRule {
  /** Nome da ferramenta do catalogo (`catalog.list`, `inventory.append`, ...). */
  action_name: string
  action_args: Record<string, unknown>
  active: boolean
  created_at: number
  /** Quem a automacao representa. A acao roda com o escopo e o nivel DESTE ator. */
  actor_id: string
  id: string
  name: string
  tenant_id: string
  trigger: AutomationTrigger
  updated_at: number
}

export interface AutomationFile {
  rules: AutomationRule[]
  schema_version: 1
}

export interface AutomationRun {
  action: string
  error?: string
  ok: boolean
  rule_id: string
  rule_name: string
}

export interface AutomationReport {
  /** Quantas regras existiam para o gatilho. */
  candidatas: number
  /** `true` quando o teto de acoes cortou a rodada. */
  interrompido: boolean
  runs: AutomationRun[]
}

function empty(): AutomationFile {
  return { rules: [], schema_version: 1 }
}

export function automationStorePath(userDataDir: string): string {
  return join(userDataDir, 'b3po', 'automations.json')
}

function texto(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function normalizeRule(input: unknown, now: number): { error: string } | { rule: AutomationRule } {
  const raw = (input ?? {}) as Record<string, unknown>
  const nome = texto(raw['name'])

  if (!nome) return { error: 'nome_obrigatorio' }

  const trigger = AUTOMATION_TRIGGERS.includes(raw['trigger'] as AutomationTrigger)
    ? (raw['trigger'] as AutomationTrigger)
    : null

  if (!trigger) return { error: 'gatilho_invalido' }

  const acao = texto(raw['action_name'])

  if (!acao) return { error: 'acao_obrigatoria' }

  const actorId = texto(raw['actor_id'])

  if (!actorId) {
    // Sem ator nao ha escopo: a acao rodaria como ninguem, o que e o mesmo que rodar como todos.
    return { error: 'ator_obrigatorio' }
  }

  const args = raw['action_args']

  return {
    rule: {
      action_args: args && typeof args === 'object' ? (args as Record<string, unknown>) : {},
      action_name: acao,
      active: raw['active'] !== false,
      actor_id: actorId,
      created_at: now,
      id: texto(raw['id']) || `rule_${now}_${Math.random().toString(36).slice(2, 8)}`,
      name: nome,
      tenant_id: texto(raw['tenant_id']) || DEFAULT_TENANT,
      trigger,
      updated_at: now
    }
  }
}

export function parseAutomation(raw: string): AutomationFile {
  try {
    const parsed = JSON.parse(raw) as Partial<AutomationFile>

    if (!parsed || !Array.isArray(parsed.rules)) return empty()

    return { rules: parsed.rules.filter(r => r && typeof r.id === 'string'), schema_version: 1 }
  } catch {
    return empty()
  }
}

/** Teto de acoes por disparo. Existe para que um laco nao drene o disco em silencio. */
export const MAX_RUNS_PER_EVENT = 20

export interface RunOptions {
  /** Resolve o ator de cada regra. Devolve `null` quando o ator nao existe mais ou esta inativo. */
  actorFor: (actorId: string) => Promise<Actor | null>
  now: number
  /**
   * Chamado antes de invocar a acao. Nao recebe o resultado da acao: o executor nao observa o que a
   * acao escreveu, e por isso uma acao nao pode disparar outra regra.
   */
  onRun?: (run: AutomationRun) => void
  tenantId: string
  tools: readonly AgentTool[]
}

/**
 * Executa as regras ativas de um gatilho.
 *
 * Cada regra e independente: uma falha nao impede a proxima. Mas o ator de cada uma e resolvido na
 * hora, entao desativar o ator desliga a automacao dele sem precisar editar a regra.
 */
export async function runRules(
  rules: readonly AutomationRule[],
  trigger: AutomationTrigger,
  options: RunOptions
): Promise<AutomationReport> {
  const candidatas = rules.filter(r => r.tenant_id === options.tenantId && r.trigger === trigger && r.active)
  const runs: AutomationRun[] = []
  let interrompido = false

  for (const regra of candidatas) {
    if (runs.length >= MAX_RUNS_PER_EVENT) {
      interrompido = true
      break
    }

    const ator = await options.actorFor(regra.actor_id)

    if (!ator) {
      const run: AutomationRun = {
        action: regra.action_name,
        error: 'ator_ausente',
        ok: false,
        rule_id: regra.id,
        rule_name: regra.name
      }

      runs.push(run)
      options.onRun?.(run)
      continue
    }

    // A mesma guarda dos agentes. Automacao nao e um atalho: se o ator nao pode, a acao nao roda.
    const resultado = await callTool(ator, options.tools, regra.action_name, regra.action_args, {
      // `ToolRegistryDeps.now` e um provedor, nao um instante: o catalogo pode consultar duas vezes e
      // precisa do mesmo valor nas duas.
      now: () => options.now
    })

    const run: AutomationRun = {
      action: regra.action_name,
      error: resultado.ok ? undefined : resultado.error,
      ok: resultado.ok,
      rule_id: regra.id,
      rule_name: regra.name
    }

    runs.push(run)
    options.onRun?.(run)
  }

  return { candidatas: candidatas.length, interrompido, runs }
}

export class AutomationStore {
  constructor(private readonly filePath: string) {}

  async list(tenantId: string = DEFAULT_TENANT): Promise<AutomationRule[]> {
    return (await this.read()).rules.filter(r => r.tenant_id === tenantId)
  }

  async create(input: unknown): Promise<{ rule: AutomationRule; rules: AutomationRule[] } | { error: string }> {
    const normalized = normalizeRule(input, Date.now())

    if ('error' in normalized) return normalized

    const file = await this.read()

    if (file.rules.some(r => r.name === normalized.rule.name && r.tenant_id === normalized.rule.tenant_id)) {
      return { error: 'regra_duplicada' }
    }

    file.rules.push(normalized.rule)
    await this.write(file)

    return { rule: normalized.rule, rules: await this.list(normalized.rule.tenant_id) }
  }

  async setActive(id: string, active: boolean): Promise<{ rules: AutomationRule[] } | { error: string }> {
    const file = await this.read()
    const indice = file.rules.findIndex(r => r.id === id)

    if (indice < 0) return { error: 'regra_nao_encontrada' }

    const atual = file.rules[indice]!

    file.rules[indice] = { ...atual, active, updated_at: Date.now() }
    await this.write(file)

    return { rules: await this.list(atual.tenant_id) }
  }

  private async read(): Promise<AutomationFile> {
    try {
      return parseAutomation(await readFile(this.filePath, 'utf8'))
    } catch {
      return empty()
    }
  }

  private async write(file: AutomationFile): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true })
    const temp = `${this.filePath}.tmp`
    await writeFile(temp, JSON.stringify(file, null, 2), 'utf8')
    await rename(temp, this.filePath)
  }
}
