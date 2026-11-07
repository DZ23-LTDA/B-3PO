/**
 * Sofia — planos de coordenação.
 *
 * O QUE ESTA TELA FAZ
 *
 * Ela mostra o que a camada de coordenação (r16–r20) construiu: um plano, suas tarefas, o **grafo** que
 * diz quais podem rodar, e a **prestação de contas** quando terminam.
 *
 * POR QUE ELA É O PASSO 5, E NÃO UM EXTRA
 *
 * A spec lista cinco passos e a tela é o último — não por ser cosmético. Sem ela, o store, o grafo, os
 * canais e a ponte são **código inalcançável**: exatamente o padrão que a r2 mediu em cinco camadas
 * (regra → canal → preload → wrapper → tela). Um canal sem tela é tão inútil quanto uma tela sem canal.
 *
 * O QUE A TELA NÃO FAZ
 *
 * Não calcula grafo: o canal já devolve `grafo`, `prontas` e `profundidade` prontos. Recalcular aqui
 * criaria uma segunda topologia, e as duas divergiriam no primeiro plano com ciclo.
 *
 * Não decide quem pode delegar: o backend recusa com `sem_permissao` e a tela **mostra a recusa**. Um
 * botão desabilitado sem explicação é pior que um botão que explica por que não pode.
 */

import { useCallback, useEffect, useState } from 'react'

import { type ActorRow, whoami } from '@/api/admin'
import { chamarSofia, type PlanoComGrafo } from '@/api/sofia'
import { useStore } from '@nanostores/react'

import { contextoDaSofia, descreverContexto } from '@/lib/contexto-da-sofia'
import { $ambiente } from '@/store/ambiente'
import { $projectScope } from '@/store/project-scope'


const CARTAO = 'rounded-lg border border-(--ui-border) p-4'
const ROTULO = 'text-xs uppercase tracking-wide text-(--ui-text-tertiary)'
const BOTAO =
  'rounded-md border border-(--ui-border) px-3 py-1 text-sm text-foreground outline-none hover:border-(--ui-accent) disabled:opacity-40'

/** Um plano que não roda precisa dizer POR QUE, com o id das tarefas envolvidas. */
function Diagnostico({ plano }: { plano: PlanoComGrafo }): React.ReactElement | null {
  if (plano.grafo.valido) return null

  return (
    <div className="mt-2 rounded-md border border-(--ui-warning) p-2 text-xs text-(--ui-warning)">
      {plano.grafo.ciclos.length > 0 && (
        <p>
          Ciclo: {plano.grafo.ciclos.map(c => c.join(' → ')).join(' · ')} — este plano nunca termina.
        </p>
      )}
      {plano.grafo.dependencias_orfas.length > 0 && (
        <p>
          Dependência inexistente:{' '}
          {plano.grafo.dependencias_orfas.map(d => `${d.tarefa_id} espera ${d.depende_de}`).join(' · ')}
        </p>
      )}
    </div>
  )
}

function Tarefa({ plano, tarefa }: { plano: PlanoComGrafo; tarefa: PlanoComGrafo['tarefas'][number] }): React.ReactElement {
  const pronta = plano.prontas.includes(tarefa.tarefa_id)

  return (
    <li className="flex items-start justify-between gap-2 border-t border-(--ui-border) py-2 first:border-0">
      <div>
        <p className="text-sm text-foreground">{tarefa.titulo || tarefa.tarefa_id}</p>
        <p className="text-xs text-(--ui-text-tertiary)">
          {tarefa.status}
          {tarefa.depende_de.length > 0 && ` · depende de ${tarefa.depende_de.join(', ')}`}
          {tarefa.execucao_id && ` · execução ${tarefa.execucao_id}`}
        </p>
      </div>
      <span className="text-xs text-(--ui-text-tertiary)">{pronta ? 'pronta' : ''}</span>
    </li>
  )
}

