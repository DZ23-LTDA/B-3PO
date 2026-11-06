// A tela do ambiente (r124 do GOAL V2).
//
// O QUE ESTA TELA E - E O QUE ELA NAO E
//
// Ela **mostra** os dois ambientes, **diz o que cada um contem**, e **troca** a preferencia.
//
// **Ela NAO filtra a barra lateral**, e a razao esta medida: quem desenha a barra e
// `app/chat/sidebar/index.tsx` - **codigo do upstream**. O plugin `b3po-nav` **contribui** a lista; o host a
// desenha **inteira**. Filtrar dali exigiria mexer no host, e o §22 nao autoriza mudar contrato de terceiro
// para acomodar uma preferencia de apresentacao.
//
// **Entao a tela diz isso.** Uma tela que troca um valor e nao muda nada visivel seria pior que nao existir:
// a pessoa clicaria, nada aconteceria, e ela concluiria que o produto esta quebrado.
//
// O QUE ELA FAZ DE UTIL HOJE
//
// 1. **Diz o que cada ambiente tem** - a pessoa descobre o que o outro lado contem sem trocar para ver.
// 2. **Guarda a escolha** - o valor fica em `$ambiente`, e e o que o dia em que o host filtrar vai ler.
// 3. **Diz o que falta**, em vez de fingir que ja filtra.

import { useStore } from '@nanostores/react'
import { useMemo } from 'react'

import { AMBIENTE_LABEL, AMBIENTES, foraDoAmbiente, gruposDoAmbiente, type Ambiente } from '@/lib/ambiente'
import { MODULOS_DE_ENGENHARIA, proporcaoDeOrigem } from '@/lib/engenharia'
import { MODULOS_DO_PRODUTO } from '@/plugins/b3po-nav/plugin'
import { $ambiente, setAmbiente } from '@/store/ambiente'

/** A forma comum às duas fontes — o menu do produto e o mapa da engenharia. */
interface ItemVisivel {
  grupo: string
  label: string
  path: string
  origem?: 'produto' | 'upstream'
}

export function AmbienteScreen() {
  const ativo = useStore($ambiente)

  // Os módulos de cada ambiente.
  //
  // **Empresa** vem do MENU do produto (`b3po-nav`), filtrado por `gruposDoAmbiente` — a regra da r121.
  //
  // **Engenharia** vem do MAPA (`lib/engenharia`, r130), porque o menu do produto é só da Empresa: os 23
  // módulos dele são todos de lá. Sem o mapa, o segundo ambiente ficaria vazio — que era o estado medido na
  // r130 antes de ele existir.
  const porAmbiente = useMemo<Record<Ambiente, ItemVisivel[]>>(
    () => ({
      empresa: MODULOS_DO_PRODUTO.filter(m => gruposDoAmbiente('empresa').includes(m.grupo)),
      engenharia: [...MODULOS_DE_ENGENHARIA],
      /*
       * r265: os quatro ambientes novos.
       *
       * **Todos vêm do MENU do produto filtrado por grupo** — nenhum inventa rota. É a mesma
       * regra do `empresa`: um ambiente é um recorte do que já existe, não um segundo produto.
       * `engenharia` continua sendo o único com mapa próprio, porque metade das telas dele são
       * do Hermes e o menu do produto não as conhece.
       */
      automacao: MODULOS_DO_PRODUTO.filter(m => gruposDoAmbiente('automacao').includes(m.grupo)),
      ia: MODULOS_DO_PRODUTO.filter(m => gruposDoAmbiente('ia').includes(m.grupo)),
      estrategico: MODULOS_DO_PRODUTO.filter(m => gruposDoAmbiente('estrategico').includes(m.grupo)),
      administracao: MODULOS_DO_PRODUTO.filter(m => gruposDoAmbiente('administracao').includes(m.grupo))
    }),
    []
  )

  // `foraDoAmbiente` só sabe ler o menu do produto — chamá-lo para engenharia diria "23 fora", que é verdade
  // para o MENU e não para o AMBIENTE. A frase abaixo usa a contagem certa para cada lado.
  const escondidos =
    ativo === 'empresa' ? foraDoAmbiente(MODULOS_DO_PRODUTO, ativo) : `${MODULOS_DE_ENGENHARIA.length} do mapa`

  const proporcao = proporcaoDeOrigem()

  return (
    <main aria-label="Ambiente de trabalho" className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-(--ui-text-primary)">Ambiente de trabalho</h1>
        <p className="max-w-2xl text-sm text-(--ui-text-secondary)">
          O ambiente muda <strong>o que a barra lateral mostra</strong>. Ele nao muda dado, nao muda permissao e
          nao esconde tela: as rotas continuam respondendo e o que esta fora continua acessivel pelo endereco.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {AMBIENTES.map(a => {
          const selecionado = a === ativo

          return (
            <button
              aria-pressed={selecionado}
              className={`flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors ${
                selecionado
                  ? 'border-(--ui-accent) bg-(--ui-surface-raised)'
                  : 'border-(--ui-border) hover:bg-(--ui-surface-hover)'
              }`}
              key={a}
              onClick={() => setAmbiente(a)}
              type="button"
            >
              <span className="flex w-full items-center justify-between">
                <span className="text-base font-medium text-(--ui-text-primary)">{AMBIENTE_LABEL[a]}</span>
                {selecionado && <span className="text-xs text-(--ui-accent)">ativo</span>}
              </span>
              <span className="text-xs text-(--ui-text-tertiary)">
                {gruposDoAmbiente(a).length} grupos - {porAmbiente[a].length} modulos
              </span>
              <span className="text-sm text-(--ui-text-secondary)">{gruposDoAmbiente(a).join(' - ')}</span>
            </button>
          )
        })}
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-(--ui-text-primary)">O que este ambiente tem</h2>
        <ul aria-label={`Modulos do ambiente ${AMBIENTE_LABEL[ativo]}`} className="flex flex-col gap-1">
          {porAmbiente[ativo].map(m => (
            <li className="flex items-center gap-2 text-sm text-(--ui-text-secondary)" key={m.path}>
              <span className="w-28 shrink-0 text-(--ui-text-tertiary)">{m.grupo}</span>
              <span>{m.label}</span>
              {/*
                A ORIGEM, à vista. Cinco dos onze módulos de Engenharia são do produto; seis são do runtime
                do Hermes. Esconder isso faria o Modo Engenharia parecer maior do que é — e foi o §13:452 que
                pediu "arquitetura, código, testes, CI/CD, artefatos", coisas que o runtime já tinha.
              */}
              {m.origem === 'upstream' && (
                <span className="ml-auto rounded bg-(--ui-surface-sunken) px-1.5 py-0.5 text-[0.65rem] text-(--ui-text-tertiary)">
                  runtime
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <aside className="rounded-lg border border-(--ui-border) bg-(--ui-surface-sunken) p-4">
        <h2 className="text-sm font-medium text-(--ui-text-primary)">O que ainda nao muda</h2>
        <p className="mt-1 text-sm text-(--ui-text-secondary)">
          A barra lateral continua mostrando <strong>todos os {MODULOS_DO_PRODUTO.length} modulos</strong>
          {escondidos ? ` (${escondidos})` : ''}. O filtro por ambiente depende do componente de navegacao, que e
          do upstream - ate la, a escolha fica guardada e as telas do outro ambiente seguem acessiveis pelo
          endereco.
        </p>
      </aside>
    </main>
  )
}
