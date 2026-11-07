// Fronteira de acesso à máquina (r9 do GOAL V2).
//
// POR QUE ESTE ARQUIVO NÃO É RBAC DE DOMÍNIO
//
// O RBAC do B-3PO responde "esta pessoa pode lançar no financeiro?". `exigirAtor` decide isso por
// **recurso de negócio**: financeiro, fiscal, estoque, marketing.
//
// `hermes:git:*` e `hermes:terminal:*` não são recursos de negócio. São **capacidades de máquina**:
// executar shell neste computador, reescrever este repositório, publicar num remoto. A pergunta que eles
// fazem é outra — "esta pessoa pode operar a máquina onde o B-3PO está instalado?".
//
// Misturar as duas levaria a uma escolha ruim: um operador de vendas com nível `EXECUTE_ALLOWED` no
// domínio `sales` passaria a poder dar `git push` no repositório da empresa, porque a guarda só olharia
// o nível e não o tipo de capacidade.
//
// O QUE ESTA FRONTEIRA PROTEGE
//
//   leitura   — status, diff, lista de branches: já expostos pela tela de revisão, sem efeito
//   escrita   — stage, unstage, revert, commit, worktreeAdd/Remove, branchSwitch: altera o repositório
//   externa   — push, createPr: sai da máquina e não tem desfazer
//
// `externo` é o nível que importa. `git push` e `createPr` publicam — e publicação não se recolhe.
//
// POR QUE NÃO FECHA TUDO AGORA
//
// Fechar os 21 canais de `git` de uma vez exigiria decidir o modelo de "quem opera a máquina" para o
// produto inteiro, e essa é uma decisão de produto, não de rodada. O que esta fronteira faz é **negar por
// padrão o que sai da máquina** e deixar o resto com um caminho único para a decisão.

import type { Actor } from './rbac'

/** O que um canal de máquina pode fazer. */
export type MachineCapability = 'externo' | 'leitura' | 'escrita'

/**
 * Decide se o ator pode exercer a capacidade.
 *
 * Negar por padrão: sem ator, sem decisão. Com ator, só `EXECUTE_ALLOWED` ou `SUPERVISED_AUTONOMY`
 * alcançam `escrita`; `externo` exige o mesmo nível **e** o papel `owner` — porque publicar em nome da
 * empresa é ato de quem responde por ela.
 *
 * `null` de nível é "sem acesso" — não é "acesso padrão".
 */
export function podeOperarMaquina(ator: Actor | null, capacidade: MachineCapability): boolean {
  if (!ator || ator.level === null) return false

  // `leitura` de máquina é o que a tela de revisão já mostra: status, diff, lista de branches. Não
  // publica, não altera. Qualquer nível efetivo basta — inclusive `READ`.
  if (capacidade === 'leitura') return true

  // Escrita no repositório é mais que ler: exige poder de execução.
  const podeExecutar = ator.level === 'EXECUTE_ALLOWED' || ator.level === 'SUPERVISED_AUTONOMY'

  if (capacidade === 'escrita') return podeExecutar

  // `externo`: push e createPr saem da máquina. Além de poder executar, é preciso responder pela
  // empresa — só o `owner`.
  return podeExecutar && ator.role === 'owner'
}

/** Resposta padrão de recusa. Nomeia o estado real, não "erro". */
export const RECUSA_MAQUINA = { error: 'sem_permissao', reason: 'capacidade_de_maquina' } as const
