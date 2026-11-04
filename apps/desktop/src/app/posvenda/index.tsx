import { useCallback, useEffect, useState } from 'react'

import {
  KIND_LABEL,
  afterSalesAvailable,
  indicators,
  listFollowUps,
  markDone,
  prazoLabel,
  type AfterSalesIndicators,
  type FollowUpRow
} from '@/api/after-sales'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/ui/loader'
import { useI18n } from '@/i18n/context'

/**
 * Pós-venda.
 *
 * O número que dá sentido à tela é `semAcompanhamento`: vendas faturadas que não têm nenhum
 * acompanhamento. Uma lista de pendências sem esse número esconderia justamente as vendas esquecidas —
 * as que nunca entraram na lista.
 *
 * O atraso vem calculado do processo principal. Aqui só se formata: `prazoLabel` traduz horas em
 * "atrasado 3 dias" / "em 5 h", porque "vence em 2026-11-07T14:00" não diz se estou atrasado hoje.
 */
export function PosVendaView() {
  const { t } = useI18n()
  const copy = t.settings.posvenda

  const [lista, setLista] = useState<null | FollowUpRow[]>(null)
  const [ind, setInd] = useState<AfterSalesIndicators | null>(null)
  const [failure, setFailure] = useState<null | string>(null)
  const [ocupado, setOcupado] = useState(false)

  const disponivel = afterSalesAvailable()

  const carregar = useCallback(async () => {
    try {
      setLista(await listFollowUps())
      setInd(await indicators())
      setFailure(null)
    } catch {
      setFailure(copy.loadFailed)
      setLista([])
    }
  }, [copy.loadFailed])

  useEffect(() => {
    if (disponivel) void carregar()
  }, [carregar, disponivel])

  async function concluir(id: string) {
    setOcupado(true)

    try {
      const r = await markDone(id)

      if ('error' in r) {
        setFailure(r.error === 'pos_venda_indisponivel' ? copy.unavailable : r.error)
      } else {
        await carregar()
      }
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-6 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-foreground">{copy.title}</h1>
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">{copy.hint}</p>
      </header>

      {!disponivel ? (
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">{copy.unavailable}</p>
      ) : (
        <>
          {ind ? (
            <div className="grid grid-cols-3 gap-3">
              <Cartao
                destaque={ind.semAcompanhamento > 0}
                rotulo={ind.semAcompanhamento === 1 ? copy.noFollowUpOne : copy.noFollowUp}
                valor={ind.semAcompanhamento}
              />
              <Cartao destaque={ind.atrasados > 0} rotulo={copy.overdue} valor={ind.atrasados} />
              <Cartao rotulo={copy.pending} valor={ind.pendentes} />
            </div>
          ) : null}

          {ind && ind.semAcompanhamento > 0 ? (
            <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-warning, #d09b2c)">{copy.noFollowUpHint}</p>
          ) : null}

          {failure ? <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-danger)">{failure}</p> : null}

          {lista === null ? (
            <Loader />
          ) : lista.length === 0 ? (
            <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">{copy.empty}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {lista.map(f => (
                <li
                  className="flex items-center justify-between gap-3 rounded-lg border border-(--ui-border) px-3 py-2"
                  key={f.id}
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">
                      {KIND_LABEL[f.kind]}
                      {f.contact_phone ? ` · ${f.contact_phone}` : ''}
                    </span>
                    <span className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
                      {prazoLabel(f.prazo_horas)}
                      {f.atrasado ? ` · ${copy.overdueTag}` : ''}
                    </span>
                  </div>
                  <Button disabled={ocupado} onClick={() => void concluir(f.id)} variant="ghost">
                    {copy.done}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

function Cartao({ destaque, rotulo, valor }: { destaque?: boolean; rotulo: string; valor: number }) {
  return (
    <div
      className={
        destaque
          ? 'flex flex-col rounded-lg border border-(--ui-warning, #d09b2c) px-3 py-2'
          : 'flex flex-col rounded-lg border border-(--ui-border) px-3 py-2'
      }
    >
      <span className="text-lg font-semibold text-foreground">{valor}</span>
      <span className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">{rotulo}</span>
    </div>
  )
}
