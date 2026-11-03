/**
 * Grade dos 20 mascotes oficiais no avatar picker.
 *
 * Só apresentação: recebe o id selecionado e devolve a escolha. Quem persiste
 * (`saveBotMeta({ mascot_id })`) é o diálogo que usa o picker — o mascote é
 * identidade visual e nunca toca o runtime.
 */

import { type Mascot, MASCOTS } from './mascots'

interface MascotGridProps {
  onSelect: (mascot: Mascot) => void
  selectedId?: null | string
}

export function MascotGrid({ onSelect, selectedId = null }: MascotGridProps) {
  return (
    <div aria-label="Mascotes B-3PO" className="grid grid-cols-4 justify-items-center gap-2" role="group">
      {MASCOTS.map(mascot => {
        const selected = selectedId === mascot.id

        return (
          <button
            aria-label={mascot.name}
            aria-pressed={selected}
            className={
              'flex size-14 items-center justify-center rounded-md transition-colors hover:bg-(--chrome-action-hover) ' +
              (selected ? 'ring-1 ring-(--ui-accent)' : '')
            }
            key={mascot.id}
            onClick={() => onSelect(mascot)}
            title={mascot.name}
            type="button"
          >
            <img alt="" className="size-11" draggable={false} src={mascot.src} />
          </button>
        )
      })}
    </div>
  )
}
