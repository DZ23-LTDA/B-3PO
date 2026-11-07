import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  listPairedDevices: vi.fn(),
  revokePairedDevice: vi.fn()
}))

vi.mock('@/api/b3po-devices', () => api)

import type { PairedDevice } from '@/api/b3po-devices'

import { I18nProvider } from '@/i18n'

import { PairedDevicesSection } from './paired-devices-section'

const device = (over: Partial<PairedDevice> = {}): PairedDevice => ({
  created_at: Date.UTC(2026, 10, 1),
  device_id: 'dev-1',
  label: 'Pixel do Leandro',
  last_seen_at: null,
  profile_id: 'revisor-codigo',
  revoked: false,
  tickets_minted: 3,
  ...over
})

function renderSection() {
  return render(
    <I18nProvider>
      <PairedDevicesSection />
    </I18nProvider>
  )
}

describe('dispositivos pareados (Configurações)', () => {
  beforeEach(() => {
    api.listPairedDevices.mockReset()
    api.revokePairedDevice.mockReset()
  })

  it('lista o aparelho com perfil, último uso, inclusão e tickets', async () => {
    api.listPairedDevices.mockResolvedValue({ devices: [device()] })

    renderSection()

    expect(await screen.findByText(/Pixel do Leandro/)).toBeTruthy()
    expect(screen.getByText(/revisor-codigo/)).toBeTruthy()
    expect(screen.getByText(/nunca/)).toBeTruthy()
    expect(screen.getByText(/3/)).toBeTruthy()
  })

  it('explica o estado vazio em vez de mostrar uma lista em branco', async () => {
    api.listPairedDevices.mockResolvedValue({ devices: [] })

    renderSection()

    await waitFor(() => {
      expect(screen.getByText(/No phone paired yet|Nenhum celular pareado/)).toBeTruthy()
    })
  })

  it('falha de leitura mostra a mensagem e um botão para tentar de novo', async () => {
    api.listPairedDevices.mockRejectedValueOnce(new Error('offline'))
    renderSection()

    const refresh = await screen.findByRole('button', { name: /Refresh|Atualizar/ })
    api.listPairedDevices.mockResolvedValue({ devices: [device()] })
    fireEvent.click(refresh)

    expect(await screen.findByText(/Pixel do Leandro/)).toBeTruthy()
  })

  it('revogar pede confirmação e só então chama o backend', async () => {
    api.listPairedDevices.mockResolvedValue({ devices: [device()] })
    api.revokePairedDevice.mockResolvedValue({ devices: [device({ revoked: true })] })

    renderSection()

    const first = await screen.findByRole('button', { name: /Revoke|Revogar/ })
    fireEvent.click(first)

    // primeiro clique só arma a confirmação: nada foi revogado ainda
    expect(api.revokePairedDevice).not.toHaveBeenCalled()

    const confirm = screen.getAllByRole('button', { name: /Revoke|Revogar/ })
    fireEvent.click(confirm[confirm.length - 1]!)

    await waitFor(() => {
      expect(api.revokePairedDevice).toHaveBeenCalledWith('dev-1')
    })
    expect(await screen.findByText(/revoked|revogado/)).toBeTruthy()
  })

  it('não oferece revogar um aparelho já revogado', async () => {
    api.listPairedDevices.mockResolvedValue({ devices: [device({ revoked: true })] })

    renderSection()

    await screen.findByText(/revoked|revogado/)

    expect(screen.queryByRole('button', { name: /Revoke|Revogar/ })).toBeNull()
  })
})
