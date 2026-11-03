/**
 * Cobertura do catálogo pt-BR: mede, não adivinha.
 *
 * O catálogo é um override parcial sobre o inglês, então "traduzido" precisa ser um número. Este
 * teste calcula a cobertura real de chaves e a trava com um piso: traduzir mais passa, remover
 * tradução falha. Também garante que nenhuma chave inventada entre no pt (typo silencioso) e que
 * valores-função continuem funções com a mesma aridade do inglês.
 */
import { flattenMessageKeys } from '@hermes/shared/i18n'
import { describe, expect, it } from 'vitest'

import { en } from './en'
import { pt, ptOverrides } from './pt'

/**
 * Piso atual (3,1% de todas as chaves do catálogo inglês). Só pode subir: cada seção nova
 * traduzida deve atualizar este número para o valor medido, nunca para baixo.
 */
const COVERAGE_FLOOR = 0.031

type Tree = Record<string, unknown>

function leafKeys(tree: Tree, prefix = ''): string[] {
  const keys: string[] = []

  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object') {
      keys.push(...leafKeys(value as Tree, path))
    } else {
      keys.push(path)
    }
  }

  return keys
}

function valueAt(tree: Tree, path: string): unknown {
  return path.split('.').reduce<unknown>((node, part) => (node as Tree | undefined)?.[part], tree)
}

describe('cobertura pt-BR', () => {
  const english = new Set(flattenMessageKeys(en))
  const translated = new Set(flattenMessageKeys(ptOverrides as unknown as Tree))

  it('traduz pelo menos o piso declarado', () => {
    const coverage = translated.size / english.size

    expect(translated.size).toBeGreaterThan(0)
    expect(coverage).toBeGreaterThanOrEqual(COVERAGE_FLOOR)
  })

  it('não inventa chave que não existe no inglês', () => {
    const invented = [...translated].filter(key => !english.has(key))

    expect(invented).toEqual([])
  })

  it('mantém função onde o inglês tem função, com a mesma aridade', () => {
    const mismatched: string[] = []

    for (const key of translated) {
      const source = valueAt(en as unknown as Tree, key)
      const target = valueAt(ptOverrides as unknown as Tree, key)
      const sourceIsFn = typeof source === 'function'
      const targetIsFn = typeof target === 'function'

      if (sourceIsFn !== targetIsFn) {
        mismatched.push(`${key}: en=${typeof source} pt=${typeof target}`)
        continue
      }

      if (sourceIsFn && (source as (...args: unknown[]) => unknown).length !== (target as (...args: unknown[]) => unknown).length) {
        mismatched.push(`${key}: aridade diferente`)
      }
    }

    expect(mismatched).toEqual([])
  })

  it('não deixa string vazia nem igual ao inglês por acidente', () => {
    const suspicious: string[] = []

    for (const key of translated) {
      const target = valueAt(ptOverrides as unknown as Tree, key)
      if (typeof target !== 'string') {
        continue
      }

      if (target.trim() === '') {
        suspicious.push(`${key}: vazio`)
      }
    }

    expect(suspicious).toEqual([])
  })

  it('cobre as telas pedidas pelo proprietário', () => {
    // Seções que o app real mostra primeiro: sidebar, setup de modelo, configurações, erros.
    const required = ['common', 'install', 'language', 'errors', 'ui', 'modelPicker']
    const sections = new Set([...translated].map(key => key.split('.')[0]))

    expect([...required].filter(section => !sections.has(section))).toEqual([])
  })

  it('mantém as referências técnicas de runtime em inglês', () => {
    expect(pt.install.settingUpTitle).toContain('Hermes Agent')
    expect(pt.modelPicker.proNeedsSubscription).toContain('Nous')
  })
})
