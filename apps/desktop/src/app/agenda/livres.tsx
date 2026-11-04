import { useEffect, useMemo, useState } from 'react'

import { listBlocks, type BlockRow } from '@/api/scheduling-blocks'

import { horariosLivresPara } from '@/lib/scheduling-slots'

/**
 * Horários livres do dia.
 *
 * Liga a disponibilidade da r121 ao dado real: os agendamentos que a tela já tem e os bloqueios que o
 * store guarda desde a r124.
 *
 * POR QUE NÃO OFERECE UM HORÁRIO ENCOSTADO
 *
 * O cálculo já cuida disso (`fim` exclusivo, sobreposição semiaberta). A tela não recalcula nada — mostra o
 * que `horariosLivres` devolver. Duas contas para a mesma pergunta divergem, e a que o operador vê seria a
 * errada.
 *
 * POR QUE O EXPEDIENTE É FIXO AQUI
 *
 * Não existe entidade "horário de funcionamento" no domínio. Inventar uma agora criaria um campo que
 * ninguém preenche e um padrão que estaria errado para metade das empresas. 09:00–18:00 é explícito,
 * aparece na tela e é trivial de trocar quando o cadastro existir.
 */

const ABRE_HORA = 9
const FECHA_HORA = 18
const DURACAO_PADRAO = 60

export interface FreeSlotsProps {
  agendamentos: readonly { ends_at: number; resource_id: string; starts_at: number; status: string }[]
  resourceId: string
}

function janelaDoDia(base: number) {
  const inicio = new Date(base)

  inicio.setHours(ABRE_HORA, 0, 0, 0)

  const fim = new Date(base)

  fim.setHours(FECHA_HORA, 0, 0, 0)

  return { abre: inicio.getTime(), fecha: fim.getTime() }
}

export function SchedulingFreeSlots({ agendamentos, resourceId }: FreeSlotsProps) {
  const [blocos, setBlocos] = useState<BlockRow[]>([])
  const [dia, setDia] = useState(() => new Date().toISOString().slice(0, 10))
  const [falha, setFalha] = useState('')

  useEffect(() => {
    void listBlocks()
      .then(setBlocos)
      .catch(() => {
        // Sem saber os bloqueios, a lista de livres SUPERESTIMA. A tela tem de dizer isso, não fingir.
        setFalha('Sem os bloqueios, os horários abaixo podem estar indisponíveis.')
      })
  }, [])

  const livres = useMemo(() => {
    if (!resourceId.trim()) return []

    const base = new Date(`${dia}T12:00:00`).getTime()
    const hoje = dia === new Date().toISOString().slice(0, 10)

    return horariosLivresPara({
      bloqueios: blocos.map(b => ({
        ends_at: b.ends_at,
        motivo: b.motivo,
        resource_id: b.resource_id,
        starts_at: b.starts_at
      })),
      duracao_minutos: DURACAO_PADRAO,
      janela: janelaDoDia(base),
      // O corte por gora so vale para HOJE. Consultar amanha com ele devolveria lista vazia a noite.
      ...(hoje ? { nao_antes_de: Date.now() } : {}),
      ocupados: agendamentos,
      resource_id: resourceId
    })
  }, [agendamentos, blocos, dia, resourceId])

  if (!resourceId.trim()) return null

  const hora = (ms: number) => new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  return (
    <section className="flex flex-col gap-2 rounded-lg border border-(--ui-border) p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[length:var(--conversation-caption-font-size)] font-medium text-foreground">
          Horários livres · {resourceId || 'sem recurso'}
        </h2>
        <label className="flex items-center gap-2 text-[length:var(--conversation-caption-font-size)]">
          <span className="text-(--ui-text-tertiary)">Dia</span>
          <input
            className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)"
            onChange={evento => setDia(evento.target.value)}
            type="date"
            value={dia}
          />
        </label>
      </div>
      {falha ? (
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-danger)" role="alert">
          {falha}
        </p>
      ) : null}
      {livres.length === 0 ? (
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
          Nenhum horário livre entre {ABRE_HORA}h e {FECHA_HORA}h para este recurso neste dia.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2 text-[length:var(--conversation-caption-font-size)]">
          {livres.map(slot => (
            <li
              className="rounded-md border border-(--ui-border) px-2 py-1 tabular-nums text-foreground"
              key={slot.starts_at}
            >
              {hora(slot.starts_at)}–{hora(slot.ends_at)}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
