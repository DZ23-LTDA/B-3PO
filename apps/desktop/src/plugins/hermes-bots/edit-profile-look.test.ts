/**
 * `editedLook` só devolve o que mudou. O mascote entra nessa regra: escolher,
 * trocar ou limpar o mascote gera patch; o resto do look fica intocado.
 */

import { describe, expect, it } from 'vitest'

import { editedLook, type EditProfileLook } from './edit-profile-look'

const opened: EditProfileLook = {
  color: '#73c4ea',
  image: null,
  mascotId: null,
  shape: 'circle',
  title: 'Ops'
}

describe('editedLook — mascote', () => {
  it('não gera patch quando nada mudou', () => {
    expect(editedLook(opened, { ...opened })).toBeNull()
  })

  it('escolher um mascote grava mascot_id e marca custom', () => {
    expect(editedLook(opened, { ...opened, mascotId: 'cortex' })).toEqual({
      mascot_id: 'cortex',
      custom: true
    })
  })

  it('trocar o mascote grava o novo id', () => {
    const withMascot: EditProfileLook = { ...opened, mascotId: 'cortex' }
    expect(editedLook(withMascot, { ...withMascot, mascotId: 'nexus' })).toEqual({
      mascot_id: 'nexus',
      custom: true
    })
  })

  it('limpar o mascote grava null (e não remove a chave)', () => {
    const withMascot: EditProfileLook = { ...opened, mascotId: 'cortex' }
    expect(editedLook(withMascot, { ...withMascot, mascotId: null })).toEqual({
      mascot_id: null,
      custom: true
    })
  })

  it('mascote não arrasta título, forma nem imagem para o patch', () => {
    const patch = editedLook(opened, { ...opened, mascotId: 'bit' })
    expect(Object.keys(patch ?? {}).sort()).toEqual(['custom', 'mascot_id'])
  })
})
