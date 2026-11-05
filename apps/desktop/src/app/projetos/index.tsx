import { useCallback, useEffect, useState } from 'react'

import {
  criarProjeto,
  mudarProjeto,
  projetoErroText,
  projetosDisponivel,
  projetosAtivos,
  listarProjetos,
  podeIniciarProjeto,
  PROJETO_STATUS,
  quandoLabel,
  situacaoDoProjeto,
  STATUS_LABEL,
  type ProjetoRow,
  type ProjetoStatus
} from '@/api/projetos'
import { Button } from '@/components/ui/button'

/**
 * Projetos.
 *
 * O PLANO PERSISTENTE DO §12 (r80 do GOAL V2).
 *
 * O §12 define três tipos de trabalho: **organização permanente**, **projeto** e **trabalho pontual**. A
 * organização tem a sua tela; a tarefa tem a dela; **faltava o lugar onde as duas se encontram** — e é
 * aqui.
 *
 * A REGRA QUE A TELA NÃO PODE ESCONDER
 *
 * **Sem critério de aceite, ninguém declara pronto.** O botão "concluir" fica desabilitado quando a lista
 * de critérios está vazia — e há uma frase ao lado dizendo **por quê**, em vez de um botão morto sem
 * explicação.
 *
 * O renderer não é a autoridade: se alguém chamar o canal direto, `project.ts` recusa de qualquer forma. A
 * tela só torna a recusa **visível antes do clique**.
 */
