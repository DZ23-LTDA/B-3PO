import { describe, expect, it } from 'vitest'

import { shortVersion } from './version-label'

describe('shortVersion', () => {
  it('keeps the distance past the release and drops the commit', (): void => {
    expect(shortVersion('0.21.5+1913.gf83a9e9')).toBe('0.21.5+1913')
    expect(shortVersion('v0.21.5+1913.gf83a9e9.dirty')).toBe('0.21.5+1913')
    expect(shortVersion('0.21.5+1913')).toBe('0.21.5+1913')
    expect(shortVersion('0.21.5')).toBe('0.21.5')
  })

  it('a build with no release says dev instead of showing the hash', (): void => {
    // O binario rodando do codigo-fonte reporta `git.<sha>.dirty`. Mostrar hash e sufixo `dirty` na
    // barra de status diz ao usuario algo que nao e sobre o produto - e faz build entregue parecer
    // inacabado. E o que aparecia como "cliente vgit.6c85ca0.dirty".
    expect(shortVersion('git.6c85ca0.dirty')).toBe('dev')
    expect(shortVersion('git.6c85ca0')).toBe('dev')
    expect(shortVersion('GIT.ABCDEF1.DIRTY')).toBe('dev')
  })

  it('nao confunde versao semantica que contenha git no nome', (): void => {
    // So o stamp puro vira `dev`; uma release de verdade continua aparecendo.
    expect(shortVersion('1.0.0-git.abc')).toBe('1.0.0-git.abc')
    expect(shortVersion('0.21.5.git.abc')).toBe('0.21.5.git.abc')
  })
})
