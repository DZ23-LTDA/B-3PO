import { Button } from '@hermes/plugin-sdk'

import { STARTER_BOTS, starterDraft } from './starter-bots'

/** One-click personas for the create dialog: the chips that seed name, title, description,
 *  mission and mascot. Kept out of `CreateAgentDialog` so the dialog body does not grow past its
 *  line ratchet — the picker is presentational and owns no state. */
export interface StarterBotFields {
  name: (value: string) => void
  title: (value: string) => void
  description: (value: string) => void
  soul: (value: string) => void
  mascotId: (value: string) => void
}

export function StarterBotPicker({ label, fields }: { label: string; fields: StarterBotFields }) {
  const pick = (template: (typeof STARTER_BOTS)[number]) => {
    const draft = starterDraft(template)
    fields.name(draft.name)
    fields.title(draft.title)
    fields.description(draft.description)
    fields.soul(draft.soul)
    fields.mascotId(draft.mascotId)
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-(--ui-text-secondary)">{label}</span>
      {STARTER_BOTS.map(template => (
        <Button
          key={template.slug}
          onClick={() => pick(template)}
          size="sm"
          variant="ghost"
        >
          {template.title}
        </Button>
      ))}
    </div>
  )
}
