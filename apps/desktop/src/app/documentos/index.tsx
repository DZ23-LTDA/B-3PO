import { useCallback, useEffect, useState } from 'react'

import {
  documentErrorText,
  DOCUMENT_KINDS,
  DOCUMENT_SCOPES,
  documentsAvailable,
  KIND_LABEL,
  listDocuments,
  removeDocument,
  saveDocument,
  SCOPE_LABEL,
  sizeLabel,
  type DocumentKind,
  type DocumentRow,
  type DocumentScope,
  type DocumentsTotals
} from '@/api/documents'

const VAZIO: DocumentsTotals = { bytes: 0, por_kind: {} as DocumentsTotals['por_kind'], total: 0 }

/**
 * Registro de documentos.
 *
 * O botão "Registrar" grava METADADOS. Ele não abre seletor de arquivo porque este domínio não recebe
 * binário — dizer isso na tela evita a expectativa de upload que não existe.
 */
export function DocumentosView() {
  const [rows, setRows] = useState<DocumentRow[]>([])
  const [totais, setTotais] = useState<DocumentsTotals>(VAZIO)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [form, setForm] = useState({
    kind: 'contrato' as DocumentKind,
    name: '',
    ref: '',
    scope: 'empresa' as DocumentScope,
    scope_id: '',
    size_bytes: ''
  })

  const carregar = useCallback(async () => {
    setCarregando(true)

    try {
      const r = await listDocuments()

      setRows(r.documents)
      setTotais(r.totals)
      setErro('')
    } catch (e) {
      setErro(String((e as Error)?.message ?? e))
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  async function registrar(): Promise<void> {
    const r = await saveDocument({
      kind: form.kind,
      name: form.name,
      ref: form.ref,
      scope: form.scope,
      scope_id: form.scope_id,
      size_bytes: Number(form.size_bytes) || 0
    })

    if ('error' in r) {
      setErro(documentErrorText(r.error))

      return
    }

    setForm({ ...form, name: '', ref: '', size_bytes: '' })
    await carregar()
  }

  async function remover(id: string): Promise<void> {
    const r = await removeDocument(id)

    if ('error' in r) {
      setErro(documentErrorText(r.error))

      return
    }

    await carregar()
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-6 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-foreground">Documentos</h1>
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
          O registro guarda a ficha do documento e aponta para o arquivo. O arquivo em si continua onde
          está — contratos, notas e comprovantes não são copiados para dentro do B-3PO.
        </p>
      </div>

      {!documentsAvailable() ? (
        <p className="rounded border border-(--ui-stroke-secondary) px-3 py-2 text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
          O registro de documentos não está disponível neste ambiente.
        </p>
      ) : null}

      {erro ? (
        <p
          className="rounded border border-(--ui-danger) px-3 py-2 text-[length:var(--conversation-caption-font-size)] text-(--ui-danger)"
          role="alert"
        >
          {erro}
        </p>
      ) : null}

      <section className="flex flex-col gap-3 rounded border border-(--ui-stroke-secondary) p-4">
        <h2 className="text-sm font-medium text-foreground">Registrar documento</h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
            <span className="text-(--ui-text-tertiary)">Nome do arquivo</span>
            <input
              className="rounded border border-(--ui-stroke-secondary) bg-transparent px-2 py-1 text-foreground"
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="contrato-2024.pdf"
              value={form.name}
            />
          </label>

          <label className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
            <span className="text-(--ui-text-tertiary)">Onde o arquivo está</span>
            <input
              className="rounded border border-(--ui-stroke-secondary) bg-transparent px-2 py-1 text-foreground"
              onChange={e => setForm({ ...form, ref: e.target.value })}
              placeholder="C:\empresa\contratos\contrato-2024.pdf"
              value={form.ref}
            />
          </label>

          <label className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
            <span className="text-(--ui-text-tertiary)">Tipo</span>
            <select
              className="rounded border border-(--ui-stroke-secondary) bg-transparent px-2 py-1 text-foreground"
              onChange={e => setForm({ ...form, kind: e.target.value as DocumentKind })}
              value={form.kind}
            >
              {DOCUMENT_KINDS.map(k => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
            <span className="text-(--ui-text-tertiary)">Se refere a</span>
            <select
              className="rounded border border-(--ui-stroke-secondary) bg-transparent px-2 py-1 text-foreground"
              onChange={e => setForm({ ...form, scope: e.target.value as DocumentScope })}
              value={form.scope}
            >
              {DOCUMENT_SCOPES.map(s => (
                <option key={s} value={s}>
                  {SCOPE_LABEL[s]}
                </option>
              ))}
            </select>
          </label>

          {form.scope === 'outro' ? null : (
            <label className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
              <span className="text-(--ui-text-tertiary)">Identificador de {SCOPE_LABEL[form.scope]}</span>
              <input
                className="rounded border border-(--ui-stroke-secondary) bg-transparent px-2 py-1 text-foreground"
                onChange={e => setForm({ ...form, scope_id: e.target.value })}
                placeholder="id do registro"
                value={form.scope_id}
              />
            </label>
          )}

          <label className="flex flex-col gap-1 text-[length:var(--conversation-caption-font-size)]">
            <span className="text-(--ui-text-tertiary)">Tamanho em bytes (opcional)</span>
            <input
              className="rounded border border-(--ui-stroke-secondary) bg-transparent px-2 py-1 text-foreground"
              onChange={e => setForm({ ...form, size_bytes: e.target.value })}
              placeholder="240000"
              value={form.size_bytes}
            />
          </label>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="rounded bg-(--ui-accent) px-3 py-1 text-[length:var(--conversation-caption-font-size)] font-medium text-(--ui-accent-foreground) disabled:opacity-50"
            disabled={!form.name.trim() || !form.ref.trim()}
            onClick={() => void registrar()}
            type="button"
          >
            Registrar
          </button>
          <span className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
            Nome e origem são obrigatórios.
          </span>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-medium text-foreground">Registrados</h2>
          <span className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
            {totais.total} {totais.total === 1 ? 'documento' : 'documentos'} · {sizeLabel(totais.bytes)}
          </span>
        </div>

        {carregando ? (
          <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">Carregando…</p>
        ) : rows.length === 0 ? (
          <p className="rounded border border-(--ui-stroke-secondary) px-3 py-2 text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
            Nenhum documento registrado neste computador.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-(--ui-stroke-secondary) rounded border border-(--ui-stroke-secondary)">
            {rows.map(d => (
              <li className="flex items-center justify-between gap-3 px-3 py-2" key={d.id}>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-[length:var(--conversation-caption-font-size)] text-foreground">
                    {d.name}
                  </span>
                  <span className="truncate text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
                    {KIND_LABEL[d.kind]} · {SCOPE_LABEL[d.scope]} · {sizeLabel(d.size_bytes)} · {d.ref}
                  </span>
                </div>
                <button
                  className="shrink-0 rounded border border-(--ui-stroke-secondary) px-2 py-1 text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)"
                  onClick={() => void remover(d.id)}
                  type="button"
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
