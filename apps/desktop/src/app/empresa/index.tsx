import { useCallback, useEffect, useState } from 'react'

import { consultarCnpj, lookupAvailable, lookupErrorText } from '@/api/lookup'

import {
  companiesAvailable,
  listBranches,
  listCompanies,
  saveBranch,
  saveCompany,
  type BranchRow,
  type CompanyRow
} from '@/api/companies'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/ui/loader'
import { useI18n } from '@/i18n/context'

/**
 * Tela de empresas.
 *
 * Cadastrar empresa aqui **não** move os dados existentes para ela. Os outros domínios continuam em
 * `tenant_id = 'local'` até a migração, que é um passo separado com backup e rollback. A tela diz isso
 * ao usuário em vez de deixar acreditar que cadastrar empresa já separa os dados.
 */
export function EmpresaView() {
  const { t } = useI18n()
  const copy = t.settings.empresa

  const [companies, setCompanies] = useState<null | CompanyRow[]>(null)
  const [branches, setBranches] = useState<Record<string, BranchRow[]>>({})
  const [failure, setFailure] = useState<null | string>(null)
  const [nome, setNome] = useState('')
  const [fantasia, setFantasia] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [selecionada, setSelecionada] = useState('')
  const [filial, setFilial] = useState('')
  const [endereco, setEndereco] = useState('')
  const [saving, setSaving] = useState(false)
  const [buscando, setBuscando] = useState(false)

  const disponivel = companiesAvailable()

  const carregar = useCallback(async () => {
    try {
      const lista = await listCompanies()

      setCompanies(lista)

      const mapa: Record<string, BranchRow[]> = {}

      for (const company of lista) {
        mapa[company.id] = await listBranches(company.id)
      }

      setBranches(mapa)
      setFailure(null)
    } catch {
      setFailure(copy.loadFailed)
      setCompanies([])
    }
  }, [copy.loadFailed])

  useEffect(() => {
    if (disponivel) void carregar()
  }, [carregar, disponivel])

  const erroDe = (chave: string): string => {
    const mapa: Record<string, string> = {
      cnpj_duplicado: copy.duplicateCnpj,
      company_required: copy.companyRequired,
      empresa_nao_encontrada: copy.companyRequired,
      name_required: copy.nameRequired
    }

    return mapa[chave] ?? chave
  }

  /**
   * Preenche razao social e nome fantasia a partir do CNPJ.
   *
   * So preenche o que veio preenchido: se a Receita nao tiver fantasia, o campo do operador nao e apagado.
   * E nao salva - ele confere e clica em adicionar. Uma resposta errada da API nunca vira registro.
   */
  const buscarPeloCnpj = useCallback(async () => {
    setBuscando(true)
    setFailure(null)

    try {
      const r = await consultarCnpj(cnpj)

      if ('error' in r) {
        setFailure(lookupErrorText(r.error))

        return
      }

      if (r.empresa.razao_social) setNome(r.empresa.razao_social)
      if (r.empresa.nome_fantasia) setFantasia(r.empresa.nome_fantasia)
    } finally {
      setBuscando(false)
    }
  }, [cnpj])

  async function cadastrarEmpresa() {
    if (!nome.trim()) {
      setFailure(copy.nameRequired)
      return
    }

    setSaving(true)

    try {
      const r = await saveCompany({ cnpj, name: nome.trim(), trade_name: fantasia.trim() })

      if ('error' in r) {
        setFailure(erroDe(r.error))
      } else {
        setCompanies(r.companies)
        setNome('')
        setFantasia('')
        setCnpj('')
        await carregar()
      }
    } finally {
      setSaving(false)
    }
  }

  async function cadastrarFilial() {
    if (!selecionada) {
      setFailure(copy.companyRequired)
      return
    }

    if (!filial.trim()) {
      setFailure(copy.nameRequired)
      return
    }

    setSaving(true)

    try {
      const r = await saveBranch({ address: endereco.trim(), company_id: selecionada, name: filial.trim() })

      if ('error' in r) {
        setFailure(erroDe(r.error))
      } else {
        setBranches({ ...branches, [selecionada]: r.branches })
        setFilial('')
        setEndereco('')
        setFailure(null)
      }
    } finally {
      setSaving(false)
    }
  }

  const campo = (rotulo: string, valor: string, aoMudar: (v: string) => void) => (
    <label className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
      <span className="text-(--ui-text-tertiary)">{rotulo}</span>
      <input
        className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)"
        onChange={event => aoMudar(event.target.value)}
        value={valor}
      />
    </label>
  )

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-8">
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
            {campo(copy.tradeName, fantasia, setFantasia)}
            {campo(copy.cnpj, cnpj, setCnpj)}
            {lookupAvailable() ? (
              <div className="flex items-end gap-2">
                <Button
                  disabled={saving || buscando || !cnpj}
                  onClick={() => void buscarPeloCnpj()}
                  type="button"
                  variant="outline"
                >
                  {buscando ? copy.searching : copy.searchCnpj}
                </Button>
              </div>
            ) : null}
            <div className="flex items-end">
              <Button disabled={saving} onClick={() => void cadastrarEmpresa()}>
                {copy.addCompany}
              </Button>
            </div>
          </section>

          <section className="grid gap-2 rounded-lg border border-(--ui-border) p-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
              <span className="text-(--ui-text-tertiary)">{copy.company}</span>
              <select
                className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)"
                onChange={event => setSelecionada(event.target.value)}
                value={selecionada}
              >
                <option value="">{copy.pickCompany}</option>
                {(companies ?? []).map(company => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </label>
            {campo(copy.branchName, filial, setFilial)}
            {campo(copy.address, endereco, setEndereco)}
            <div className="flex items-end">
              <Button disabled={saving} onClick={() => void cadastrarFilial()} variant="ghost">
                {copy.addBranch}
              </Button>
            </div>
          </section>

          {failure ? (
            <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-danger)">{failure}</p>
          ) : null}

          {companies === null ? (
            <Loader />
          ) : companies.length === 0 ? (
            <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">{copy.empty}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {companies.map(company => (
                <li className="rounded-lg border border-(--ui-border) p-3" key={company.id}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium text-foreground">{company.name}</span>
                    <span className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
                      {company.cnpj || '—'} · {company.currency} · {company.timezone}
                    </span>
                  </div>
                  {(branches[company.id] ?? []).length === 0 ? (
                    <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
                      {copy.noBranches}
                    </p>
                  ) : (
                    <ul className="mt-1 flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)] text-(--ui-text-secondary)">
                      {(branches[company.id] ?? []).map(branch => (
                        <li key={branch.id}>
                          {copy.branchLabel} · {branch.name}
                          {branch.address ? ` · ${branch.address}` : ''}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}

          <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">{copy.migrationNote}</p>
        </>
      )}
    </main>
  )
}
