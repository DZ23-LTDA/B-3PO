// O MENU CONFORME O RBAC (r170 do GOAL V2, §13).
//
// A MEDICAO
//
//   `ItemDeMenu` tem `codicon`, `label`, `path` e `grupo` — **e nenhum campo de permissao**
//   o plugin `b3po-nav` tem **ZERO referencias** a `role`, `actor`, `can` ou `rbac`
//   **56 canais** exigem `read` (e 58 exigem `execute`)
//
// O efeito: **o menu mostra os 23 modulos para qualquer ator**, e o `exigirAtor` de cada canal so recusa quando a
// tela ja abriu. **O operador clica e bate numa parede** — e a parede esta atras de todas as portas, nao na frente
// de uma.
//
// O QUE JA EXISTIA
//
// **`hermes:admin:whoami` existe desde antes desta sessao**, o preload o expoe, e `api/admin.ts` tem `whoami()`.
// **O renderer podia saber o ator e nunca perguntava.** Nao faltava canal: faltava pergunta.
//
// A DECISAO
//
// O criterio e **`read`**, nao `execute`. Quem so LE um modulo deve ve-lo: esconder o que a pessoa pode consultar
// seria transformar permissao em segredo. E `read` e o que o canal exige para LISTAR — entao a tela abre e mostra.
//
// AS TRES REGRAS
//
// 1. **Sem ator (`null`) o menu aparece inteiro.** O `whoami` devolve `null` quando a ponte nao esta pronta (janela
//    abrindo, teste, ambiente sem admin). **Esconder tudo nesse instante deixaria a barra vazia por um erro de
//    carregamento** — e um menu vazio nao e mais seguro, e menos diagnostico. A barra some um segundo depois, se o
//    ator de fato nao tiver `read`.
//
// 2. **Nivel `null` nao le.** Um ator sem nivel atribuido nao tem `READ` — e `null` nao e "todos os poderes".
//
// 3. **Bot ve o que o humano ve**, com o nivel dele. Nao ha menu de bot.

import type { ActorRow } from '@/api/admin'

/**
 * A ordem de poder, **copiada de `electron/rbac.ts`** (o `RANK` da L80).
 *
 * **Não é uma aproximação.** A primeira versão deste arquivo tinha `EXECUTE_ALLOWED: 4` e `WRITE: 3` — dois números
 * que eu inventei. O real tem **`EXECUTE_ALLOWED: 3`** e **`SUPERVISED_AUTONOMY: 4`**, e **não existe nível
 * `WRITE`**. Duas listas de níveis com ordens diferentes fariam o menu discordar do canal — e o canal é quem manda,
 * porque é ele que recusa.
 */
export const ORDEM_DO_NIVEL: Record<string, number> = {
  EXECUTE_ALLOWED: 3,
  PREPARE: 2,
  READ: 0,
  RECOMMEND: 1,
  SUPERVISED_AUTONOMY: 4
}

/** O que "ler" exige. */
const NIVEL_DE_LEITURA = 0

/**
 * O ator pode LER um módulo?
 *
 * **`read` é o critério** — e não `execute`: quem consulta vê o item, quem só executa também (executar implica
 * ler). Esconder um módulo que a pessoa pode consultar transformaria permissão em segredo.
 */
export function podeLer(ator: ActorRow | null): boolean {
  if (!ator) return true

  // `null` nao e "todos os poderes": e nivel nao atribuido.
  if (ator.level === null) return false

  const rank = ORDEM_DO_NIVEL[ator.level]

  return typeof rank === 'number' && rank >= NIVEL_DE_LEITURA
}

/**
 * O menu que este ator vê.
 *
 * **Sem ator, devolve a lista inteira** — ver a regra 1 no topo do arquivo: um menu vazio por falha de
 * carregamento é menos seguro e menos diagnóstico que o menu completo por um segundo.
 */
export function menuDoAtor<T extends { readonly label: string }>(itens: readonly T[], ator: ActorRow | null): T[] {
  return podeLer(ator) ? [...itens] : []
}
