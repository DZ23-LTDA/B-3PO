// Quais operações de RH exigem aprovação humana.
//
// O GOAL: "Contratações, demissões, salários e decisões que afetem pessoas exigem aprovação humana.
// Não permitir decisões discriminatórias automatizadas."
//
// A função é deliberadamente burra e fechada: uma lista, não uma lógica. Política de gente decidida
// por heurística é como um sistema começa a demitir por padrão de texto.
//
// O que um agente PODE fazer sem aprovação: criar departamento, cadastrar colaborador, corrigir
// cargo, anotar. O que ele prepara e não executa: desligar, mudar salário, mudar status para
// afastado.

import type { Actor } from './rbac'

export const HR_OPERATIONS = [
  'criar_departamento',
  'cadastrar_colaborador',
  'alterar_cargo',
  'anotar',
  'alterar_salario',
  'desligar',
  'afastar'
] as const

export type HrOperation = (typeof HR_OPERATIONS)[number]

/** Operações que jamais viram fato sem um humano aprovar, em nenhum nível de autonomia. */
const EXIGE_APROVACAO: readonly HrOperation[] = ['alterar_salario', 'desligar', 'afastar']

export interface Approval {
  /** Por que precisa de aprovação. Vazio quando não precisa. */
  reason: string
  required: boolean
}

export function requiresApproval(operation: HrOperation): Approval {
  if (EXIGE_APROVACAO.includes(operation)) {
    return { reason: 'decisao_sobre_pessoa', required: true }
  }

  return { reason: '', required: false }
}

/**
 * Um agente pode *iniciar* a operação (preparar) mesmo quando não pode concluí-la.
 *
 * `null` quando a operação não é dele.
 */
export function mayPrepare(actor: Actor, operation: HrOperation): boolean {
  if (actor.kind !== 'bot') {
    return true
  }

  // Bot so prepara dentro do escopo. A conclusao continua dependendo de aprovacao humana.
  return (actor.scopes ?? []).includes('hr')
}

/**
 * Motivos proibidos para uma decisão automatizada sobre pessoas.
 *
 * A lista não é exaustiva nem pretende ser um classificador: é a barreira mínima para que um agente
 * não possa registrar uma justificativa dessas. Classificação de verdade é trabalho humano.
 */
const MOTIVOS_PROIBIDOS = [
  'idade',
  'genero',
  'genero',
  'raca',
  'religiao',
  'deficiencia',
  'orientacao sexual',
  'gravidez',
  'estado civil',
  'aparencia'
]

export function forbiddenReason(reason: string): string {
  const normalizado = reason
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  return MOTIVOS_PROIBIDOS.find(motivo => normalizado.includes(motivo)) ?? ''
}

/** A decisão precisa passar por humano E não pode se apoiar em motivo vedado. */
export function canDecide(operation: HrOperation, reason: string): Approval {
  const base = requiresApproval(operation)

  if (!base.required) {
    return base
  }

  const vedado = forbiddenReason(reason)

  if (vedado) {
    return { reason: `motivo_vedado:${vedado}`, required: true }
  }

  return base
}
