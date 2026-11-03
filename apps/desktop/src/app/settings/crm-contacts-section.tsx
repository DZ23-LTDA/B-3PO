import { useCallback, useEffect, useState } from 'react'

import {
  crmAvailable,
  crmErrorText,
  type CrmContactRow,
  listCrmContacts,
  removeCrmContact,
  saveCrmContact
} from '@/api/crm-contacts'
import { CRM_ROUTE } from '@/app/routes'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/ui/loader'
import { useI18n } from '@/i18n/context'

import { CrmPipelineSection } from './crm-pipeline-section'

/**
 * Contatos do WhatsApp CRM.
 *
 * O dado vive no disco do usuário (processo principal); esta tela lista e cadastra. Sem bridge (versão web) a
 * seção explica por que não há contatos em vez de mostrar lista vazia enganosa.
 */
export function CrmContactsSection() {
  const { t } = useI18n()
  const copy = t.settings.crmContacts

  const [contacts, setContacts] = useState<null | CrmContactRow[]>(null)
  const [failure, setFailure] = useState<null | string>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setFailure(null)

    try {
      setContacts(await listCrmContacts())
    } catch {
      setContacts([])
      setFailure(copy.unavailable)
    }
  }, [copy.unavailable])

  useEffect(() => {
    if (!crmAvailable()) {
      setContacts([])
      setFailure(copy.unavailable)

      return
    }

    void load()
  }, [copy.unavailable, load])

  const save = useCallback(async () => {
    setSaving(true)
    setFailure(null)

    try {
      const answer = await saveCrmContact({ company, name, phone })

      if ('error' in answer) {
        setFailure(crmErrorText(answer.error))
      } else {
        setContacts(answer.contacts)
        setName('')
        setPhone('')
        setCompany('')
      }
    } finally {
      setSaving(false)
    }
  }, [company, name, phone])

  const remove = useCallback(async (phoneNumber: string) => {
    try {
      setContacts(await removeCrmContact(phoneNumber))
    } catch {
      setFailure(copy.unavailable)
    }
  }, [copy.unavailable])

  return (
    <div className="mt-8 border-t border-border/60 pt-6">
      <p className="mb-1 text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
        {copy.title}
      </p>
      <p className="mb-4 text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
        {copy.intro}
      </p>

      {failure ? <p className="mb-3 text-sm text-(--ui-text-secondary)">{failure}</p> : null}

      {contacts === null ? (
        <Loader className="mx-auto my-2 size-6 text-(--ui-text-tertiary)" label={t.common.loading} type="rose-orbit" />
      ) : null}

      {contacts !== null && contacts.length === 0 && !failure ? (
        <p className="mb-3 text-sm text-(--ui-text-secondary)">{copy.empty}</p>
      ) : null}

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
            {copy.name}
          </span>
          <input
            className="h-8 w-48 rounded-md border border-border/60 bg-transparent px-2 text-sm"
            onChange={event => setName(event.target.value)}
            value={name}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
            {copy.phone}
          </span>
          <input
            className="h-8 w-40 rounded-md border border-border/60 bg-transparent px-2 text-sm"
            onChange={event => setPhone(event.target.value)}
            value={phone}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
            {copy.company}
          </span>
          <input
            className="h-8 w-40 rounded-md border border-border/60 bg-transparent px-2 text-sm"
            onChange={event => setCompany(event.target.value)}
            value={company}
          />
        </label>
        <Button disabled={saving} onClick={() => void save()} size="sm">
          {copy.add}
        </Button>
      </div>

      {contacts !== null && contacts.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {contacts.map(contact => (
            <li
              className="flex items-center justify-between gap-4 rounded-md border border-border/60 px-3 py-2"
              key={contact.phone}
            >
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm text-foreground">{contact.name}</span>
                <span className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
                  {[contact.phone, contact.company, contact.email].filter(Boolean).join(' · ')}
                </span>
              </div>
              <Button onClick={() => void remove(contact.phone)} size="sm" variant="ghost">
                {copy.remove}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      <CrmPipelineSection contacts={contacts ?? []} />

      {/* O CRM tem tela propria em /crm; aqui fica so o atalho para quem chega por Configuracoes. */}
      <a className="mt-4 inline-block text-sm text-(--ui-text-secondary) underline" href={CRM_ROUTE}>
        {copy.openCrm}
      </a>
    </div>
  )
}