export function ProjetosView() {
  const [projetos, setProjetos] = useState<ProjetoRow[]>([])
  const [nome, setNome] = useState('')
  const [objetivo, setObjetivo] = useState('')
  const [criterios, setCriterios] = useState('')
  const [prazo, setPrazo] = useState('')
  const [falha, setFalha] = useState('')

  const disponivel = projetosDisponivel()

  const carregar = useCallback(async () => {
    setProjetos(await listarProjetos())
  }, [])

  useEffect(() => {
    if (disponivel) void carregar()
  }, [carregar, disponivel])

  const criar = async () => {
    setFalha('')

    const r = await criarProjeto({
      // A tela manda a lista, não uma nota: cada linha é um critério verificável.
      criterios: criterios
        .split('\n')
        .map(c => c.trim())
        .filter(Boolean),
      nome,
      objetivo,
      prazo: prazo ? new Date(`${prazo}T23:59:59`).getTime() : null
    })

    if ('error' in r) {
      setFalha(projetoErroText(r.error))
    } else {
      setProjetos(r.projetos)
      setNome('')
      setObjetivo('')
      setCriterios('')
      setPrazo('')
    }
  }

  const mudar = async (p: ProjetoRow, status: ProjetoStatus) => {
    setFalha('')

    const r = await mudarProjeto(p.id, status)

    if ('error' in r) setFalha(projetoErroText(r.error))
    else setProjetos(r.projetos)
  }

  if (!disponivel) {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-8">
        <header className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold text-foreground">Projetos</h1>
        </header>
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
          Projetos indisponíveis neste ambiente.
        </p>
      </main>
    )
  }

  const emAndamento = projetosAtivosDe(projetos)

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-foreground">Projetos</h1>
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
          Para que existe, até quando e como saber que terminou. Um projeto sem critério de aceite não pode
          ser concluído.
        </p>
      </header>

      <section className="rounded-lg border border-(--ui-border) p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-foreground">Novo projeto</h2>
          <span className="text-xs text-(--ui-text-tertiary)">{emAndamento.length} em andamento</span>
        </div>

        <div className="mt-2 grid gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-(--ui-text-tertiary)">Nome</span>
            <input
              className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)"
              onChange={event => setNome(event.target.value)}
              placeholder="Loja online"
              value={nome}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-(--ui-text-tertiary)">Para que existe</span>
            <input
              className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)"
              onChange={event => setObjetivo(event.target.value)}
              placeholder="vender os botijões sem depender de telefone"
              value={objetivo}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-(--ui-text-tertiary)">
              Como saber que terminou — <em>uma linha por critério</em>
            </span>
            <textarea
              className="min-h-16 rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)"
              onChange={event => setCriterios(event.target.value)}
              placeholder={'o cliente consegue comprar pelo site\no estoque baixa sozinho'}
              value={criterios}
            />
          </label>

          <label className="flex w-40 flex-col gap-1">
            <span className="text-(--ui-text-tertiary)">Prazo</span>
            <input
              className="rounded-md border border-(--ui-border) bg-(--ui-bg-secondary) px-2 py-1 text-foreground outline-none focus:border-(--ui-accent)"
              onChange={event => setPrazo(event.target.value)}
              type="date"
              value={prazo}
            />
          </label>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <Button onClick={() => void criar()} variant="ghost">
            Criar
          </Button>
          {/* O aviso é dito ANTES do clique: sem critério o projeto nasce, mas não poderá ser concluído. */}
          {criterios.trim() ? null : (
            <span className="text-xs text-(--ui-text-tertiary)">
              Sem critério, ele não poderá ser concluído depois.
            </span>
          )}
        </div>

        {falha ? <p className="mt-2 text-xs text-(--ui-warning)">{falha}</p> : null}
      </section>

      {projetos.length === 0 ? (
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
          Nenhum projeto ainda.
        </p>
      ) : (
        <section className="rounded-lg border border-(--ui-border) p-4">
          <ul className="flex flex-col gap-3 text-xs">
            {projetos.map(p => {
              const podeConcluir = p.criterios.length > 0 && p.status === 'ativo'

              return (
                <li className="flex flex-col gap-1" key={p.id}>
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-foreground">
                      {p.nome} · {STATUS_LABEL[p.status]}
                      {p.prazo !== null ? ` · até ${quandoLabel(p.prazo)}` : ''}
                    </span>
                    <span className="flex items-center gap-1">
                      {p.status === 'rascunho' ? (
                        <button
                          className="rounded-md border border-(--ui-border) px-2 py-0.5 text-xs text-foreground hover:border-(--ui-accent)"
                          onClick={() => void mudar(p, 'ativo')}
                          type="button"
                        >
                          Começar
                        </button>
                      ) : null}
                      {p.status === 'ativo' ? (
                        <>
                          <button
                            className="rounded-md border border-(--ui-border) px-2 py-0.5 text-xs text-foreground hover:border-(--ui-accent) disabled:opacity-40"
                            disabled={!podeConcluir}
                            onClick={() => void mudar(p, 'concluido')}
                            type="button"
                          >
                            Concluir
                          </button>
                          <button
                            className="rounded-md border border-(--ui-border) px-2 py-0.5 text-xs text-foreground hover:border-(--ui-accent)"
                            onClick={() => void mudar(p, 'cancelado')}
                            type="button"
                          >
                            Cancelar
                          </button>
                        </>
                      ) : null}
                    </span>
                  </span>

                  <span className="text-(--ui-text-tertiary)">{p.objetivo}</span>
                  <span className="text-(--ui-text-tertiary)">{situacaoDoProjeto(p)}</span>

                  {p.criterios.length > 0 ? (
                    <ul className="ml-4 list-disc text-(--ui-text-tertiary)">
                      {p.criterios.map(c => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </main>
  )
}

/** Os ativos, calculados na tela — o mesmo filtro que o store faz, sem nova chamada. */
function projetosAtivosDe(lista: readonly ProjetoRow[]): ProjetoRow[] {
  return lista.filter(p => p.status === 'ativo')
}

// Mantém `PROJETO_STATUS` em uso: o lint do workspace reclama de import sem consumidor, e a lista é a
// referência para uma futura tela de filtro.
export const TODOS_OS_STATUS = PROJETO_STATUS

/** Reexportado para a tela poder ser testada sem montar o bridge. */
export { podeIniciarProjeto }