function PlanoCard({
  onAtualizar,
  plano
}: {
  onAtualizar: () => void
  plano: PlanoComGrafo
}): React.ReactElement {
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)

  const concluir = useCallback(
    async (tarefaId: string) => {
      setOcupado(true)
      setErro('')

      try {
        const r = await chamarSofia('tarefa', {
          patch: { status: 'concluida' },
          plano_id: plano.plano_id,
          tarefa_id: tarefaId
        })

        if (r && typeof r === 'object' && 'error' in r) setErro(String((r as { error: string }).error))
        else onAtualizar()
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'falha ao atualizar')
      } finally {
        setOcupado(false)
      }
    },
    [onAtualizar, plano.plano_id]
  )

  return (
    <article className={CARTAO}>
      <header className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-medium text-foreground">{plano.objetivo}</h2>
          <p className={ROTULO}>
            {plano.escopo} · {plano.status}
            {plano.profundidade !== null && ` · ${plano.profundidade} níveis`}
            {plano.aprovacao && ` · aprovado por ${plano.aprovacao.por}`}
          </p>
        </div>
        <span className="text-xs text-(--ui-text-tertiary)">
          {plano.tarefas.filter(t => t.status === 'concluida').length}/{plano.tarefas.length}
        </span>
      </header>

      <Diagnostico plano={plano} />

      <ul className="mt-2">
        {plano.tarefas.map(t => (
          <Tarefa key={t.tarefa_id} plano={plano} tarefa={t} />
        ))}
      </ul>

      {plano.tarefas.length === 0 && <p className="mt-2 text-xs text-(--ui-text-tertiary)">Plano sem tarefas.</p>}

      {erro && <p className="mt-2 text-xs text-(--ui-warning)">{erro}</p>}

      {plano.prontas.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {plano.prontas.map(id => (
            <button className={BOTAO} disabled={ocupado} key={id} onClick={() => void concluir(id)} type="button">
              Concluir {id}
            </button>
          ))}
        </div>
      )}
    </article>
  )
}

export function SofiaView(): React.ReactElement {
  const ambiente = useStore($ambiente)
  const projetoAtivo = useStore($projectScope)
  // O ator vem do BACKEND (whoami), nao de um palpite do renderer: e ele que diz o nivel e os
  // escopos, e e o mesmo canal que o resto do produto ja usa.
  const [ator, setAtor] = useState<ActorRow | null>(null)
  const [planos, setPlanos] = useState<PlanoComGrafo[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    setErro('')

    try {
      const r = await chamarSofia('planos', undefined)

      if (r && typeof r === 'object' && 'planos' in r) setPlanos((r as { planos: PlanoComGrafo[] }).planos)
      else if (r && typeof r === 'object' && 'error' in r) setErro(String((r as { error: string }).error))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'falha ao carregar')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  useEffect(() => {
    let vivo = true

    void whoami()
      .then(resposta => {
        if (vivo) setAtor(resposta)
      })
      .catch(() => {
        // Sem ator o contexto diz "identidade ainda nao resolvida" - que e a verdade, nao um erro.
      })

    return () => {
      vivo = false
    }
  }, [])

  return (
    <div className="flex flex-col gap-4 p-4">
      <header>
        <h1 className="text-lg font-medium text-foreground">Sofia</h1>
        <p className="text-sm text-(--ui-text-tertiary)">
          Planos de coordenação: o que foi pedido, o que depende do quê, e o que já terminou.
        </p>
        {/*
         * r270 (G5): o contexto em que a Sofia está trabalhando.
         *
         * É DESCRITIVO. Ele não libera canal nem filtra resposta — diz em que recorte a pergunta
         * foi feita, para a resposta não vir de outro ambiente. Quando o ator não pode ler, o
         * contexto diz isso em vez de fingir um escopo que ele não tem.
         */}
        <p className="mt-1 text-xs text-(--ui-text-tertiary)" data-testid="sofia-contexto">
          {descreverContexto(contextoDaSofia({ ambiente, ator, projeto: projetoAtivo }))}
        </p>
      </header>

      {erro && <p className="text-xs text-(--ui-warning)">{erro}</p>}

      {carregando ? (
        <p className="text-sm text-(--ui-text-tertiary)">Carregando planos…</p>
      ) : planos.length === 0 ? (
        // Estado vazio honesto: não é "nenhum resultado de busca", é "nada foi criado ainda".
        <p className="text-sm text-(--ui-text-tertiary)">
          Nenhum plano ainda. Um plano nasce quando uma intenção vira tarefas com dependências.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {planos.map(p => (
            <PlanoCard key={p.plano_id} onAtualizar={() => void carregar()} plano={p} />
          ))}
        </div>
      )}
    </div>
  )
}
