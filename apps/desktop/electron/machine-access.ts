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
/**
 * Os domínios que a fronteira de máquina governa.
 *
 * Exportado porque precisa ser **o mesmo conjunto** que a interface oferece em `SCOPE_OPTIONS`
 * (`src/api/admin.ts`). A r7 impôs a regra e não estendeu a lista: a capacidade ficou impossível de
 * conceder. O teste `machine-access-dominios-concediveis.test.ts` prende os dois conjuntos juntos.
 */
export const DOMINIOS_DE_MAQUINA = ['git', 'terminal', 'fs', 'plugin-files'] as const

export function podeOperarMaquina(
  ator: Actor | null,
  capacidade: MachineCapability,
  dominio?: string
): boolean {
  if (!ator || ator.level === null) return false

  /*
   * r7 do V5 (G1 §36 / critério B) — **bot só opera a máquina com escopo explícito**.
   *
   * `Actor.scopes` documenta: "Só para bot: domínios em que ele pode agir. Vazio = nenhum." Essa
   * regra era honrada por `agent-tools.ts` e `hr-policy.ts` — e **não** por esta função. Resultado:
   * um bot com `EXECUTE_ALLOWED` e **zero escopos** escrevia arquivo, dava `git push` e spawnava
   * shell. O `terminal-guarda-maquina.test.ts` até documentava o comportamento ("o kind nao e
   * considerado"), para que mudá-lo fosse decisão consciente.
   *
   * É a decisão: `EXECUTE_ALLOWED` isolado não concede permissão universal. Um bot que precisa
   * operar a máquina recebe um escopo, e o escopo é auditável — sem ele, nega.
   */
  if (ator.kind === 'bot') {
    const escopos = ator.scopes ?? []

    /*
     * O escopo tem de ser **deste domínio**. Um bot com `scopes: ['sales']` executa trabalho de
     * vendas — não abre shell. Foi o teste que mostrou: a primeira versão desta guarda só exigia
     * escopo não-vazio, e o fixture `scopes: ['sales']` continuava spawnando terminal.
     *
     * Sem domínio declarado, nega: um bot que não disse onde age não opera a máquina.
     */
    if (!dominio || !escopos.includes(dominio)) return false
  }

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

/**
 * r3 do V5 (R-01/R-02) — **administrar a instalação** é mais estreito que operar a máquina.
 *
 * Três ações mudam a instalação inteira, não um arquivo:
 *
 *   - desinstalar o produto (`uninstall:run`)
 *   - desligar a criptografia de segredos (`secret-storage:set`), que **decripta tudo para plaintext**
 *   - qualquer coisa que remova ou exponha o que está guardado
 *
 * Capacidade de `escrita` **não basta**: um operador de vendas com nível alto escreve em arquivo, mas
 * não desinstala o produto. E `kind: 'bot'` **nunca** administra a instalação — não existe cenário
 * legítimo, e o teste de guarda da rodada anterior mostrou que `EXECUTE_ALLOWED` + `role: 'owner'`
 * passava quando o `kind` não era checado (goal G1 §36).
 *
 * Centralizar aqui é o que o G1 pede: uma política, reutilizável, com a decisão num lugar só.
 */
export function podeAdministrarInstalacao(ator: Actor | null): boolean {
  return podeOperarMaquina(ator, 'escrita') && ator?.role === 'owner' && ator?.kind === 'human'
}

/** Resposta padrão de recusa. Nomeia o estado real, não "erro". */
export const RECUSA_MAQUINA = { error: 'sem_permissao', reason: 'capacidade_de_maquina' } as const
