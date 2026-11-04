import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { blockErrorText, blocksAvailable, createBlock, listBlocks, removeBlock, type BlockRow } from '@/api/scheduling-blocks'

/**
 * Bloqueios de agenda.
 *
 * O recurso dizendo "não atendo": almoço, folga, manutenção. É diferente de agendamento — não tem cliente
 * nem serviço — e é o que fecha a diferença entre "que horas você tem?" e "esse horário está livre".
 *
 * ESTADOS HONESTOS
 *
 * Sem a ponte, o bloco não aparece: um botão que não faz nada mente. Com a lista falhando, aparece o aviso
 * de erro em vez de uma lista vazia — porque **lista vazia e lista que falhou significam coisas opostas**
 * para quem vai oferecer horário ao cliente: uma diz "está tudo livre", a outra diz "não sei".
 */
export function SchedulingBlocks() {
  const [blocos, setBlocos] = useState<BlockRow[] | null>(null)
  const [falha, setFalha] = useState('')
  const [recurso, setRecurso] = useState('')
  const [motivo, setMotivo] = useState('')
  const [inicio, setInicio] = useState('')
  const [fim, setFim] = useState('')
  const [salvando, setSalvando] = useState(false)

  const disponivel = blocksAvailable()

  useEffect(() => {
    if (!disponivel) return

    void carregar()
  }, [disponivel])

  async function carregar() {
    try {
      setBlocos(await listBlocks())
      setFalha('')
    } catch {
      setFalha('Não foi possível ler os bloqueios.')
      setBlocos(null)
    }
  }

  async function adicionar() {
    const startsAt = Date.parse(inicio)
    const endsAt = Date.parse(fim)

    setSalvando(true)

    try {
      const r = await createBlock({
        ends_at: endsAt,
        motivo: motivo.trim(),
        resource_id: recurso.trim(),
        starts_at: startsAt
      })

      if (r.error) {
        setFalha(blockErrorText(r.error))
      } else {
        setRecurso('')
        setMotivo('')
        setInicio('')
        setFim('')
        await carregar()
      }
    } finally {
      setSalvando(false)
    }
  }

  async function apagar(id: string) {
    const r = await removeBlock(id)

    if (r.error) setFalha(blockErrorText(r.error))
    else await carregar()
  }

  if (!disponivel) return null

  return (
    <section className="flex flex-col gap-2 rounded-lg border border-(--ui-border) p-4">
      <h2 className="text-[length:var(--conversation-caption-font-size)] font-medium text-foreground">
        Bloqueios de agenda
      </h2>
      <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
        Períodos em que o profissional não atende. Diferente de um agendamento: não tem cliente.
      </p>

      {falha ? (
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-danger)" role="alert">
          {falha}
        </p>
      ) : null}

      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
          <span className="text-(--ui-text-tertiary)">Recurso</span>
          <Input className="h-7 w-40" onChange={e => setRecurso(e.target.value)} placeholder="prof-1" value={recurso} />
        </label>
        <label className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
          <span className="text-(--ui-text-tertiary)">Motivo</span>
          <Input className="h-7 w-40" onChange={e => setMotivo(e.target.value)} placeholder="almoço" value={motivo} />
        </label>
        <label className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
          <span className="text-(--ui-text-tertiary)">Início</span>
          <Input className="h-7 w-44" onChange={e => setInicio(e.target.value)} type="datetime-local" value={inicio} />
        </label>
        <label className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
          <span className="text-(--ui-text-tertiary)">Fim</span>
          <Input className="h-7 w-44" onChange={e => setFim(e.target.value)} type="datetime-local" value={fim} />
        </label>
        <Button disabled={salvando} onClick={() => void adicionar()} variant="ghost">
          Bloquear
        </Button>
      </div>

      {blocos === null ? null : blocos.length === 0 ? (
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
          Nenhum bloqueio cadastrado.
        </p>
      ) : (
        <ul className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
          {blocos.map(b => (
            <li className="flex items-center justify-between gap-2" key={b.id}>
              <span className="text-foreground">
                {b.resource_id} · {b.motivo} · {new Date(b.starts_at).toLocaleString('pt-BR')} até{' '}
                {new Date(b.ends_at).toLocaleString('pt-BR')}
              </span>
              <Button onClick={() => void apagar(b.id)} variant="ghost">
                Remover
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
