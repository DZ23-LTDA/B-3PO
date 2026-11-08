import { describe, expect, it } from 'vitest'

import { back, backLabel, currentRoute, headerTitle, initialNav, openChat } from './router'

describe('navegação do app', () => {
  it('começa na lista de bots', () => {
    expect(currentRoute(initialNav())).toEqual({ name: 'bots' })
    expect(headerTitle(currentRoute(initialNav()))).toBe('B-3PO')
  })

  it('abre a conversa do bot escolhido', () => {
    const nav = openChat(initialNav(), { name: 'revisor', title: 'Revisor de Código' })
    const route = currentRoute(nav)

    expect(route).toEqual({ name: 'chat', botName: 'revisor', title: 'Revisor de Código' })
    expect(headerTitle(route)).toBe('Revisor de Código')
  })

  it('voltar retorna para a lista e não estoura a pilha na raiz', () => {
    const chat = openChat(initialNav(), { name: 'revisor', title: 'Revisor' })

    expect(currentRoute(back(chat))).toEqual({ name: 'bots' })
    expect(back(initialNav())).toEqual(initialNav())
  })

  it('toque duplo no mesmo bot não empilha duas conversas', () => {
    const once = openChat(initialNav(), { name: 'revisor', title: 'Revisor' })
    const twice = openChat(once, { name: 'revisor', title: 'Revisor' })

    expect(twice.stack).toHaveLength(2)
    expect(twice).toBe(once)
  })

  it('abrir outro bot empilha a nova conversa', () => {
    const first = openChat(initialNav(), { name: 'revisor', title: 'Revisor' })
    const second = openChat(first, { name: 'analista', title: 'Analista' })

    expect(second.stack).toHaveLength(3)
    expect(currentRoute(second)).toMatchObject({ botName: 'analista' })
  })

  it('o rótulo de voltar diz para onde volta', () => {
    const chat = openChat(initialNav(), { name: 'revisor', title: 'Revisor' })

    expect(backLabel(chat)).toBe('Voltar para a lista de bots')
    expect(backLabel(initialNav())).toBe('Voltar')
  })
})
