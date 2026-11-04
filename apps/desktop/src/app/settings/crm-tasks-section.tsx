import { useCallback, useEffect, useState } from 'react'

import {
  dateInputValue,
  dueFromDateInput,
  dueLabel,
  listTasks,
  removeTask,
  saveTask,
  TASK_PRIORITIES,
  taskErrorText,
  tasksAvailable,
  type CrmTaskRow,
  type TaskPriority
} from '@/api/crm-tasks'
import { listCrmContacts, type CrmContactRow } from '@/api/crm-contacts'
import { isKnownContact } from '@/app/crm/filters'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/ui/loader'
import { useI18n } from '@/i18n/context'

/**
 * Tarefas do CRM.
 *
 * O dado vive no disco do usuário (processo principal); esta seção lista, cria, conclui e remove. Sem bridge — a
 * versão web — a seção explica por que não há tarefas em vez de mostrar uma lista vazia enganosa.
 *
 * O prazo é guardado como timestamp; a tela converte para o fuso de quem olha. "Atrasada" é derivado do relógio
 * agora, não de uma marca gravada: uma tarefa que venceu ontem precisa aparecer atrasada hoje sem ninguém tocar
 * nela.
 */
export function CrmTasksSection() {
  const { t } = useI18n()
  const copy = t.settings.crmTasks

  const [tasks, setTasks] = useState<null | CrmTaskRow[]>(null)
  const [contacts, setContacts] = useState<CrmContactRow[]>([])
  const [failure, setFailure] = useState<null | string>(null)
  const [title, setTitle] = useState('')
  const [due, setDue] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('media')
  const [contact, setContact] = useState('')
  const [saving, setSaving] = useState(false)
  // Tarefa concluida nao some do disco; some da VISTA por padrao. Quem trabalha o dia inteiro acumula
  // dezenas delas, e a lista deixa de mostrar o que ainda precisa de atencao.
  const [mostrarConcluidas, setMostrarConcluidas] = useState(false)

  const available = tasksAvailable()

  const load = useCallback(async () => {
    setFailure(null)

    try {
      setTasks(await listTasks())
    } catch {
      setFailure(taskErrorText('unavailable'))
    }
  }, [])

  useEffect(() => {
    if (!available) {
      return
    }

    void load()
    // Contatos alimentam o seletor; falha aqui não impede usar as tarefas soltas.
    void listCrmContacts()
      .then(setContacts)
      .catch(() => setContacts([]))
  }, [available, load])

  const add = async () => {
    if (!title.trim() || saving) {
      return
    }

    setSaving(true)
    setFailure(null)

    const result = await saveTask({
      contact_phone: contact,
      due_at: dueFromDateInput(due),
      priority,
      title
    })

    setSaving(false)

    if ('error' in result) {
      setFailure(taskErrorText(result.error))

      return
    }

    setTasks(result.tasks)
    setTitle('')
    setDue('')
    setContact('')
    setPriority('media')
  }

  const toggle = async (task: CrmTaskRow) => {
    const result = await saveTask({ ...task, status: task.status === 'aberta' ? 'concluida' : 'aberta' })

    if ('error' in result) {
      setFailure(taskErrorText(result.error))

      return
    }

    setTasks(result.tasks)
  }

  const remove = async (id: string) => {
    try {
      setTasks(await removeTask(id))
    } catch {
      setFailure(taskErrorText('unavailable'))
    }
  }

  if (!available) {
    return (
      <section className="mt-6 flex flex-col gap-2 border-t border-(--ui-border) pt-6">
        <h2 className="text-sm font-semibold text-foreground">{copy.title}</h2>
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
          {copy.unavailable}
        </p>
      </section>
    )
  }

  const agora = Date.now()
  const abertas = tasks?.filter(task => task.status === 'aberta') ?? []
  const atrasadas = abertas.filter(task => task.due_at !== null && task.due_at < agora).length
  const concluidas = (tasks ?? []).filter(task => task.status === 'concluida')
  const visiveis = mostrarConcluidas ? (tasks ?? []) : abertas

  return (
    <section className="mt-6 flex flex-col gap-3 border-t border-(--ui-border) pt-6">
      <div>
        <h2 className="text-sm font-semibold text-foreground">{copy.title}</h2>
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
          {copy.subtitle}
        </p>
      </div>

      {tasks === null ? (
        <Loader label={copy.loading} />
      ) : abertas.length === 0 ? (
        <p className="text-sm text-(--ui-text-secondary)">{copy.empty}</p>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
            {atrasadas > 0 ? copy.summaryLate(abertas.length, atrasadas) : copy.summary(abertas.length)}
          </p>
          {concluidas.length > 0 ? (
            <button
              aria-pressed={mostrarConcluidas}
              className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-secondary) underline underline-offset-2 hover:text-foreground"
              onClick={() => setMostrarConcluidas(atual => !atual)}
              type="button"
            >
              {mostrarConcluidas ? copy.hideDone : copy.showDone(concluidas.length)}
            </button>
          ) : null}
        </div>
      )}

      {tasks !== null && tasks.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {visiveis.map(task => {
            const concluida = task.status === 'concluida'
            const atrasada = !concluida && task.due_at !== null && task.due_at < agora
            const prazo = dueLabel(task.due_at, agora)

            return (
              <li className="flex items-center gap-2 rounded border border-(--ui-border) px-2 py-1.5" key={task.id}>
                <input
                  aria-label={concluida ? copy.markOpen : copy.markDone}
                  checked={concluida}
                  className="size-4 shrink-0"
                  onChange={() => void toggle(task)}
                  type="checkbox"
                />
                <span className="flex min-w-0 flex-col">
                  <span
                    className={
                      concluida
                        ? 'truncate text-sm text-(--ui-text-tertiary) line-through'
                        : 'truncate text-sm text-foreground'
                    }
                  >
                    {task.title}
                  </span>
                  <span className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
                    {[
                      copy.priorities[task.priority],
                      prazo ? (atrasada ? copy.late(prazo) : copy.due(prazo)) : copy.noDue,
                      task.contact_phone && !isKnownContact(contacts, task.contact_phone)
                        ? copy.contactRemoved
                        : task.contact_phone
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
                <Button className="ml-auto" onClick={() => void remove(task.id)} size="sm" variant="ghost">
                  {copy.remove}
                </Button>
              </li>
            )
          })}
        </ul>
      ) : null}

      <div className="flex flex-wrap items-end gap-2">
        <label className="flex min-w-[12rem] flex-1 flex-col gap-1">
          <span className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
            {copy.titleLabel}
          </span>
          <input
            className="rounded border border-(--ui-border) bg-transparent px-2 py-1 text-sm text-foreground"
            onChange={event => setTitle(event.target.value)}
            placeholder={copy.titlePlaceholder}
            value={title}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
            {copy.dueLabel}
          </span>
          <input
            className="rounded border border-(--ui-border) bg-transparent px-2 py-1 text-sm text-foreground"
            onChange={event => setDue(event.target.value)}
            type="date"
            value={due}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
            {copy.priorityLabel}
          </span>
          <select
            className="rounded border border-(--ui-border) bg-transparent px-2 py-1 text-sm text-foreground"
            onChange={event => setPriority(event.target.value as TaskPriority)}
            value={priority}
          >
            {TASK_PRIORITIES.map(valor => (
              <option key={valor} value={valor}>
                {copy.priorities[valor]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
            {copy.contactLabel}
          </span>
          <select
            className="rounded border border-(--ui-border) bg-transparent px-2 py-1 text-sm text-foreground"
            onChange={event => setContact(event.target.value)}
            value={contact}
          >
            <option value="">{copy.noContact}</option>
            {contacts.map(linha => (
              <option key={linha.phone} value={linha.phone}>
                {linha.name || linha.phone}
              </option>
            ))}
          </select>
        </label>
        <Button disabled={!title.trim() || saving} onClick={() => void add()} size="sm">
          {saving ? copy.saving : copy.add}
        </Button>
      </div>

      {failure ? <p className="text-sm text-destructive">{failure}</p> : null}
    </section>
  )
}
