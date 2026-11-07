import { useCallback, useEffect, useState } from 'react'

import {
  DOMAIN_LABEL,
  analyticsAvailable,
  loadDashboard,
  moneyLabel,
  satisfactionLabel,
  type DashboardPayload
} from '@/api/analytics'
import { Loader } from '@/components/ui/loader'
import { useI18n } from '@/i18n/context'

/**
 * Painel.
 *
 * A ordem conta a história: primeiro o que está fora do lugar (alertas), depois o dinheiro, depois a
 * operação. Um painel que abre com "12 vendas" e esconde "o caixa fecha negativo" é decoração.
 *
 * Quando não há alerta, diz isso em uma linha — em vez de mostrar uma área vazia que parece erro.
 */
export function PainelView() {
  const { t } = useI18n()
  const copy = t.settings.painel

  const [dados, setDados] = useState<DashboardPayload | null>(null)
  const [falhou, setFalhou] = useState(false)
  const [carregando, setCarregando] = useState(true)

  const disponivel = analyticsAvailable()

  const carregar = useCallback(async () => {
    setCarregando(true)

    try {
      setDados(await loadDashboard())
      setFalhou(false)
    } catch {
      setFalhou(true)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    if (disponivel) void carregar()
    else setCarregando(false)
  }, [carregar, disponivel])

  if (!disponivel) {
    return (
      <div className="mx-auto w-full max-w-5xl px-6 py-8">
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">{copy.unavailable}</p>
      </div>
    )
  }

  const s = dados?.snapshot

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-6 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-foreground">{copy.title}</h1>
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">{copy.hint}</p>
      </header>

      {carregando ? (
        <Loader />
      ) : falhou ? (
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-danger)">{copy.loadFailed}</p>
      ) : (
        <>
          <section className="flex flex-col gap-2">
            {dados!.alerts.length === 0 ? (
              <p className="rounded-lg border border-(--ui-border) px-3 py-2 text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
                {copy.noAlerts}
              </p>
            ) : (
              dados!.alerts.map(alerta => (
                <div
                  className={
                    alerta.severity === 'alta'
                      ? 'flex flex-col rounded-lg border border-(--ui-danger) px-3 py-2'
                      : 'flex flex-col rounded-lg border border-(--ui-warning, #d09b2c) px-3 py-2'
                  }
                  key={`${alerta.domain}-${alerta.title}`}
                >
                  <span className="font-medium text-foreground">
                    {alerta.title}
                    <span className="ml-2 text-[length:var(--conversation-caption-font-size)] font-normal text-(--ui-text-tertiary)">
                      {DOMAIN_LABEL[alerta.domain]}
                    </span>
                  </span>
                  <span className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
                    {alerta.detail}
                  </span>
                </div>
              ))
            )}
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-foreground">{copy.money}</h2>
            <div className="grid grid-cols-3 gap-3">
              <Cartao rotulo={copy.receivable} valor={moneyLabel(s!.finance.aReceberCents)} />
              <Cartao rotulo={copy.payable} valor={moneyLabel(s!.finance.aPagarCents)} />
              <Cartao destaque={s!.finance.saldoCents < 0} rotulo={copy.balance} valor={moneyLabel(s!.finance.saldoCents)} />
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-foreground">{copy.operation}</h2>
            <div className="grid grid-cols-3 gap-3">
              <Cartao rotulo={plural(s!.sales.faturadas, copy.invoicedOne, copy.invoiced)} valor={String(s!.sales.faturadas)} />
              <Cartao rotulo={copy.revenue} valor={moneyLabel(s!.sales.totalCents)} />
              <Cartao destaque={s!.inventory.zerados > 0} rotulo={plural(s!.inventory.zerados, copy.outOfStockOne, copy.outOfStock)} valor={String(s!.inventory.zerados)} />
              <Cartao destaque={s!.desk.atrasados > 0} rotulo={copy.lateTickets} valor={String(s!.desk.atrasados)} />
              <Cartao rotulo={copy.openTickets} valor={String(s!.desk.pendentes)} />
              <Cartao rotulo={copy.satisfaction} valor={satisfactionLabel(s!.desk.satisfacaoMedia)} />
              <Cartao destaque={s!.afterSales.semAcompanhamento > 0} rotulo={plural(s!.afterSales.semAcompanhamento, copy.noAfterSalesOne, copy.noAfterSales)} valor={String(s!.afterSales.semAcompanhamento)} />
              <Cartao destaque={s!.marketing.agendadasVencidas > 0} rotulo={plural(s!.marketing.agendadasVencidas, copy.staleCampaignsOne, copy.staleCampaigns)} valor={String(s!.marketing.agendadasVencidas)} />
              <Cartao rotulo={copy.activeCampaigns} valor={String(s!.marketing.ativas)} />
            </div>
          </section>
        </>
      )}
    </div>
  )
}

/** Singular com numero 1, plural no resto. Zero usa o plural: "0 vendas" e o correto em portugues. */
function plural(n: number, um: string, muitos: string): string {
  return n === 1 ? um : muitos
}

function Cartao({ destaque, rotulo, valor }: { destaque?: boolean; rotulo: string; valor: string }) {
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
