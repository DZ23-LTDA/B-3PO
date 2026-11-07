/**
 * Medidores — leitura periódica, o segundo modelo da vertical de água.
 *
 * A tela mostra o **consumo**, não a leitura: o número do relógio sozinho não diz nada. "12,345 m³" é
 * um valor; "consumiu 2,1 m³ desde a última leitura" é a informação que vira conta.
 *
 * Por isso a coluna de consumo é a primeira depois do medidor, e a leitura atual aparece como
 * contexto — quem olha quer saber quanto foi, e só depois conferir se o relógio bate.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'

import { listCrmContacts, type CrmContactRow } from '@/api/crm-contacts'
import {
  MEDIDOR_ERRO,
  MEDIDOR_KINDS,
  MEDIDOR_LABEL,
  cadastrarMedidor,
  litros,
  loadMedidores,
  medidoresAvailable,
  metrosCubicos,
  registrarLeitura,
  type ConsumoRow,
  type MedidorKind,
  type MedidorRow,
} from '@/api/medidores'
import { Button } from '@/components/ui/button'

function dataCurta(epoch: number): string {
  if (!epoch) return '—'

  return new Date(epoch).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export function MedidoresView() {
  const [medidores, setMedidores] = useState<MedidorRow[] | null>(null)
  const [consumos, setConsumos] = useState<ConsumoRow[]>([])
  const [contatos, setContatos] = useState<CrmContactRow[]>([])
  const [failure, setFailure] = useState<string | null>(null)

  const [tipo, setTipo] = useState<MedidorKind>('hidrometro')
  const [serie, setSerie] = useState('')
  const [cliente, setCliente] = useState('')
  const [medidorEscolhido, setMedidorEscolhido] = useState('')
  const [leitura, setLeitura] = useState('')
  const [salvando, setSalvando] = useState(false)

  const carregar = useCallback(async () => {
    try {
      const r = await loadMedidores()

      setMedidores(r.medidores)
      setConsumos(r.consumos)
      setFailure(null)
    } catch {
      setMedidores([])
      setFailure('Não foi possível carregar os medidores.')
    }
  }, [])

  useEffect(() => {
    void carregar()
    void listCrmContacts()
      .then((r: CrmContactRow[]) => setContatos(r ?? []))
      .catch(() => setContatos([]))
  }, [carregar])

  const disponivel = medidoresAvailable()

  const porMedidor = useMemo(() => {
    const mapa = new Map<string, ConsumoRow>()

    for (const c of consumos) mapa.set(c.medidor_id, c)

    return mapa
  }, [consumos])

  const nomeDoCliente = useCallback(
    (phone: string | null) => {
      if (!phone) return '—'

      return contatos.find(c => c.phone === phone)?.name ?? phone
    },
    [contatos]
  )

  async function cadastrar() {
    if (salvando) return

    setSalvando(true)

    try {
      const r = await cadastrarMedidor({ customer_id: cliente || null, kind: tipo, serial: serie })

      if ('error' in r) setFailure(MEDIDOR_ERRO[r.error] ?? r.error)
      else {
        setSerie('')
        await carregar()
      }
    } finally {
      setSalvando(false)
    }
  }

  async function lancar() {
    if (salvando) return

    if (!medidorEscolhido) {
      setFailure('Escolha o medidor.')

      return
    }

    // "12,345" ou "12345" — vírgula é decimal, não milhar. Leitura de relógio não tem milhar.
    const texto = leitura.trim().replace(/\s/g, '')

    if (!texto) {
      setFailure(MEDIDOR_ERRO.leitura_invalida)

      return
    }

    const mili = Math.round(Number.parseFloat(texto.replace(',', '.')) * 1000)

    if (!Number.isFinite(mili) || mili < 0) {
      setFailure(MEDIDOR_ERRO.leitura_invalida)

      return
    }

    setSalvando(true)

    try {
      const r = await registrarLeitura({ medidor_id: medidorEscolhido, reading_milli: mili })

      if ('error' in r) setFailure(MEDIDOR_ERRO[r.error] ?? r.error)
      else {
        setLeitura('')
        await carregar()
      }
    } finally {
      setSalvando(false)
    }
  }

  if (!disponivel) {
    return (
      <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
        Os medidores precisam do aplicativo desktop para funcionar.
      </p>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-8">
      <h1 className="text-lg font-semibold text-foreground">Medidores</h1>

      <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
        Água se cobra pela diferença entre duas leituras. O número do relógio sozinho não diz nada — o
        consumo é o que vira conta.
      </p>

      <section className="flex flex-col gap-2 rounded-lg border border-(--ui-border) p-4">
        <span className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
          Novo medidor
        </span>

        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-[0.6875rem] text-(--ui-text-tertiary)">Tipo</span>
            <select
              className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground"
              onChange={evento => setTipo(evento.target.value as MedidorKind)}
              value={tipo}
            >
              {MEDIDOR_KINDS.map(k => (
                <option key={k} value={k}>
                  {MEDIDOR_LABEL[k]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[0.6875rem] text-(--ui-text-tertiary)">Número</span>
            <input
              aria-label="Número do medidor"
              className="w-32 rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground"
              onChange={evento => setSerie(evento.target.value)}
              value={serie}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[0.6875rem] text-(--ui-text-tertiary)">Cliente</span>
            <select
              className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground"
              onChange={evento => setCliente(evento.target.value)}
              value={cliente}
            >
              <option value="">—</option>
              {contatos.map(c => (
                <option key={c.phone} value={c.phone}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <Button disabled={salvando} onClick={() => void cadastrar()}>
            Cadastrar
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-2 rounded-lg border border-(--ui-border) p-4">
        <span className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
          Lançar leitura
        </span>

        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-[0.6875rem] text-(--ui-text-tertiary)">Medidor</span>
            <select
              className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground"
              onChange={evento => setMedidorEscolhido(evento.target.value)}
              value={medidorEscolhido}
            >
              <option value="">—</option>
              {(medidores ?? []).map(m => (
                <option key={m.id} value={m.id}>
                  {m.serial || m.id} · {nomeDoCliente(m.customer_id)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[0.6875rem] text-(--ui-text-tertiary)">Leitura (m³)</span>
            <input
              aria-label="Leitura do medidor em metros cúbicos"
              className="w-32 rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground"
              onChange={evento => setLeitura(evento.target.value)}
              placeholder="12,345"
              value={leitura}
            />
          </label>

          <Button disabled={salvando} onClick={() => void lancar()}>
            Lançar
          </Button>
        </div>

        {failure ? (
          <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-danger)">{failure}</p>
        ) : null}
      </section>

      {medidores === null ? (
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
          Carregando…
        </p>
      ) : medidores.length === 0 ? (
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
          Nenhum medidor cadastrado ainda.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-[length:var(--conversation-caption-font-size)]">
          <thead>
            <tr className="text-(--ui-text-tertiary)">
              <th className="border-b border-(--ui-border) py-1 pr-2 font-medium">Medidor</th>
              <th className="border-b border-(--ui-border) py-1 pr-2 font-medium">Cliente</th>
              <th className="border-b border-(--ui-border) py-1 pr-2 font-medium">Consumo</th>
              <th className="border-b border-(--ui-border) py-1 pr-2 font-medium">Leitura atual</th>
              <th className="border-b border-(--ui-border) py-1 pr-2 font-medium">Anterior</th>
              <th className="border-b border-(--ui-border) py-1 font-medium">Lida</th>
            </tr>
          </thead>
          <tbody>
            {medidores.map(m => {
              const c = porMedidor.get(m.id)

              return (
                <tr key={m.id}>
                  <td className="border-b border-(--ui-border) py-1 pr-2 text-foreground">
                    {m.serial || m.id}
                    <span className="ml-2 text-(--ui-text-tertiary)">{MEDIDOR_LABEL[m.kind]}</span>
                  </td>
                  <td className="border-b border-(--ui-border) py-1 pr-2 text-(--ui-text-secondary)">
                    {nomeDoCliente(m.customer_id)}
                  </td>
                  <td className="border-b border-(--ui-border) py-1 pr-2 text-foreground">
                    {c && c.consumo_milli !== null ? (
                      <>
                        {metrosCubicos(c.consumo_milli)}
                        <span className="ml-2 text-(--ui-text-tertiary)">
                          {litros(c.consumo_milli)}
                        </span>
                      </>
                    ) : (
                      <span className="text-(--ui-text-tertiary)">— primeira leitura</span>
                    )}
                  </td>
                  <td className="border-b border-(--ui-border) py-1 pr-2 text-(--ui-text-secondary)">
                    {c?.atual ? metrosCubicos(c.atual.reading_milli) : '—'}
                  </td>
                  <td className="border-b border-(--ui-border) py-1 pr-2 text-(--ui-text-secondary)">
                    {c?.anterior ? metrosCubicos(c.anterior.reading_milli) : '—'}
                  </td>
                  <td className="border-b border-(--ui-border) py-1 text-(--ui-text-secondary)">
                    {dataCurta(c?.atual?.read_at ?? 0)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
      )}
    </div>
  )
}
