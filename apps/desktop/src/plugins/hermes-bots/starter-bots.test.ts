import { describe, expect, it } from 'vitest'

import { MASCOTS, defaultMascotFor } from './mascots'
import { STARTER_BOTS, starterDraft, starterMascotId, starterSlug } from './starter-bots'

const MASCOT_IDS = MASCOTS.map(m => m.id)

describe('starter bots', () => {
  it('ships distinct, meaningful personas', () => {
    const slugs = STARTER_BOTS.map(starterSlug)

    expect(new Set(slugs).size).toBe(STARTER_BOTS.length)
    for (const template of STARTER_BOTS) {
      expect(template.title.trim()).not.toBe('')
      expect(template.description.trim()).not.toBe('')
      // A mission short enough to be useless or long enough to be a prompt dump is not a template.
      expect(template.mission.length).toBeGreaterThan(120)
      expect(template.mission.length).toBeLessThan(700)
    }
  })

  it('only names mascots the roster knows', () => {
    for (const template of STARTER_BOTS) {
      expect(MASCOT_IDS).toContain(template.mascotId)
    }
  })

  it('falls back instead of naming a mascot the roster does not have', () => {
    const template = { ...STARTER_BOTS[0], mascotId: 'does-not-exist' }

    expect(starterMascotId(template, MASCOT_IDS, 'bit')).toBe('bit')
    expect(starterMascotId(STARTER_BOTS[0], MASCOT_IDS, 'bit')).toBe(STARTER_BOTS[0].mascotId)
  })

  it('produces a profile-name-shaped slug from an accented title', () => {
    expect(starterSlug({ ...STARTER_BOTS[0], slug: 'Revisor de Código!' })).toBe('revisor-de-codigo')
    expect(starterSlug(STARTER_BOTS[0])).toMatch(/^[a-z0-9-]+$/)
  })

  it('seeds every field the create dialog fills', () => {
    const draft = starterDraft(STARTER_BOTS[2])

    expect(draft.name).toBe(starterSlug(STARTER_BOTS[2]))
    expect(draft.title).toBe(STARTER_BOTS[2].title)
    expect(draft.description).toBe(STARTER_BOTS[2].description)
    expect(draft.soul).toBe(STARTER_BOTS[2].mission)
    expect(draft.mascotId).toBe(STARTER_BOTS[2].mascotId)
    // The dialogs default the avatar from the name when the user clears the template.
    expect(defaultMascotFor(draft.name).id).toBeTruthy()
  })
})
