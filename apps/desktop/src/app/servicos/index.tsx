import { useCallback, useEffect, useState } from 'react'

import { priceLabel } from '@/api/catalog'
import { listServices, removeService, saveService, servicesAvailable, type ServiceRow } from '@/api/services'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/ui/loader'
import { useI18n } from '@/i18n/context'

/**
 * Catálogo de serviços.
 *
 * Duração e preço daqui são o que a agenda usa. Serviço sem duração não ocupa horário, então o
 * formulário não deixa cadastrar — e a tela diz isso em vez de deixar o erro aparecer no agendamento.
 */
export function ServicosView() {
  const { t } = useI18n()
  const copy = t.settings.servicos

  const [services, setServices] = useState<null | ServiceRow[]>(null)
  const [failure, setFailure] = useState<null | string>(null)
  const [nome, setNome] = useState('')
  const [duracao, setDuracao] = useState('30')
  const [preco, setPreco] = useState('')
  const [saving, setSaving] = useState(false)

  const disponivel = servicesAvailable()

  const carregar = useCallback(async () => {
    try {
      setServices(await listServices())
      setFailure(null)
    } catch {
      setFailure(copy.loadFailed)
      setServices([])
    }
  }, [copy.loadFailed])

  useEffect(() => {
    if (disponivel) void carregar()
  }, [carregar, disponivel])

  const erroDe = (chave: string): string => {
    const mapa: Record<string, string> = {
      duration_required: copy.durationRequired,
      name_required: copy.nameRequired,
      servico_duplicado: copy.duplicate,
      servico_nao_encontrado: copy.notFound
    }

    return mapa[chave] ?? chave
  }

  async function cadastrar() {
    if (!nome.trim()) {
      setFailure(copy.nameRequired)

      return
    }

    const minutos = Number.parseInt(duracao, 10)

    if (!Number.isFinite(minutos) || minutos <= 0) {
      setFailure(copy.durationRequired)

      return
    }

    setSaving(true)

    try {
      const r = await saveService({ duration_min: minutos, name: nome.trim(), price_cents: preco })

      if ('error' in r) {
        setFailure(erroDe(r.error))
      } else {
        setServices(r.services)
        setNome('')
        setPreco('')
        setDuracao('30')
        setFailure(null)
      }
    } finally {
      setSaving(false)
    }
  }

  async function remover(id: string) {
    setSaving(true)

    try {
      const r = await removeService(id)

      if ('error' in r) {
        setFailure(erroDe(r.error))
      } else {
        setServices(r.services)
        setFailure(null)
      }
    } finally {
      setSaving(false)
    }
  }

  const campo = (rotulo: string, valor: string, aoMudar: (v: string) => void, tipo = 'text') => (
    <label className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
      <span className="text-(--ui-text-tertiary)">{rotulo}</span>
      <input
        className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)"
        onChange={event => aoMudar(event.target.value)}
        type={tipo}
        value={valor}
      />
    </label>
  )

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-6 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-foreground">{copy.title}</h1>
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">{copy.hint}</p>
      </header>

      {!disponivel ? (
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">{copy.unavailable}</p>
      ) : (
        <>
          <section className="grid gap-2 rounded-lg border border-(--ui-border) p-4 sm:grid-cols-2 lg:grid-cols-4">
            {campo(copy.name, nome, setNome)}
            {campo(copy.duration, duracao, setDuracao, 'number')}
            {campo(copy.price, preco, setPreco)}
            <div className="flex items-end">
              <Button disabled={saving} onClick={() => void cadastrar()}>
                {copy.add}
              </Button>
            </div>
          </section>

          {failure ? (
            <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-danger)">{failure}</p>
          ) : null}

          {services === null ? (
            <Loader />
          ) : services.length === 0 ? (
            <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">{copy.empty}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {services.map(service => (
                <li
                  className="flex items-center justify-between gap-3 rounded-lg border border-(--ui-border) px-3 py-2"
                  key={service.id}
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">{service.name}</span>
                    <span className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
                      {service.duration_min} min · {service.price_cents ? priceLabel(service.price_cents) : copy.free}
                    </span>
                  </div>
                  <Button disabled={saving} onClick={() => void remover(service.id)} variant="ghost">
                    {copy.remove}
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
