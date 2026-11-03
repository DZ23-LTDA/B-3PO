/**
 * Navegação do app mobile.
 *
 * Por que não `@react-navigation`: o codegen da Nova Arquitetura do RN 0.81 deste ambiente rejeita o
 * spec de `react-native-screens` (erro `The first argument of method showColumn must be of type
 * React.ElementRef<>`), e o mesmo acontece com `react-native-keychain`. Sem codegen a build do APK
 * não passa. Para três telas, uma pilha própria de 40 linhas resolve sem trazer essa fragilidade —
 * e é testável sem aparelho. Quando o RN for atualizado (ou o spec compatível existir), a troca é
 * local: as telas consomem esta interface.
 */

export type Route =
  | { name: 'bots' }
  | { name: 'chat'; botName: string; title: string }

export interface NavState {
  stack: Route[]
}

export function initialNav(): NavState {
  return { stack: [{ name: 'bots' }] }
}

export function currentRoute(state: NavState): Route {
  const last = state.stack[state.stack.length - 1]

  return last ?? { name: 'bots' }
}

export function openChat(state: NavState, bot: { name: string; title: string }): NavState {
  // Evita empilhar a mesma conversa duas vezes (toque duplo, por exemplo).
  const current = currentRoute(state)

  if (current.name === 'chat' && current.botName === bot.name) {
    return state
  }

  return { stack: [...state.stack, { name: 'chat', botName: bot.name, title: bot.title }] }
}

export function back(state: NavState): NavState {
  if (state.stack.length <= 1) {
    return state
  }

  return { stack: state.stack.slice(0, -1) }
}

/** Rótulo do botão voltar, para leitor de tela. */
export function backLabel(state: NavState): string {
  const parent = state.stack[state.stack.length - 2]

  if (!parent) {
    return 'Voltar'
  }

  return parent.name === 'bots' ? 'Voltar para a lista de bots' : 'Voltar'
}

/** Título do cabeçalho da conversa, já com o nome do bot. */
export function headerTitle(route: Route): string {
  return route.name === 'chat' ? route.title : 'B-3PO'
}
