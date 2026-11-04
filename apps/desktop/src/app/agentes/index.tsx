import { useCallback, useEffect, useState } from 'react'

import {
  LEVELS,
  SCOPE_OPTIONS,
  adminAvailable,
  deactivateActor,
  levelLabel,
  listActors,
  saveActor,
  whoami,
  type ActorRow
} from '@/api/admin'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/ui/loader'
import { useI18n } from '@/i18n/context'
import { AprovacoesPendentes } from './aprovacoes'

/**
 * Agentes.
 *
 * Três coisas que a tela torna explícitas, porque errar qualquer uma cria agente que não funciona:
 *
 * 1. **Escopo é lista de domínios.** Sem escopo, o agente não vê ferramenta nenhuma — ele existe e não
 *    pode nada. A tela avisa isso em vez de deixar o usuário descobrir no MCP.
 * 2. **Nível é cumulativo.** Quem executa também prepara e consulta; a tela mostra o rótulo em
 *    português para não exigir que o dono decore os nomes do RBAC.
 * 3. **Desativar, não apagar.** O histórico de auditoria referencia o ator; apagar deixaria lançamentos
 *    órfãos. O botão desativa e o ator para de receber credencial no próximo boot.
 */
export function AgentesView() {
  const { t } = useI18n()
  const copy = t.settings.agentes

  const [actors, setActors] = useState<null | ActorRow[]>(null)
  const [eu, setEu] = useState<ActorRow | null>(null)
  const [failure, setFailure] = useState<null | string>(null)
  const [saving, setSaving] = useState(false)

  const [nome, setNome] = useState('')
  const [nivel, setNivel] = useState<string>('EXECUTE_ALLOWED')
  const [escopos, setEscopos] = useState<string[]>([])

  const disponivel = adminAvailable()

  const carregar = useCallback(async () => {
    try {
      setActors(await listActors())
      setEu(await whoami())
      setFailure(null)
    } catch {
      setFailure(copy.loadFailed)
      setActors([])
    }
  }, [copy.loadFailed])

  useEffect(() => {
    if (disponivel) void carregar()
  }, [carregar, disponivel])

  const erroDe = (chave: string, motivo?: string): string => {
    const mapa: Record<string, string> = {
      acima_do_proprio_nivel: copy.aboveOwnLevel,
      acao_exige_humano: copy.humanOnly,
      admin_indisponivel: copy.unavailable,
      administracao_indisponivel: copy.unavailable,
      bot_como_owner: copy.botAsOwner,
      bot_nao_concede: copy.botCannotGrant,
      name_required: copy.nameRequired,
      nivel_insuficiente: copy.insufficientLevel,
      ultimo_dono: copy.lastOwner
    }

    return mapa[chave] ?? motivo ?? chave
  }

  async function cadastrar() {
    if (!nome.trim()) {
      setFailure(copy.nameRequired)

      return
    }

    setSaving(true)

    try {
      const r = await saveActor({
        kind: 'bot',
        level: nivel,
        name: nome.trim(),
        role: 'bot',
        scopes: escopos
      })

      if ('error' in r) {
        setFailure(erroDe(r.error, r.reason))
      } else {
        setActors(r.actors)
        setNome('')
        setEscopos([])
        setFailure(null)
      }
    } finally {
      setSaving(false)
    }
  }

  async function desativar(id: string) {
    setSaving(true)

    try {
      const r = await deactivateActor(id)

      if ('error' in r) {
        setFailure(erroDe(r.error))
      } else {
        setActors(r.actors)
        setFailure(null)
      }
    } finally {
      setSaving(false)
    }
  }

  function alternarEscopo(escopo: string) {
    setEscopos(atual => (atual.includes(escopo) ? atual.filter(e => e !== escopo) : [...atual, escopo]))
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-6 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-foreground">{copy.title}</h1>
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">{copy.hint}</p>
      </header>

      {/* Fila de aprovacao. Fica ACIMA do cadastro porque e o que chega sem o usuario procurar: um pedido
          esperando perde a validade em 24h e nao avisa. */}
      <AprovacoesPendentes />

      {!disponivel ? (
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">{copy.unavailable}</p>
      ) : (
        <>
          <section className="flex flex-col gap-3 rounded-lg border border-(--ui-border) p-4">
            <label className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
              <span className="text-(--ui-text-tertiary)">{copy.name}</span>
              <input
                className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)"
                onChange={event => setNome(event.target.value)}
                value={nome}
              />
            </label>

            <label className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
              <span className="text-(--ui-text-tertiary)">{copy.level}</span>
              <select
                className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)"
                onChange={event => setNivel(event.target.value)}
                value={nivel}
              >
                {LEVELS.map(valor => (
                  <option key={valor} value={valor}>
                    {levelLabel(valor)}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-col gap-1">
              <span className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
                {copy.scopes}
              </span>
              <div className="flex flex-wrap gap-2">
                {SCOPE_OPTIONS.map(escopo => (
                  <button
                    className={
                      escopos.includes(escopo)
                        ? 'rounded border border-(--ui-accent) px-2 py-0.5 text-[length:var(--conversation-caption-font-size)] text-foreground'
                        : 'rounded border border-(--ui-border) px-2 py-0.5 text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)'
                    }
                    key={escopo}
                    onClick={() => alternarEscopo(escopo)}
                    type="button"
                  >
                    {escopo}
                  </button>
                ))}
              </div>
              {escopos.length === 0 ? (
                <span className="text-[length:var(--conversation-caption-font-size)] text-(--ui-warning, #d09b2c)">
                  {copy.noScopeWarning}
                </span>
              ) : null}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
                {copy.mcpNote}
              </span>
              <Button disabled={saving} onClick={() => void cadastrar()}>
                {copy.add}
              </Button>
            </div>
          </section>

          {failure ? (
            <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-danger)">{failure}</p>
          ) : null}

          {eu ? (
            <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
              {copy.youAre}: {eu.name} ({levelLabel(eu.level)})
            </p>
          ) : null}

          {actors === null ? (
            <Loader />
          ) : actors.length === 0 ? (
            <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">{copy.empty}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {actors.map(actor => (
                <li
                  className="flex items-center justify-between gap-3 rounded-lg border border-(--ui-border) px-3 py-2"
                  key={actor.id}
                >
                  <div className="flex flex-col">
                    <span className={actor.active ? 'font-medium text-foreground' : 'font-medium text-(--ui-text-tertiary)'}>
                      {actor.name}
                      {actor.active ? '' : ` · ${copy.inactive}`}
                    </span>
                    <span className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
                      {actor.kind === 'bot' ? copy.bot : copy.human} · {levelLabel(actor.level)}
                      {actor.scopes.length ? ` · ${actor.scopes.join(', ')}` : ''}
                    </span>
                  </div>
                  {actor.active && actor.kind === 'bot' ? (
                    <Button disabled={saving} onClick={() => void desativar(actor.id)} variant="ghost">
                      {copy.deactivate}
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
