import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  conversationCounts,
  conversationTimeLabel,
  conversationsAvailable,
  listConversations,
  saveConversation,
  type CrmConversationRow,
} from '@/api/crm-conversations'
import { filterConversations, type ConversationFilter } from '@/app/crm/conversation-filters'
import { needsReply, responseTime, responseTimeLabel } from '@/app/crm/response-time'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/ui/loader'
import { useI18n } from '@/i18n/context'

function statusTone(status: CrmConversationRow['status']): string {
  if (status === 'aguardando') {
    return 'text-destructive'
  }

  return status === 'resolvida' ? 'text-(--ui-text-tertiary)' : 'text-(--ui-text-secondary)'
}

export function CrmConversationsSection() {
  const { t } = useI18n()
  const section = t.settings.crmConversations

  const [rows, setRows] = useState<null | CrmConversationRow[]>(null)
  const [failure, setFailure] = useState<null | string>(null)
  const [aberta, setAberta] = useState<null | string>(null)
  const [busca, setBusca] = useState('')
  const [nota, setNota] = useState('')
  const [filtro, setFiltro] = useState<ConversationFilter>('todas')

  const carregar = useCallback(async () => {
    if (!conversationsAvailable()) {
      setFailure(section.unavailable)
      setRows([])

      return
    }

    try {
      setRows(await listConversations())
      setFailure(null)
    } catch {
      setFailure(section.unavailable)
      setRows([])
    }
  }, [section.unavailable])

  useEffect(() => {
    void carregar()
  }, [carregar])

  // acoes da conversa: gravam pelo mesmo store do IPC e recarregam a lista
  const alterar = useCallback(
    async (conversa: CrmConversationRow, mudanca: Partial<CrmConversationRow>) => {
      const salvo = await saveConversation({ ...conversa, ...mudanca })

      if ('error' in salvo) {
        setFailure(section.unavailable)

        return
      }

      setRows(await listConversations())
    },
    [section.unavailable]
  )

  const agora = Date.now()
  const contagens = useMemo(() => conversationCounts(rows ?? []), [rows])
  const visiveis = filterConversations(rows ?? [], filtro, busca)
  const selecionada = rows?.find(row => row.id === aberta) ?? null

  // a nota acompanha a conversa selecionada
  useEffect(() => {
    setNota(selecionada?.notes ?? '')
  }, [selecionada?.id, selecionada?.notes])


  return (
    <section className="mt-6 flex flex-col gap-3 border-t border-(--ui-border) pt-6">
      <div>
        <h2 className="text-sm font-semibold text-foreground">{section.title}</h2>
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
          {section.subtitle}
        </p>
      </div>

      {failure ? (
        <p className="text-sm text-destructive" role="status">
          {failure}
        </p>
      ) : null}

      {rows === null ? (
        <Loader label={section.loading} />
      ) : rows.length === 0 ? (
        <p className="text-sm text-(--ui-text-secondary)">{section.empty}</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-x-3 text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
            <span>
              <strong className="font-semibold text-foreground">{contagens.abertas}</strong> {section.status.aberta}
            </span>
            <span>
              <strong className="font-semibold text-foreground">{contagens.aguardando}</strong> {section.status.aguardando}
            </span>
            <span>
              <strong className="font-semibold text-foreground">{contagens.naoLidas}</strong>{' '}
              {section.naoLidasLabel}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <input
              aria-label={section.search}
              className="w-full rounded border border-(--ui-border) bg-(--ui-surface) px-2 py-1.5 text-sm text-foreground"
              onChange={event => setBusca(event.target.value)}
              placeholder={section.search}
              type="search"
              value={busca}
            />
            <div className="flex flex-wrap gap-1">
              {(['todas', 'aberta', 'aguardando', 'resolvida'] as const).map(opcao => (
                <Button
                  key={opcao}
                  onClick={() => setFiltro(opcao)}
                  size="sm"
                  type="button"
                  variant={filtro === opcao ? 'default' : 'outline'}
                >
                  {opcao === 'todas'
                    ? section.filter.todas
                    : opcao === 'aberta'
                      ? section.filter.abertas
                      : opcao === 'aguardando'
                        ? section.filter.aguardando
                        : section.status.resolvida}
                </Button>
              ))}
            </div>
            {visiveis.length === 0 ? (
              <p className="text-sm text-(--ui-text-secondary)">{section.noResults}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 md:flex-row">
            <ul className="flex w-full flex-col gap-1 md:w-72 md:shrink-0">
              {visiveis.map(row => {
                const ativa = row.id === aberta

                return (
                  <li key={row.id}>
                    <button
                      aria-current={ativa ? 'true' : undefined}
                      className={
                        'flex w-full flex-col gap-0.5 rounded border px-2 py-1.5 text-left ' +
                        (ativa
                          ? 'border-(--ui-border-strong) bg-(--ui-surface-raised)'
                          : 'border-transparent hover:bg-(--ui-surface-raised)')
                      }
                      onClick={() => setAberta(ativa ? null : row.id)}
                      type="button"
                    >
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm text-foreground">{row.title}</span>
                        {row.unread > 0 ? (
                          <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                            {row.unread}
                          </span>
                        ) : null}
                        <span className="ml-auto text-[10px] text-(--ui-text-tertiary)">
                          {conversationTimeLabel(row.last_message_at, agora)}
                        </span>
                      </span>
                      <span className="truncate text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
                        {row.last_message_preview || section.noMessages}
                      </span>
                      <span className={'text-[10px] ' + statusTone(row.status)}>{section.status[row.status]}</span>
                      {needsReply(row.messages) ? (
                        <span className="text-[10px] font-semibold text-primary">{section.waitingReply}</span>
                      ) : null}
                    </button>
                  </li>
                )
              })}
            </ul>

            <div className="flex min-w-0 flex-1 flex-col gap-2">
              {selecionada === null ? (
                <p className="text-sm text-(--ui-text-tertiary)">{section.pickOne}</p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">
                      {selecionada.contact_phone || selecionada.title}
                    </h3>
                    {selecionada.unread > 0 ? (
                      <Button
                        onClick={() => void alterar(selecionada, { unread: 0 })}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        {section.markRead}
                      </Button>
                    ) : null}
                    {(() => {
                      const medida = responseTime(selecionada.messages)

                      return medida === null ? null : (
                        <span className="text-xs text-(--ui-text-secondary)">
                          {section.responseTime}: {responseTimeLabel(medida.mediaMs)}
                        </span>
                      )
                    })()}
                    {selecionada.status === 'resolvida' ? null : (
                      <Button
                        onClick={() => void alterar(selecionada, { status: 'resolvida' })}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        {section.resolve}
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold text-(--ui-text-secondary)">{section.notes}</span>
                    <textarea
                      aria-label={section.notes}
                      className="min-h-16 w-full rounded border border-(--ui-border) bg-(--ui-surface) px-2 py-1.5 text-sm text-foreground"
                      onChange={event => setNota(event.target.value)}
                      placeholder={section.notePlaceholder}
                      value={nota}
                    />
                    <div>
                      <Button
                        disabled={nota === (selecionada.notes ?? '')}
                        onClick={() => void alterar(selecionada, { notes: nota })}
                        size="sm"
                        type="button"
                      >
                        {section.saveNote}
                      </Button>
                    </div>
                  </div>
                  {selecionada.messages.length === 0 ? (
                    <p className="text-sm text-(--ui-text-tertiary)">{section.noMessages}</p>
                  ) : (
                    <ul className="flex max-h-80 flex-col gap-1.5 overflow-y-auto pr-1">
                      {selecionada.messages.map((message, index) => (
                        <li
                          className={
                            'max-w-[80%] rounded px-2 py-1 text-sm ' +
                            (message.direction === 'saida'
                              ? 'self-end bg-primary text-primary-foreground'
                              : 'self-start bg-(--ui-surface-raised) text-foreground')
                          }
                          key={message.external_id || 'local' + '-' + message.sent_at + '-' + index}
                        >
                          <p className="whitespace-pre-wrap break-words">{message.body}</p>
                          <span className="mt-0.5 block text-[10px] opacity-70">
                            {conversationTimeLabel(message.sent_at, agora)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  )
}
