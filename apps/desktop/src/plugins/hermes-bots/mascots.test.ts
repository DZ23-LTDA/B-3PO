/**
 * Catalogo de mascotes: o app precisa empacotar exatamente os 20 oficiais,
 * com 512×512, e nunca inventar um id que não existe.
 */

import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { mascotById, MASCOTS } from './mascots'

// vitest roda com cwd em apps/desktop; nao usar import.meta.url (pode nao ser file://)
const MASCOT_DIR = resolve(process.cwd(), 'src/plugins/hermes-bots/assets/mascots') + '/'

function pngSize(file: string): [number, number] | null {
  const buffer = readFileSync(file)

  if (buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') {
    return null
  }

  if (buffer.subarray(12, 16).toString('ascii') !== 'IHDR') {
    return null
  }

  return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)]
}

describe('MASCOTS', () => {
  it('tem exatamente os 20 mascotes oficiais', () => {
    expect(MASCOTS).toHaveLength(20)
    expect(new Set(MASCOTS.map(mascot => mascot.id)).size).toBe(20)
  })

  it('bate com o manifest empacotado (ids e nomes, mesma ordem)', () => {
    const manifest = JSON.parse(readFileSync(`${MASCOT_DIR}manifest.json`, 'utf8')) as Array<{ id: string; name: string }>
    expect(MASCOTS.map(m => m.id)).toEqual(manifest.map(m => m.id))
    expect(MASCOTS.map(m => m.name)).toEqual(manifest.map(m => m.name))
  })

  it('cada mascote tem nome e src utilizaveis', () => {
    for (const mascot of MASCOTS) {
      expect(mascot.name.trim().length).toBeGreaterThan(0)
      expect(mascot.src.length).toBeGreaterThan(0)
    }
  })

  it('os 20 PNGs existem em disco e sao 512x512', () => {
    const files = readdirSync(MASCOT_DIR).filter(name => name.endsWith('.png'))
    expect(files).toHaveLength(20)

    for (const mascot of MASCOTS) {
      expect(pngSize(`${MASCOT_DIR}${mascot.id}.png`)).toEqual([512, 512])
    }
  })
})

describe('mascotById', () => {
  it('acha um mascote existente', () => {
    expect(mascotById('bit')?.name).toBe('Bit')
  })

  it('devolve null para id desconhecido, vazio ou nulo', () => {
    expect(mascotById('nao-existe')).toBeNull()
    expect(mascotById('')).toBeNull()
    expect(mascotById(null)).toBeNull()
    expect(mascotById(undefined)).toBeNull()
  })
})
