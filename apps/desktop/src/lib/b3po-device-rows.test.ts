import { describe, expect, it } from 'vitest'

import type { PairedDevice } from '@/api/b3po-devices'
import { canRevoke, deviceRows } from './b3po-device-rows'

const device = (over: Partial<PairedDevice> = {}): PairedDevice => ({
  created_at: Date.UTC(2026, 10, 1),
  device_id: 'dev-1',
  label: 'Pixel do Leandro',
  last_seen_at: null,
  profile_id: 'default',
  revoked: false,
  tickets_minted: 2,
  ...over
})

describe('linhas de dispositivos pareados', () => {
  it('mostra "nunca" quando o aparelho nunca tirou ticket', () => {
    const [row] = deviceRows([device()])

    expect(row?.lastSeen).toBe('nunca')
    expect(row?.created).not.toBe('nunca')
  })

  it('ordena ativos antes de revogados, e o mais recente primeiro', () => {
    const rows = deviceRows([
      device({ device_id: 'revogado', revoked: true }),
      device({ device_id: 'antigo', last_seen_at: 1_700_000_000_000 }),
      device({ device_id: 'recente', last_seen_at: 1_800_000_000_000 })
    ])

    expect(rows.map(row => row.deviceId)).toEqual(['recente', 'antigo', 'revogado'])
  })

  it('cai para o id quando o rótulo está vazio', () => {
    const [row] = deviceRows([device({ label: '   ' })])

    expect(row?.label).toBe('dev-1')
  })

  it('não oferece revogar o que já está revogado', () => {
    expect(canRevoke(device())).toBe(true)
    expect(canRevoke(device({ revoked: true }))).toBe(false)
  })
})
