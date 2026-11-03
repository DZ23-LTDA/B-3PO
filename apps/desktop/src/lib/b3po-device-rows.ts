/**
 * Apresentação dos dispositivos pareados.
 *
 * O backend é dono dos dados (`/api/b3po/devices`); aqui só se decide o que a tela mostra: quais
 * aparelhos listar, em que ordem, e como descrever cada um sem inventar informação que o registro não
 * tem (um aparelho nunca visto aparece como "nunca usado", não como "offline").
 */
import type { PairedDevice } from '@/api/b3po-devices'

export interface DeviceRow {
  created: string
  deviceId: string
  label: string
  lastSeen: string
  profile: string
  revoked: boolean
  tickets: number
}

const NEVER = 'nunca'

function day(ms: null | number): string {
  if (!ms) {
    return NEVER
  }

  return new Date(ms).toLocaleDateString()
}

/** Ativos primeiro, depois o mais recentemente usado; revogados por último. */
export function deviceRows(devices: readonly PairedDevice[]): DeviceRow[] {
  return [...devices]
    .sort((a, b) => {
      if (a.revoked !== b.revoked) {
        return a.revoked ? 1 : -1
      }

      return (b.last_seen_at ?? b.created_at) - (a.last_seen_at ?? a.created_at)
    })
    .map(device => ({
      created: day(device.created_at),
      deviceId: device.device_id,
      label: device.label.trim() || device.device_id,
      lastSeen: day(device.last_seen_at),
      profile: device.profile_id,
      revoked: device.revoked,
      tickets: device.tickets_minted
    }))
}

/** Só aparelho ativo pode ser revogado: revogar de novo não faz sentido e esconde o estado real. */
export function canRevoke(device: PairedDevice): boolean {
  return !device.revoked
}
