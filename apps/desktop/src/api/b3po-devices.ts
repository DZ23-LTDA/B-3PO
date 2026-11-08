import { hermesApi, profileScoped } from './client'

/**
 * Dispositivos pareados ao B-3PO (os celulares que recebem ticket de sessão).
 *
 * O backend é o dono da verdade (`/api/b3po/devices`); esta camada só lê e revoga. A revogação é
 * irreversível no servidor — o aparelho perde o direito de tirar ticket novo —, então a tela confirma antes.
 */

export interface PairedDevice {
  created_at: number
  device_id: string
  label: string
  last_seen_at: null | number
  profile_id: string
  revoked: boolean
  tickets_minted: number
}

export interface PairedDeviceList {
  devices: PairedDevice[]
}

export function listPairedDevices(): Promise<PairedDeviceList> {
  return hermesApi<PairedDeviceList>({ ...profileScoped(), path: '/api/b3po/devices' })
}

export function revokePairedDevice(deviceId: string): Promise<{ devices: PairedDevice[] }> {
  return hermesApi<{ devices: PairedDevice[] }>({
    ...profileScoped(),
    method: 'DELETE',
    path: `/api/b3po/devices/${encodeURIComponent(deviceId)}`
  })
}
