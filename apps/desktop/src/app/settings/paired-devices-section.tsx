import { useCallback, useEffect, useState } from 'react'

import type { PairedDevice } from '@/api/b3po-devices'
import { listPairedDevices, revokePairedDevice } from '@/api/b3po-devices'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/ui/loader'
import { useI18n } from '@/i18n/context'
import { canRevoke, deviceRows } from '@/lib/b3po-device-rows'

/**
 * Dispositivos pareados ao B-3PO (os celulares que conversam com os bots deste computador).
 *
 * Os dados são do backend (`/api/b3po/devices`); a tela só apresenta e pede revogação. Revogar é
 * irreversível no servidor, então cada linha pede confirmação antes de agir.
 */
export function PairedDevicesSection() {
  const { t } = useI18n()
  const copy = t.settings.gateway

  const [devices, setDevices] = useState<null | PairedDevice[]>(null)
  const [error, setError] = useState(false)
  const [confirming, setConfirming] = useState<null | string>(null)
  const [revoking, setRevoking] = useState<null | string>(null)

  const load = useCallback(async () => {
    setError(false)

    try {
      const answer = await listPairedDevices()
      setDevices(answer.devices ?? [])
    } catch {
      setError(true)
      setDevices([])
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const revoke = useCallback(async (deviceId: string) => {
    setRevoking(deviceId)

    try {
      const answer = await revokePairedDevice(deviceId)
      setDevices(answer.devices ?? [])
    } catch {
      setError(true)
    } finally {
      setRevoking(null)
      setConfirming(null)
    }
  }, [])

  const rows = deviceRows(devices ?? [])

  return (
    <div className="mt-8 border-t border-border/60 pt-6">
      <p className="mb-1 text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
        {copy.pairedDevicesTitle}
      </p>
      <p className="mb-4 text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
        {copy.pairedDevicesIntro}
      </p>

      {devices === null ? (
        <Loader className="mx-auto my-2 size-6 text-(--ui-text-tertiary)" label={t.common.loading} type="rose-orbit" />
      ) : null}

      {error ? (
        <div className="flex items-center gap-3">
          <p className="text-sm text-(--ui-text-secondary)">{copy.pairedDevicesError}</p>
          <Button onClick={() => void load()} size="sm" variant="ghost">
            {copy.pairedDevicesRefresh}
          </Button>
        </div>
      ) : null}

      {devices !== null && !error && rows.length === 0 ? (
        <p className="text-sm text-(--ui-text-secondary)">{copy.pairedDevicesEmpty}</p>
      ) : null}

      {devices !== null && rows.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {rows.map(row => (
            <li
              className="flex items-center justify-between gap-4 rounded-md border border-border/60 px-3 py-2"
              key={row.deviceId}
            >
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm text-foreground">
                  {row.label}
                  {row.revoked ? ` · ${copy.pairedDevicesRevoked}` : ''}
                </span>
                <span className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
                  {`${row.profile} · ${copy.pairedDevicesLastSeen}: ${row.lastSeen} · ${copy.pairedDevicesCreated}: ${row.created} · ${copy.pairedDevicesTickets}: ${row.tickets}`}
                </span>
              </div>

              {row.revoked ? null : confirming === row.deviceId ? (
                <div className="flex shrink-0 items-center gap-2">
                  <Button onClick={() => void revoke(row.deviceId)} size="sm" variant="destructive">
                    {copy.pairedDevicesRevoke}
                  </Button>
                  <Button onClick={() => setConfirming(null)} size="sm" variant="ghost">
                    {t.common.cancel}
                  </Button>
                </div>
              ) : (
                <Button
                  disabled={revoking === row.deviceId}
                  onClick={() => setConfirming(row.deviceId)}
                  size="sm"
                  variant="ghost"
                >
                  {copy.pairedDevicesRevoke}
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
