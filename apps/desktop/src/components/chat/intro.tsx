import { useState } from 'react'

import { HomeB3po } from '@/components/chat/home-b3po'
import { useI18n } from '@/i18n'
import { capitalize, normalize } from '@/lib/text'

import introCopyJsonl from './intro-copy.jsonl?raw'
import introCopyPtJsonl from './intro-copy.pt.jsonl?raw'
import { Wordmark } from './wordmark'

type IntroCopy = {
  headline: string
  body: string
}

type IntroCopyRecord = IntroCopy & {
  personality: string
}

export type IntroProps = {
  personality?: string
  seed?: number
}

const NEUTRAL_PERSONALITIES = new Set(['', 'default', 'none', 'neutral'])

const FALLBACK_COPY: IntroCopy[] = [
  {
    headline: 'What are we moving today?',
    body: "Send a bug, branch, plan, or rough idea. I'll inspect the repo and turn it into the next concrete step."
  },
  {
    headline: "What's on your mind?",
    body: "Bring the code, question, or stuck part. I'll read the room before making changes."
  },
  {
    headline: 'What should Hermes look at?',
    body: "Send the task, failing path, or half-formed plan. I'll help turn it into action."
  },
  {
    headline: 'Where should we start?',
    body: "Bring the problem, goal, or file. I'll inspect first and keep the next step concrete."
  },
  {
    headline: 'What needs attention?',
    body: "Send the context you have. I'll help sort it into a plan or a fix."
  }
]

function normalizeKey(value?: string): string {
  return normalize(value)
}

function titleize(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(capitalize)
    .join(' ')
}

function isIntroCopyRecord(value: unknown): value is IntroCopyRecord {
  if (!value || typeof value !== 'object') {
    return false
  }

  const record = value as Record<string, unknown>

  return (
    typeof record.personality === 'string' &&
    typeof record.headline === 'string' &&
    typeof record.body === 'string' &&
    Boolean(record.personality.trim()) &&
    Boolean(record.headline.trim()) &&
    Boolean(record.body.trim())
  )
}

function parseIntroCopy(raw: string): Record<string, IntroCopy[]> {
  const byPersonality: Record<string, IntroCopy[]> = {}

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()

    if (!trimmed) {
      continue
    }

    try {
      const parsed: unknown = JSON.parse(trimmed)

      if (!isIntroCopyRecord(parsed)) {
        continue
      }

      const key = normalizeKey(parsed.personality)
      byPersonality[key] ??= []
      byPersonality[key].push({
        headline: parsed.headline.trim(),
        body: parsed.body.trim()
      })
    } catch {
      // Bad generated copy should not break the whole desktop app.
    }
  }

  return byPersonality
}

const INTRO_COPY_BY_PERSONALITY = parseIntroCopy(introCopyJsonl)
// Portuguese copy for the personalities it covers; every other personality/dialect keeps English.
const INTRO_COPY_PT = parseIntroCopy(introCopyPtJsonl)

function copyTable(locale: string): Record<string, IntroCopy[]> {
  return locale.startsWith('pt') ? { ...INTRO_COPY_BY_PERSONALITY, ...INTRO_COPY_PT } : INTRO_COPY_BY_PERSONALITY
}

function neutralCopy(): IntroCopy[] {
  return INTRO_COPY_BY_PERSONALITY.none || INTRO_COPY_BY_PERSONALITY.default || FALLBACK_COPY
}

function fallbackCopyForPersonality(personalityKey: string): IntroCopy[] {
  if (NEUTRAL_PERSONALITIES.has(personalityKey)) {
    return neutralCopy()
  }

  const label = titleize(personalityKey)

  return [
    {
      headline: `${label} mode is on. What should we work on?`,
      body: "Send the task, file, or rough idea. I'll use your configured voice and keep the work grounded in this repo."
    },
    {
      headline: `What does ${label} Hermes need to see?`,
      body: "Bring the context or the stuck part. I'll adapt to your configured personality."
    },
    {
      headline: `${label} mode is ready.`,
      body: "Send the problem, file, or idea. I'll follow the personality you've configured."
    },
    {
      headline: `What should ${label} Hermes tackle?`,
      body: "Drop the task here. I'll keep the work grounded in the repo."
    },
    {
      headline: 'Where should we begin?',
      body: `Give me the context and I'll answer in ${label} mode.`
    }
  ]
}

function pickCopy(copies: IntroCopy[], seed = 0): IntroCopy {
  return copies[Math.abs(seed) % copies.length] || FALLBACK_COPY[0]
}

const WORDMARK = 'B-3PO'

function resolveCopy(personality: string | undefined, seed: number | undefined, locale: string): IntroCopy {
  const personalityKey = normalizeKey(personality)
  const table = copyTable(locale)

  const copies = NEUTRAL_PERSONALITIES.has(personalityKey)
    ? table[personalityKey] || table.none || table.default || FALLBACK_COPY
    : table[personalityKey] || INTRO_COPY_BY_PERSONALITY[personalityKey] || fallbackCopyForPersonality(personalityKey)

  return pickCopy(copies, seed)
}

export function Intro({ personality, seed }: IntroProps) {
  const [mountSeed] = useState(() => Math.floor(Math.random() * 100000))
  const { locale, t } = useI18n()
  const rotationSeed = mountSeed + (seed ?? 0)
  const copy = resolveCopy(personality, rotationSeed, locale)
  const key = normalizeKey(personality)
  // Chat genérico (ou persona neutra) mostra a marca; o chat de um bot mostra o nome dele.
  const isBrand = NEUTRAL_PERSONALITIES.has(key)
  const wordmarkText = isBrand ? WORDMARK : titleize(personality || '')

  const bodies =
    t.intro.stock[key] ?? (NEUTRAL_PERSONALITIES.has(key) ? t.intro.stock.none : t.intro.custom(personality || ''))

  const body = bodies?.[Math.abs(rotationSeed) % bodies.length] ?? copy.body

  return (
    <div
      className={`flex w-full min-w-0 flex-col items-center justify-center px-0.5 py-6 text-center text-muted-foreground sm:px-6 lg:px-8 ${
        // r268: a home tem CARTÕES, e o container do intro existe para ser decorativo
        // (`pointer-events-none`, para o composer e o arraste do fundo funcionarem). No chat
        // genérico a home precisa de clique; no chat de um bot a tela continua decorativa.
        isBrand ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
      data-slot="aui_intro"
    >
      <div className="flex w-full min-w-0 flex-col items-center">
        {isBrand ? (
          /*
           * r268: **a home do produto**, no lugar da frase rotativa em inglês.
           *
           * A referência visual da missão final pede marca + posicionamento + os seis
           * ambientes. O `Intro` do Hermes é uma boa tela para um agente de código e a tela
           * errada para um produto de gestão: ela não diz o que o produto faz nem por onde
           * começar.
           *
           * **Só no chat genérico.** O chat de um bot continua com o `Wordmark` e a fala dele
           * — trocar aquilo apagaria a identidade do bot.
           */
          <HomeB3po />
        ) : (
          <>
            <Wordmark className="mb-1" text={wordmarkText} />
            <p className="m-0 text-center leading-normal tracking-tight">{body}</p>
          </>
        )}
      </div>
    </div>
  )
}
