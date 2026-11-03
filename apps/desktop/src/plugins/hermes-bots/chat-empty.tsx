/**
 * What a bot's chat shows before it has said anything.
 *
 * Core's splash is Hermes' own wordmark and belongs to a fresh draft; a bot
 * chat is neither. It gets the same lettering with the bot's name in it, over
 * the same face the roster row and tab carry, so an empty conversation still
 * says whose it is.
 */

import { host, useValue } from '@hermes/plugin-sdk'

import { botAppearance } from './avatar'
import { isBackfilledFacePng } from './avatar-image'
import { $botMeta, $lastRoster } from './data'
import { useBots } from './i18n'
import { displayName } from './labels'
import { rosterMascotSrc } from './mascots'
import { botRosterMeta } from './routing'
import type { RosterRow } from './types'

/** Robô da marca para bot sem mascote escolhido: identidade B-3PO, não a estrela determinística. */
const BRAND_ROBOT = `${import.meta.env.BASE_URL}b3po-mark-dark.png`

/** The bot whose canonical chat this session is, if it is one. Matches the
 *  durable registry id or the compression-lineage tip, the same pair the
 *  roster's click and preview identity resolve through. */
function botForStoredId(roster: readonly RosterRow[], storedId: string): null | RosterRow {
  if (!storedId || !Array.isArray(roster)) {
    return null
  }

  return (
    roster.find(bot => {
      const canonical = bot?.canonical_session

      return String(canonical?.id ?? '') === storedId || String(canonical?.resolved_id ?? '') === storedId
    }) ?? null
  )
}

/** The stored id of the chat on screen. The transcript hands its slot the
 *  RUNTIME id, and a canonical Bot Chat is keyed by its stored one — the same
 *  two id spaces that misrouted Bot Mode's RPCs in #93080. The focus store is
 *  the translation the rest of the plugin already trusts. */
function focusedStoredId(): string {
  return String(host.state.focusedStoredSessionId?.get?.() ?? '')
}

function botForChat(roster: readonly RosterRow[], sessionId: string): null | RosterRow {
  // Stored ids pass straight through, so a shell that hands us one still
  // resolves; otherwise the focused chat is the empty one being looked at.
  return botForStoredId(roster, sessionId) ?? botForStoredId(roster, focusedStoredId())
}

export function BotChatEmpty({ sessionId }: { sessionId: string }) {
  const b = useBots()
  // Subscribed, not read once: roster, metadata and focus all land after the
  // transcript mounts. This is also how the state appears at all — the slot
  // mounts for every empty session and only resolves to a bot once the roster
  // is in hand.
  const roster = useValue($lastRoster)
  const allMeta = useValue($botMeta)
  useValue(host.state.focusedStoredSessionId)
  const bot = botForChat(roster, sessionId)

  if (!bot) {
    return null
  }

  // Route-keyed, exactly as the roster row resolves it: metadata is scoped to
  // the gateway it came from, so a plain by-name read misses the entry a
  // source-scoped bot's avatar actually lives under.
  const meta = botRosterMeta(bot, allMeta)
  const name = displayName(bot, meta)
  const { color, image, shape } = botAppearance(bot.name, meta)
  // Same rule the rows use: keep a real photo or pet, drop the SVG backfill so
  // the math face can animate.
  const photo = Boolean(image && !isBackfilledFacePng(image))

  return (
    <div
      className="pointer-events-none flex w-full min-w-0 flex-col items-center justify-center px-0.5 py-6 text-center text-muted-foreground sm:px-6 lg:px-8"
      data-slot="bot_chat_empty"

    >
      <div className="w-full min-w-0">

        {/*
         * A arte do mascote no lugar do lettering gigante: `.fit-text` dimensiona pela LARGURA e, numa janela
         * baixa, o nome do bot ocupava meia tela e encostava no compositor. O nome continua ali, em corpo de
         * texto, que é o que o leitor de tela lê.
         */}
        <img
          alt=""
          aria-hidden
          className="hb-mascot-blink mx-auto mb-3 block h-[min(9rem,26vh)] w-auto rounded-[22%] object-contain"
          src={meta?.mascot_id ? rosterMascotSrc(meta.mascot_id, bot.name) : BRAND_ROBOT}
        />

        <p className="m-0 text-center text-lg font-medium leading-normal tracking-tight">{name}</p>

        <p className="m-0 text-center leading-normal tracking-tight">{b.bot.chatEmpty}</p>
      </div>
    </div>
  )
}
