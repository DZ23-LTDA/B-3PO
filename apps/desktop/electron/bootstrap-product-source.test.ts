/**
 * O bootstrap do desktop instala o produto (B-3PO), não o upstream Hermes.
 *
 * Contrato: um install stamp sem branch segue a **branch de produto**. Se alguém voltar o fallback
 * para `main`, este teste falha — e o app deixaria de instalar o B-3PO sem avisar o usuário.
 */
import assert from 'node:assert/strict'

import { describe, expect, it } from 'vitest'

import { installRefForStamp } from './bootstrap-runner'

const ZERO_SHA = '0000000000000000000000000000000000000000'

describe('installRefForStamp', () => {
  it('segue a branch de produto quando o stamp tem commit e nenhuma branch', () => {
    const ref = installRefForStamp({ branch: null, commit: ZERO_SHA }, { pinCommit: false })

    expect(ref?.ref).toBe('b3po-brand')
    expect(ref?.pinned).toBe(false)
  })

  it('respeita a branch explicita do stamp', () => {
    const ref = installRefForStamp({ branch: 'release-1', commit: ZERO_SHA }, { pinCommit: false })

    expect(ref?.ref).toBe('release-1')
  })

  it('continua fixando um commit imutavel quando existe', () => {
    const ref = installRefForStamp({ branch: 'b3po-brand', commit: 'abc1234' })

    assert.deepEqual(ref, { cacheKey: 'abc1234', pinned: true, ref: 'abc1234' })
  })

  it('devolve null para stamp que nao e instalacao git', () => {
    expect(installRefForStamp({ branch: null, commit: 'not-a-sha' })).toBeNull()
  })
})
