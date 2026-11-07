// Níveis de autonomia no renderer (rodada 147).
//
// ESPELHO DELIBERADO
//
// `electron/agent-roster.ts` é a fonte da regra. O renderer não pode importar de `@/electron/**` (regra do
// projeto desde a r82), então o tipo e a ordem são espelhados aqui — igual ao que já foi feito em
// `src/lib/scheduling-slots.ts`.
//
// O QUE PODE DIVERGIR, E COMO ISSO APARECE
//
// Se a ordem mudar lá e não aqui, a tela compara errado e mostra um teto que não existe. O sintoma é específico:
// a tela oferece um botão que o backend recusa. A `agents.ts` não decide nada — só exibe o que o IPC entrega —,
// então o risco fica restrito a rótulo e ordenação, nunca a permissão.

export const NIVEIS = ['READ', 'RECOMMEND', 'PREPARE', 'EXECUTE_ALLOWED', 'SUPERVISED_AUTONOMY'] as const

export type Nivel = (typeof NIVEIS)[number]

export function ordemDoNivel(nivel: Nivel): number {
  return NIVEIS.indexOf(nivel)
}

/** Texto para a tela. Nome técnico não vai para o usuário. */
export function rotuloDoNivel(nivel: Nivel): string {
  const rotulos: Record<Nivel, string> = {
    EXECUTE_ALLOWED: 'Executa o autorizado',
    PREPARE: 'Prepara para aprovação',
    READ: 'Só consulta',
    RECOMMEND: 'Recomenda',
    SUPERVISED_AUTONOMY: 'Opera dentro dos limites'
  }

  return rotulos[nivel]
}
