import { useCallback, useEffect, useState } from 'react'

import {
  crmAvailable,
  crmErrorText,
  type CrmContactRow,
  listCrmContacts,
  removeCrmContact,
  saveCrmContact
} from '@/api/crm-contacts'
import { companyLogoConfig, companyLogoFor, type CompanyLogoConfig } from '@/api/crm-company-logo'
import { CRM_ROUTE } from '@/app/routes'
import { contactsToCsv, csvFileName } from '@/lib/crm-csv'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/ui/loader'
import { useI18n } from '@/i18n/context'

import { CrmPipelineSection } from './crm-pipeline-section'
import { CrmTasksSection } from './crm-tasks-section'

/**
 * Baixa um texto como arquivo. `URL.createObjectURL` + âncora é o caminho que funciona tanto no Electron
 * quanto no navegador; o `revokeObjectURL` evita segurar o blob na memória.
 */
function downloadText(fileName: string, text: string, mime: string): void {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * Contatos do WhatsApp CRM.
 *
 * O dado vive no disco do usuário (processo principal); esta tela lista e cadastra. Sem bridge (versão web) a
 * seção explica por que não há contatos em vez de mostrar lista vazia enganosa.
 */
/** Traduz o registro de consentimento em texto. `null` nunca vira "autorizou". */
function consentLabel(
  consent: CrmContactRow['consent'],
  copy: { consentDenied: string; consentGranted: string; consentUnknown: string }
): string {
  if (!consent) return copy.consentUnknown

  return consent.granted ? copy.consentGranted : copy.consentDenied
}

export function CrmContactsSection({ showOpenLink = true }: { showOpenLink?: boolean } = {}) {

/** Centavos -> reais.
ull vira travessao, nunca R$ 0,00 (ver o comentario da lista). */
function formatarReais(centavos: null | number | undefined): string {
  if (typeof centavos !== 'number') return '—'

  return (centavos / 100).toLocaleString('pt-BR', { currency: 'BRL', style: 'currency' })
}
  const { t } = useI18n()
  const copy = t.settings.crmContacts

  const [contacts, setContacts] = useState<null | CrmContactRow[]>(null)
  // Logo da empresa: só com token configurado; sem ele, nada é pedido a terceiro.
  const [logoConfig, setLogoConfig] = useState<CompanyLogoConfig>({ enabled: false, token: '' })
  const [failure, setFailure] = useState<null | string>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void companyLogoConfig().then(setLogoConfig)
  }, [])

  const load = useCallback(async () => {
    setFailure(null)

    try {
      setContacts(await listCrmContacts())
    } catch {
      setContacts([])
      setFailure(copy.unavailable)
    }
  }, [copy.unavailable])
  /**
   * Registra autorizacao ou recusa do titular (LGPD, r206).
   *
   * Grava `base: 'consentimento'` porque e o titular quem respondeu — nao ha contrato nem obrigacao legal por
   * tras de um clique em "autorizou". `upsert` ja substitui pelo telefone, entao nao duplica contato.
   */
  async function registrarConsentimento(contact: CrmContactRow, granted: boolean) {
    setSaving(true)

    try {
      await saveCrmContact({ ...contact, consent: { at: Date.now(), base: 'consentimento', granted } })
      await load()
    } catch {
      setFailure(copy.unavailable)
    } finally {
      setSaving(false)
    }
  }

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

      {contacts !== null && contacts.length > 0 ? (
        <div className="mb-3">
          <Button
            onClick={() => downloadText(csvFileName(new Date()), contactsToCsv(contacts), 'text/csv;charset=utf-8')}
            size="sm"
            variant="ghost"
          >
            {copy.export}
          </Button>
        </div>
      ) : null}

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
              <div className="flex min-w-0 items-center gap-2">
                {companyLogoFor(contact.email, logoConfig) ? (
                  <img
                    alt=""
                    aria-hidden
                    className="size-6 shrink-0 rounded object-contain"
                    height={24}
                    loading="lazy"
                    src={companyLogoFor(contact.email, logoConfig) ?? undefined}
                    width={24}
                  />
                ) : null}
                <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm text-foreground">{contact.name}</span>
                <span className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
                  {[contact.phone, contact.company, contact.email].filter(Boolean).join(' · ')}
                </span>
                {/*
                  LGPD (r206): a tela mostra a base legal e NUNCA a inventa. `null` e ausencia de registro —
                  dizer "autorizou" aqui seria pior que nao mostrar nada, porque o relatorio de conformidade
                  passaria a mentir.
                */}
                <span className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
                  {consentLabel(contact.consent, copy)}
                </span>
                {/*
                  r136 do GOAL V2: a última compra.

                  O r135 passou a GRAVAR `last_purchase_*` no contato; até esta linha, o dado existia e não
                  aparecia em lugar nenhum — capacidade sem porta, no último metro.

                  E `null` NÃO é zero: um contato que nunca comprou não mostra data nem valor. Mostrar
                  "R$ 0,00" seria dizer que ele comprou de graça.
                */}
                <span className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
                  {typeof contact.last_purchase_at === 'number'
                    ? `última compra ${new Date(contact.last_purchase_at).toLocaleDateString()} · ${formatarReais(contact.last_purchase_cents)}`
                    : 'nunca comprou'}
                </span>
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  onClick={() => void registrarConsentimento(contact, true)}
                  size="sm"
                  variant="ghost"
                >
                  {copy.consentGrant}
                </Button>
                <Button
                  onClick={() => void registrarConsentimento(contact, false)}
                  size="sm"
                  variant="ghost"
                >
                  {copy.consentDeny}
                </Button>
                <Button onClick={() => void remove(contact.phone)} size="sm" variant="ghost">
                  {copy.remove}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <CrmPipelineSection contacts={contacts ?? []} />
      <CrmTasksSection />

      {/* O CRM tem tela própria em /crm; este atalho existe para quem chega por
          Configurações. Dentro da própria página ele seria um link para onde a
          pessoa já está, então some quando a rota atual é a do CRM. */}
      {showOpenLink ? (
        <a className="mt-4 inline-block text-sm text-(--ui-text-secondary) underline" href={CRM_ROUTE}>
          {copy.openCrm}
        </a>
      ) : null}
    </div>
  )
}
