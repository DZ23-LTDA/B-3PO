/**
 * O mascote é a identidade visual do bot: escolhido no seletor, renderizado no roster.
 *
 * Antes, `mascot_id` era persistido mas o roster desenhava um sigilo gerado — o usuário escolhia um
 * mascote e continuava vendo o avatar automático. Estes testes prendem o contrato de render.
 */
import { describe, expect, it } from 'vitest'

import { defaultMascotFor, MASCOTS, mascotById, rosterMascotSrc } from './mascots'

describe('mascote no roster', () => {
  it('o escolhido vence o padrão', () => {
    const escolhido = mascotById('cortex')

    expect(escolhido).not.toBeNull()
    expect(rosterMascotSrc('cortex', 'qualquer')).toBe(escolhido?.src)
  })

  it('sem escolha, usa um dos 20 oficiais — nunca vazio', () => {
    const src = rosterMascotSrc(null, 'Hermes')

    expect(src).toBeTruthy()
    expect(MASCOTS.some(mascot => mascot.src === src)).toBe(true)
  })

  it('é determinístico por nome (o mesmo bot mantém o mesmo mascote)', () => {
    expect(rosterMascotSrc(undefined, 'Atlas')).toBe(rosterMascotSrc(null, 'Atlas'))
    expect(defaultMascotFor('Atlas').id).toBe(defaultMascotFor('Atlas').id)
  })

  it('id desconhecido cai no padrão em vez de quebrar', () => {
    expect(rosterMascotSrc('nao-existe', 'Atlas')).toBe(defaultMascotFor('Atlas').src)
  })

  it('o catálogo tem os 20 mascotes da marca, com ids únicos', () => {
    expect(MASCOTS).toHaveLength(20)
    expect(new Set(MASCOTS.map(mascot => mascot.id)).size).toBe(20)
  })
})
