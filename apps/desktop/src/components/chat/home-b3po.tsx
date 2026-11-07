/**
 * A home do B-3PO Ultimate Agent Platform (r1 do V4).
 *
 * O QUE MUDOU, E O QUE NÃO MUDOU
 *
 * A r268 entregou a porta de entrada: marca, frase e os **seis modos**. O mockup aprovado em 07/11
 * pede mais: agentes, projetos e indicadores — e o dono foi explícito sobre a regra que governa os
 * três: **os números do mockup são ilustrativos**. Nada aqui é hardcoded; tudo vem de `api/*`.
 *
 * **Substitui** a home anterior em vez de conviver com ela (decisão 2): é este componente, nesta
 * rota, um só. Nenhum roteador, store ou serviço novo — os cartões chamam o MESMO `setAmbiente` do
 * seletor da barra lateral, e as seções leem as MESMAS fontes que `/agents` e `/projetos`.
 *
 * A REGRA DOS CINCO ESTADOS
 *
 * Cada seção distingue *carregando*, *ok*, *vazio*, *erro* e *indisponível*. A decisão de produto
 * proíbe "falha de API em zero enganoso", e é por isso que `lib/home-dados.ts` devolve `null` (que a
 * tela mostra como `—`) em vez de `0` quando a leitura não aconteceu.
 */

import { useStore } from '@nanostores/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { type AgenteDaLista, listarAgentesComEstado } from '@/api/agents'
import { listarProjetosComEstado, type ProjetoRow, STATUS_LABEL } from '@/api/projetos'
import { listarPlanosComEstado, type PlanoResumo } from '@/api/sofia'
import { BrandHero, BRAND_HERO_ALT } from '@/components/chat/brand-hero'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n'
import { AMBIENTE_IDENTIDADE } from '@/lib/ambiente-identidade'
import { AMBIENTE_LABEL, AMBIENTES, type Ambiente } from '@/lib/ambiente'
import {
  estadoDaSecao,
  type Indicador,
  indicadores,
  inicialDoNome,
  projetosPorRecencia,
  secaoCarregando,
  type Secao
} from '@/lib/home-dados'
import { cn } from '@/lib/utils'
import { $ambiente, setAmbiente } from '@/store/ambiente'

const ICONE: Record<Ambiente, string> = {
  empresa: 'organization',
  engenharia: 'code',
  automacao: 'git-branch',
  ia: 'robot',
  estrategico: 'graph',
  administracao: 'gear'
}

/** Formata um indicador. `null` é `—`; `0` é `0`. A diferença é o ponto. */
function valor(v: Indicador): string {
  return v === null ? '—' : String(v)
}

function SecaoComEstado({
  children,
  estado,
  erro,
  mensagemErro,
  mensagemIndisponivel,
  mensagemVazio,
  aoTentarDeNovo,
  rotuloVazio,
  titulo,
  acaoVerTodos,
  rotuloVerTodos
}: {
  acaoVerTodos?: () => void
  aoTentarDeNovo: () => void
  children: React.ReactNode
  erro?: string
  estado: Secao<unknown>['estado']
  mensagemErro: string
  mensagemIndisponivel: string
  mensagemVazio: string
  rotuloVazio: string
  rotuloVerTodos: string
  titulo: string
}) {
  return (
    <section aria-label={titulo} className="flex flex-col gap-2 rounded-xl border border-(--ui-border) p-4">
      <header className="flex items-center justify-between gap-2">
        <h2 className="text-[0.9375rem] font-semibold text-(--ui-text-primary)">{titulo}</h2>
        {acaoVerTodos && estado === 'ok' && (
          <button
            className="cursor-pointer text-[0.75rem] text-(--ui-text-tertiary) hover:text-(--ui-text-primary)"
            onClick={acaoVerTodos}
            type="button"
          >
            {rotuloVerTodos}
          </button>
        )}
      </header>

      {estado === 'carregando' && (
        <p className="text-[0.8125rem] text-(--ui-text-tertiary)" role="status">
          {rotuloVazio}
        </p>
      )}

      {estado === 'vazio' && (
        <div className="flex flex-col items-start gap-2">
          <p className="text-[0.8125rem] text-(--ui-text-secondary)">{mensagemVazio}</p>
          {acaoVerTodos && (
            <Button onClick={acaoVerTodos} size="sm" variant="outline">
              {rotuloVazio}
            </Button>
          )}
        </div>
      )}

      {estado === 'erro' && (
        <div className="flex flex-col items-start gap-2" role="alert">
          <p className="text-[0.8125rem] text-(--ui-text-secondary)">{mensagemErro}</p>
          {erro && <p className="text-[0.75rem] text-(--ui-text-tertiary)">{erro}</p>}
          <Button onClick={aoTentarDeNovo} size="sm" variant="outline">
            {rotuloVerTodos}
          </Button>
        </div>
      )}

      {estado === 'indisponivel' && (
        <p className="text-[0.8125rem] text-(--ui-text-tertiary)">{mensagemIndisponivel}</p>
      )}

      {estado === 'ok' && children}
    </section>
  )
}

