// Gozo de férias (rodada 138).
//
// O QUE FALTAVA PARA A r135 FECHAR
//
// `situacaoFerias` da r135 recebe `ultimoGozo` e, sem ele, nunca afirma `vencida`. O parâmetro existe porque
// adivinhar produziria alerta de férias em dobro em quem está em dia. Faltava **de onde vem** esse valor.
//
// O QUE ESTE STORE GUARDA, E O QUE NÃO GUARDA
//
// Guarda o FATO: "fulano gozou 30 dias referentes ao período que começou em X". Não guarda dinheiro, não
// calcula abono, não decide se o gozo foi autorizado. O fato é imutável — o que se corrige é lançamento
// errado, e para isso existe `remove`, não `update`: um gozo reescrito perde a trilha de auditoria.
//
// Arquivo próprio, escrita atômica, mesmo padrão dos outros stores de domínio.

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { serverTenant } from './server-tenant'

export const DEFAULT_TENANT = 'local'

export interface GozoFerias {
  /** Quando o gozo foi registrado no sistema (não quando começou). */
  created_at: number
  /** Dias efetivamente gozados. */
  dias: number
  /** Identidade do colaborador no RH (matrícula ou id do registro). */
  funcionario: string
  id: string
  /** Início do período AQUISITIVO a que este gozo se refere. */
  periodo_inicio: number
  tenant_id: string
}

export interface GozosFile {
  gozos: GozoFerias[]
  schema_version: number
}

export function hrVacationPath(userData: string): string {
  return join(userData, 'b3po', 'hr-vacations.json')
}

function vazio(): GozosFile {
  return { gozos: [], schema_version: 1 }
}

function ehValido(value: unknown): value is GozoFerias {
  if (!value || typeof value !== 'object') return false

  const g = value as Partial<GozoFerias>

  return (
    typeof g.id === 'string' &&
    g.id !== '' &&
    typeof g.funcionario === 'string' &&
    g.funcionario !== '' &&
    typeof g.dias === 'number' &&
    g.dias > 0 &&
    typeof g.periodo_inicio === 'number'
  )
}

function ler(caminho: string): GozosFile {
  if (!existsSync(caminho)) return vazio()

  try {
    const bruto = JSON.parse(readFileSync(caminho, 'utf8')) as Partial<GozosFile>

    return { gozos: Array.isArray(bruto.gozos) ? bruto.gozos.filter(ehValido) : [], schema_version: 1 }
  } catch {
    // Arquivo corrompido não derruba o RH: lista vazia, e a próxima escrita recria.
    return vazio()
  }
}

function gravar(caminho: string, dados: GozosFile): void {
  mkdirSync(dirname(caminho), { recursive: true })

  const temporario = `${caminho}.tmp`

  writeFileSync(temporario, JSON.stringify(dados, null, 2), 'utf8')
  renameSync(temporario, caminho)
}

export interface GozoInput {
  dias: number
  funcionario: string
  periodo_inicio: number
  tenant_id?: string
}

export interface VacationStore {
  /** O gozo mais recente do colaborador — o valor que `situacaoFerias` espera. */
  ultimoGozo(funcionario: string): number | undefined
  listar(funcionario?: string): GozoFerias[]
  registrar(input: GozoInput, agora?: number): { error?: string; gozo?: GozoFerias }
  remover(id: string): { error?: string; removido?: boolean }
}

export function openVacationStore(userData: string): VacationStore {
  const caminho = hrVacationPath(userData)

  return {
    listar(funcionario) {
      const tenant = serverTenant()

      return ler(caminho)
        .gozos.filter(g => g.tenant_id === tenant && (!funcionario || g.funcionario === funcionario))
        .sort((a, b) => b.periodo_inicio - a.periodo_inicio)
    },

    registrar(input, agora = Date.now()) {
      const funcionario = (input.funcionario ?? '').trim()

      if (!funcionario) return { error: 'funcionario_obrigatorio' }
      if (!Number.isFinite(input.dias) || input.dias <= 0) return { error: 'dias_invalidos' }
      if (!Number.isFinite(input.periodo_inicio)) return { error: 'periodo_invalido' }

      const tenant = serverTenant(input.tenant_id)
      const dados = ler(caminho)

      // O mesmo período não pode ser gozado duas vezes. Sem esta checagem, um clique duplo registraria 60
      // dias e a situação do colaborador passaria a mentir a favor dele.
      const repetido = dados.gozos.some(
        g => g.tenant_id === tenant && g.funcionario === funcionario && g.periodo_inicio === input.periodo_inicio
      )

      if (repetido) return { error: 'periodo_ja_gozado' }

      const gozo: GozoFerias = {
        created_at: agora,
        dias: Math.floor(input.dias),
        funcionario,
        id: `fer_${agora}_${Math.random().toString(36).slice(2, 8)}`,
        periodo_inicio: input.periodo_inicio,
        tenant_id: tenant
      }

      dados.gozos.push(gozo)
      gravar(caminho, dados)

      return { gozo }
    },

    remover(id) {
      const dados = ler(caminho)
      const antes = dados.gozos.length

      dados.gozos = dados.gozos.filter(g => g.id !== id)

      if (dados.gozos.length === antes) return { error: 'gozo_nao_encontrado' }

      gravar(caminho, dados)

      return { removido: true }
    },

    ultimoGozo(funcionario) {
      const tenant = serverTenant()
      const doFuncionario = ler(caminho).gozos.filter(
        g => g.tenant_id === tenant && g.funcionario === funcionario
      )

      if (doFuncionario.length === 0) return undefined

      // O período aquisitivo MAIS RECENTE já gozado: é o que define de onde o próximo pendente começa.
      return Math.max(...doFuncionario.map(g => g.periodo_inicio))
    }
  }
}
