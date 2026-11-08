import { dirname, posix, resolve, win32 } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { ScreenshotWindow } from './command-screenshot-types'
import { NativeGestureMonitor, type NativeGestureOptions, type NativeGestureStatus } from './native-gesture-monitor'

export interface CommandScreenshotCapture extends ScreenshotWindow {
  type: 'capture'
}

export type CommandScreenshotStatus = NativeGestureStatus

interface MonitorOptions extends NativeGestureOptions {
  appPath?: string
  platform?: NodeJS.Platform
}

export function resolveCommandScreenshotMonitorPath(
  appPath = resolve(dirname(fileURLToPath(import.meta.url)), '..'),
  /**
   * r199 do GOAL V2: a plataforma é PARÂMETRO, e o caminho é montado com o separador DELA.
   *
   * **Antes, a função usava o `resolve` do HOST** — e o teste que passa `platform: 'darwin'` recebia um caminho de
   * Windows: a asserção comparava o caminho de um macOS com o separador de outro sistema.
   *
   * **O defeito é real e é do produto**: **um caminho de macOS montado com barra invertida não abre**.
   */
  platform: NodeJS.Platform = process.platform
): string {
  // Executables cannot run inside ASAR. dist/** is already explicitly unpacked.
  const path = platform === 'win32' ? win32 : posix

  return path.resolve(appPath, 'dist/native/command-screenshot-monitor').replace(/\.asar(?=[\\/]|$)/, '.asar.unpacked')
}

function parseCapture(message: Record<string, unknown>): CommandScreenshotCapture | null {
  if (message.type !== 'capture') {
    return null
  }

  const { windowId, width, height } = message

  if (
    typeof windowId !== 'number' ||
    !Number.isInteger(windowId) ||
    windowId <= 0 ||
    windowId > 0xffffffff ||
    typeof width !== 'number' ||
    !Number.isFinite(width) ||
    width <= 0 ||
    typeof height !== 'number' ||
    !Number.isFinite(height) ||
    height <= 0
  ) {
    return null
  }

  return { type: 'capture', windowId, width, height }
}

/** Own one passive native monitor. Call stop() before app quit or disabling the gesture. */
export class CommandScreenshotMonitor {
  private readonly monitor: NativeGestureMonitor<CommandScreenshotCapture>

  constructor(private readonly options: MonitorOptions = {}) {
    this.monitor = new NativeGestureMonitor({
      ...options,
      path: resolveCommandScreenshotMonitorPath(options.appPath, options.platform),
      parseGesture: parseCapture
    })
  }

  /** Only explicit user intent may pass requestPermission=true (opens the macOS prompt). */
  start(
    onCapture: (capture: CommandScreenshotCapture) => void,
    onStatus: (status: CommandScreenshotStatus) => void,
    requestPermission = false
  ): void {
    this.stop()

    if ((this.options.platform ?? process.platform) !== 'darwin') {
      onStatus({ type: 'error', code: 'unavailable' })

      return
    }

    this.monitor.start(onCapture, onStatus, requestPermission)
  }

  stop(): void {
    this.monitor.stop()
  }
}