function LinhaDeAgente({ agente }: { agente: AgenteDaLista }) {
  return (
    <li className="flex items-center gap-2 py-1">
      <span
        aria-hidden="true"
        className="flex size-7 shrink-0 items-center justify-center rounded-full bg-(--ui-bg-secondary) text-[0.75rem] font-semibold text-(--ui-text-secondary)"
      >
        {inicialDoNome(agente.nome)}
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate text-[0.8125rem] text-(--ui-text-primary)">{agente.nome}</span>
        {agente.missao && (
          <span className="block truncate text-[0.75rem] text-(--ui-text-tertiary)">{agente.missao}</span>
        )}
      </span>
    </li>
  )
}

function LinhaDeProjeto({ projeto, rotulo }: { projeto: ProjetoRow; rotulo: string }) {
  return (
    <li className="flex items-center justify-between gap-2 py-1">
      <span className="min-w-0 flex-1 truncate text-[0.8125rem] text-(--ui-text-primary)">{projeto.nome}</span>
      <span className="shrink-0 rounded-full bg-(--ui-bg-secondary) px-2 py-0.5 text-[0.6875rem] text-(--ui-text-tertiary)">
        {PROJETO_ROTULO[projeto.status] ?? rotulo}
      </span>
    </li>
  )
}

/** O rótulo do status do projeto, vindo do próprio módulo — sem tabela paralela. */
const PROJETO_ROTULO = STATUS_LABEL


/**
 * As AÇÕES RÁPIDAS do topo (r2 do V4).
 *
 * O mockup mostra cinco chips. Cada um aqui **navega para uma rota que existe** e, quando faz
 * sentido, **troca o modo de trabalho antes** — que é a mesma chamada `setAmbiente` da barra. Nenhum
 * deles é decorativo: se a rota não existisse, o chip não existiria.
 *
 * "Criar sistema ou app" e "Gerenciar a empresa" trocam o modo porque a rota destino vive sob ele —
 * levar para `/projetos` com o menu em `empresa` mostraria uma barra que não contém o destino.
 */
interface AcaoRapida {
  ambiente?: Ambiente
  icone: string
  rota: string
  titulo: string
}

function AcoesRapidas({ acoes }: { acoes: AcaoRapida[] }) {
  const navegar = useNavigate()

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {acoes.map(a => (
        <button
          className="flex cursor-pointer items-center gap-1.5 rounded-full border border-(--ui-border) px-3 py-1.5 text-[0.8125rem] text-(--ui-text-secondary) transition-colors hover:text-(--ui-text-primary)"
          data-b3po-foco
          key={a.rota + a.titulo}
          onClick={() => {
            if (a.ambiente) setAmbiente(a.ambiente)

            void navegar(a.rota)
          }}
          type="button"
        >
          <span aria-hidden="true" className={`codicon codicon-${a.icone} text-[0.875rem]`} />
          {a.titulo}
        </button>
      ))}
    </div>
  )
}

