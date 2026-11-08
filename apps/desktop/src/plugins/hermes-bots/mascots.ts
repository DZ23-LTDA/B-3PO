/**
 * Catalogo dos 20 mascotes oficiais da marca, empacotados com o app.
 *
 * A arte vive em `brand/avatars` (fonte da verdade); `./assets/mascots/` e a copia
 * consumida pelo bundle do desktop. Divergencia entre os dois e falha de teste
 * (`mascots.test.ts` compara catalogo, manifest e arquivos em disco).
 */

import bitUrl from './assets/mascots/bit.png'
import botUrl from './assets/mascots/bot.png'
import bufferUrl from './assets/mascots/buffer.png'
import cacheUrl from './assets/mascots/cache.png'
import chipUrl from './assets/mascots/chip.png'
import cortexUrl from './assets/mascots/cortex.png'
import fluxUrl from './assets/mascots/flux.png'
import kernelUrl from './assets/mascots/kernel.png'
import logicUrl from './assets/mascots/logic.png'
import nexusUrl from './assets/mascots/nexus.png'
import nodeUrl from './assets/mascots/node.png'
import pixelUrl from './assets/mascots/pixel.png'
import promptUrl from './assets/mascots/prompt.png'
import pulseUrl from './assets/mascots/pulse.png'
import sparkUrl from './assets/mascots/spark.png'
import syncUrl from './assets/mascots/sync.png'
import syntaxUrl from './assets/mascots/syntax.png'
import vectorUrl from './assets/mascots/vector.png'
import voltUrl from './assets/mascots/volt.png'
import wattUrl from './assets/mascots/watt.png'

export interface Mascot {
  id: string
  name: string
  src: string
}

export const MASCOTS: readonly Mascot[] = [
  { id: "bit", name: "Bit", src: bitUrl },
  { id: "pixel", name: "Pixel", src: pixelUrl },
  { id: "chip", name: "Chip", src: chipUrl },
  { id: "cache", name: "Cache", src: cacheUrl },
  { id: "buffer", name: "Buffer", src: bufferUrl },
  { id: "kernel", name: "Kernel", src: kernelUrl },
  { id: "node", name: "Node", src: nodeUrl },
  { id: "syntax", name: "Syntax", src: syntaxUrl },
  { id: "volt", name: "Volt", src: voltUrl },
  { id: "watt", name: "Watt", src: wattUrl },
  { id: "spark", name: "Spark", src: sparkUrl },
  { id: "pulse", name: "Pulse", src: pulseUrl },
  { id: "flux", name: "Flux", src: fluxUrl },
  { id: "vector", name: "Vector", src: vectorUrl },
  { id: "bot", name: "Bot", src: botUrl },
  { id: "cortex", name: "Cortex", src: cortexUrl },
  { id: "sync", name: "Sync", src: syncUrl },
  { id: "prompt", name: "Prompt", src: promptUrl },
  { id: "logic", name: "Logic", src: logicUrl },
  { id: "nexus", name: "Nexus", src: nexusUrl },
]

/** Busca por id; devolve `null` para um mascote que nao existe (nunca inventa). */
export function mascotById(id: string | null | undefined): Mascot | null {
  if (!id) {
    return null
  }

  return MASCOTS.find(mascot => mascot.id === id) ?? null
}

/**
 * Mascote padrão de um bot sem `mascot_id`: um dos 20 oficiais, escolhido de forma determinística
 * pelo nome (o mesmo bot sempre recebe o mesmo mascote). Sem isso o roster caía no sigilo gerado,
 * ignorando a identidade visual da marca.
 */
export function defaultMascotFor(name: string): Mascot {
  let hash = 0

  for (const char of name) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  }

  return MASCOTS[hash % MASCOTS.length]
}

/** Arte do roster: o mascote escolhido, ou o padrão determinístico pelo nome do bot. */
export function rosterMascotSrc(mascotId: string | null | undefined, name: string): string {
  return (mascotById(mascotId ?? null) ?? defaultMascotFor(name)).src
}

/** Imagem do roster quando o bot ESCOLHEU um mascote; `null` mantém a face animada. */
export function rosterFaceFor(mascotId: string | null | undefined): null | string {
  const selected = mascotById(mascotId ?? null)

  return selected ? selected.src : null
}