/**
 * A SOFIA na home, com os planos REAIS (r2 do V4).
 *
 * O que a Sofia é: a orquestradora. O que a home mostra dela: **os planos que existem**, com o status
 * que o backend reporta. Nada é simulado.
 *
 * Medido em 07/11: a ponte devolve 1 plano (`concluido`). O `status()` da Sofia responde `{ error }`
 * nesta versão — por isso a seção tem estado `erro` próprio e **não** mostra lista vazia quando a
 * leitura falha.
 */
function SecaoSofia({
  planos,
  carregando,
  aoTentarDeNovo,
  aoVerTodos,
  t
}: {
  aoTentarDeNovo: () => void
  aoVerTodos: () => void
  carregando: boolean
  planos: Secao<PlanoResumo>
  t: ReturnType<typeof useI18n>['t']
}) {
  const copy = t.homeB3po

  return (
    <section aria-label={copy.sofiaTitulo} className="flex flex-col gap-2 rounded-xl border border-(--ui-border) p-4">
      <header className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-[0.9375rem] font-semibold text-(--ui-text-primary)">
          <span aria-hidden="true" className="codicon codicon-sparkle text-[0.9375rem]" />
          {copy.sofiaTitulo}
        </h2>
        <button
          className="cursor-pointer text-[0.75rem] text-(--ui-text-tertiary) hover:text-(--ui-text-primary)"
          onClick={aoVerTodos}
          type="button"
        >
          {copy.verTodos}
        </button>
      </header>

      {carregando && (
        <p className="text-[0.8125rem] text-(--ui-text-tertiary)" role="status">
          {copy.carregando}
        </p>
      )}

      {!carregando && planos.estado === 'vazio' && <p className="text-[0.8125rem] text-(--ui-text-secondary)">{copy.sofiaVazio}</p>}

      {!carregando && planos.estado === 'erro' && (
        <div className="flex flex-col items-start gap-2" role="alert">
          <p className="text-[0.8125rem] text-(--ui-text-secondary)">{copy.erroCarregar}</p>
          {planos.erro && <p className="text-[0.75rem] text-(--ui-text-tertiary)">{planos.erro}</p>}
          <Button onClick={aoTentarDeNovo} size="sm" variant="outline">
            {copy.tentarDeNovo}
          </Button>
        </div>
      )}

      {!carregando && planos.estado === 'indisponivel' && (
        <p className="text-[0.8125rem] text-(--ui-text-tertiary)">{copy.indisponivel}</p>
      )}

      {!carregando && planos.estado === 'ok' && (
        <ul className="flex flex-col">
          {planos.itens.slice(0, 3).map(p => (
            <li className="flex items-center justify-between gap-2 py-1" key={p.plano_id}>
              <span className="min-w-0 flex-1 truncate text-[0.8125rem] text-(--ui-text-primary)">{p.objetivo}</span>
              <span className="shrink-0 rounded-full bg-(--ui-bg-secondary) px-2 py-0.5 text-[0.6875rem] text-(--ui-text-tertiary)">
                {p.status} · {p.qtdTarefas}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function HomeB3po() {
  const ativo = useStore($ambiente)
  const { t } = useI18n()
  const copy = t.homeB3po
  const navegar = useNavigate()

  const [agentes, setAgentes] = useState<Secao<AgenteDaLista>>(secaoCarregando)
  const [projetos, setProjetos] = useState<Secao<ProjetoRow>>(secaoCarregando)
  const [planos, setPlanos] = useState<Secao<PlanoResumo>>(secaoCarregando)
  const [tentativa, setTentativa] = useState(0)

  const recarregar = useCallback(() => setTentativa(n => n + 1), [])

  useEffect(() => {
    let vivo = true

    setAgentes(secaoCarregando())
    setProjetos(secaoCarregando())
    setPlanos(secaoCarregando())

    void listarAgentesComEstado().then(r => {
      if (vivo) setAgentes(estadoDaSecao({ erro: r.erro, estado: r.estado, itens: r.agentes }))
    })

    void listarProjetosComEstado().then(r => {
      if (vivo) setProjetos(estadoDaSecao({ erro: r.erro, estado: r.estado, itens: r.projetos }))
    })

    void listarPlanosComEstado().then(r => {
      if (vivo) setPlanos(estadoDaSecao({ erro: r.erro, estado: r.estado, itens: r.planos }))
    })

    return () => {
      vivo = false
    }
  }, [tentativa])

  /*
   * As cinco ações do mockup, cada uma ligada a uma rota que EXISTE.
   *
   * `Criar sistema ou app` e `Gerenciar a empresa` trocam o modo antes de navegar: a rota destino
   * vive sob aquele modo, e chegar em `/projetos` com a barra em `empresa` mostraria um menu que não
   * contém o destino — uma navegação incoerente.
   */
  const acoes = useMemo<AcaoRapida[]>(
    () => [
      { ambiente: 'estrategico', icone: 'graph', rota: '/painel', titulo: copy.acaoAnalisar },
      { ambiente: 'empresa', icone: 'organization', rota: '/empresa', titulo: copy.acaoGerenciarEmpresa },
      { ambiente: 'engenharia', icone: 'code', rota: '/projetos', titulo: copy.acaoCriarSistema },
      { ambiente: 'automacao', icone: 'git-branch', rota: '/automacoes', titulo: copy.acaoAutomatizar },
      { icone: 'tasklist', rota: '/projetos', titulo: copy.acaoPlanejarProjeto }
    ],
    [copy]
  )

  const kpis = useMemo(() => indicadores({ agentes, projetos }), [agentes, projetos])
  const recentes = useMemo(() => (projetos.estado === 'ok' ? projetosPorRecencia(projetos.itens, 3) : []), [projetos])

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 pb-10 text-left">
      <div className="flex flex-col items-center pt-2 text-center">
        <BrandHero alt={BRAND_HERO_ALT} className="mb-2" />

        <h1 className="text-[2rem] font-semibold tracking-tight text-(--ui-text-primary)">
          {copy.tituloA}<span className="text-(--theme-primary)">{copy.tituloB}</span>
        </h1>

        <p className="mt-2 text-[0.9375rem] text-(--ui-text-secondary)">{copy.subtitulo}</p>

        <div className="mt-5 w-full">
          <AcoesRapidas acoes={acoes} />
        </div>
      </div>

      <section aria-label={copy.modosTitulo} className="flex flex-col gap-3">
        <h2 className="text-[0.8125rem] font-semibold tracking-wide text-(--ui-text-tertiary) uppercase">
          {copy.modosTitulo}
        </h2>

        {/*
         * `role="group"` e não `list`: são SEIS botões de escolha, não seis itens de uma lista que se
         * percorre. O rótulo nomeia o grupo para o leitor de tela.
         *
         * Duas colunas por padrão e a terceira só em `xl` — a r269 mediu que a 125% e 150% de zoom o
         * `min-width` do viewport mente e três colunas cortavam os cartões.
         */}
        <div aria-label={copy.escolherModo} className="grid w-full grid-cols-2 gap-3 xl:grid-cols-3" role="group">
          {AMBIENTES.map(ambiente => {
            const selecionado = ambiente === ativo
            const identidade = AMBIENTE_IDENTIDADE[ambiente]

            return (
              <button
                aria-pressed={selecionado}
                className={cn(
                  'group flex flex-col items-start gap-1.5 rounded-xl border px-4 py-4 text-left transition-colors',
                  selecionado
                    ? 'bg-(--ui-bg-secondary) text-(--ui-text-primary)'
                    : 'border-(--ui-border) bg-(--ui-bg-secondary) text-(--ui-text-secondary) hover:text-(--ui-text-primary)'
                )}
                data-b3po-foco
                key={ambiente}
                onClick={() => setAmbiente(ambiente)}
                // A cor do modo é o token `--ambiente-accent` (r103), não um hexadecimal hardcoded
                // aqui: um valor por cartão seria seis fontes de verdade em vez de uma.
                style={selecionado ? { borderColor: identidade.accent } : undefined}
                type="button"
              >
                <span
                  aria-hidden="true"
                  className={`codicon codicon-${ICONE[ambiente]} text-[1.25rem]`}
                  style={{ color: identidade.accent }}
                />
                <span className="text-[0.9375rem] font-medium">{AMBIENTE_LABEL[ambiente]}</span>
                <span className="text-[0.75rem] leading-snug text-(--ui-text-tertiary)">{identidade.descricao}</span>
              </button>
            )
          })}
        </div>
      </section>

      <SecaoSofia
        aoTentarDeNovo={recarregar}
        aoVerTodos={() => void navegar('/sofia')}
        carregando={planos.estado === 'carregando'}
        planos={planos}
        t={t}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <SecaoComEstado
          acaoVerTodos={() => navegar('/agents')}
          aoTentarDeNovo={recarregar}
          erro={agentes.erro}
          estado={agentes.estado}
          mensagemErro={copy.erroCarregar}
          mensagemIndisponivel={copy.indisponivel}
          mensagemVazio={copy.agentesVazio}
          rotuloVerTodos={copy.verTodos}
          rotuloVazio={copy.irParaAgentes}
          titulo={copy.agentesTitulo}
        >
          <ul className="flex flex-col">
            {agentes.itens.slice(0, 4).map(a => (
              <LinhaDeAgente agente={a} key={a.id} />
            ))}
          </ul>
        </SecaoComEstado>

        <SecaoComEstado
          acaoVerTodos={() => navegar('/projetos')}
          aoTentarDeNovo={recarregar}
          erro={projetos.erro}
          estado={projetos.estado}
          mensagemErro={copy.erroCarregar}
          mensagemIndisponivel={copy.indisponivel}
          mensagemVazio={copy.projetosVazio}
          rotuloVerTodos={copy.verTodos}
          rotuloVazio={copy.irParaProjetos}
          titulo={copy.projetosTitulo}
        >
          <ul className="flex flex-col">
            {recentes.map(p => (
              <LinhaDeProjeto key={p.id} projeto={p} rotulo={copy.projetosTitulo} />
            ))}
          </ul>
        </SecaoComEstado>

        <section aria-label={copy.visaoTitulo} className="flex flex-col gap-2 rounded-xl border border-(--ui-border) p-4">
          <h2 className="text-[0.9375rem] font-semibold text-(--ui-text-primary)">{copy.visaoTitulo}</h2>
          <dl className="grid grid-cols-2 gap-3">
            <div>
              <dt className="text-[0.75rem] text-(--ui-text-tertiary)">{copy.kpiAgentes}</dt>
              <dd className="text-[1.25rem] font-semibold text-(--ui-text-primary)">{valor(kpis.agentes)}</dd>
            </div>
            <div>
              <dt className="text-[0.75rem] text-(--ui-text-tertiary)">{copy.kpiProjetosAtivos}</dt>
              <dd className="text-[1.25rem] font-semibold text-(--ui-text-primary)">{valor(kpis.projetosAtivos)}</dd>
            </div>
            <div>
              <dt className="text-[0.75rem] text-(--ui-text-tertiary)">{copy.kpiProjetosConcluidos}</dt>
              <dd className="text-[1.25rem] font-semibold text-(--ui-text-primary)">{valor(kpis.projetosConcluidos)}</dd>
            </div>
          </dl>
          <p className="text-[0.6875rem] text-(--ui-text-tertiary)">{copy.kpiNota}</p>
        </section>
      </div>
    </div>
  )
}
