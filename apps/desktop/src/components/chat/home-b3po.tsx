/**
 * A home do B-3PO (r268).
 *
 * O QUE A REFERÊNCIA VISUAL MOSTRA, E O QUE HAVIA
 *
 * A missão final traz uma captura: **mascote ao centro, "Bem-vindo ao B-3PO", uma linha de
 * posicionamento, e SEIS CARTÕES de ambiente** — Empresa, Engenharia, Automação, IA e
 * Agentes, Estratégico, Administração.
 *
 * O que existia na tela vazia era o `Intro` do Hermes: o robô e uma frase rotativa em inglês
 * ("What are we moving today?"). **É uma boa tela para um agente de código** e a tela errada
 * para um produto de gestão — ela não diz o que o produto FAZ nem por onde começar.
 *
 * O QUE ESTE COMPONENTE É, E O QUE NÃO É
 *
 * - **É a porta de entrada do produto**: a marca, a frase que diz o que ele é, e a escolha do
 *   ambiente como primeiro ato.
 * - **Não é uma segunda navegação.** Os cartões chamam `setAmbiente`, que é o MESMO store do
 *   seletor da barra lateral (r267). Escolher aqui muda a barra; escolher na barra muda a
 *   seleção aqui. **Uma fonte de verdade, dois lugares de acesso** — e é por isso que os dois
 *   mostram o mesmo cartão aceso.
 * - **Não cria tela, rota nem dado.** Cada cartão só nomeia um ambiente que já existe.
 *
 * POR QUE O CARTÃO DO AMBIENTE ATIVO É DIFERENTE
 *
 * Na referência, "Empresa" está aceso com borda e marca de seleção. **Não é decoração**: é a
 * resposta a "onde eu estou", que numa home é a primeira pergunta. O `aria-pressed` diz o
 * mesmo a quem usa leitor de tela.
 */

import { useStore } from '@nanostores/react'

import { BrandHero, BRAND_HERO_ALT } from '@/components/chat/brand-hero'
import { AMBIENTE_LABEL, AMBIENTES, type Ambiente } from '@/lib/ambiente'
import { cn } from '@/lib/utils'
import { $ambiente, setAmbiente } from '@/store/ambiente'

/**
 * O que cada ambiente é, numa linha.
 *
 * **A frase é do vocabulário do dono, não do código**: "Operação e gestão do negócio" diz o
 * que a pessoa vai FAZER ali; "módulos de CRM, vendas e financeiro" diria o que o sistema tem
 * — e a segunda é a que ninguém lê.
 */
const DESCRICAO: Record<Ambiente, string> = {
  empresa: 'Operação e gestão do negócio',
  engenharia: 'Software, projetos e desenvolvimento',
  automacao: 'Fluxos, integrações e execuções',
  ia: 'Sofia, bots, equipes e orquestração',
  estrategico: 'Análises, indicadores e decisões',
  administracao: 'Organizações, usuários e segurança'
}

/**
 * O ícone de cada ambiente.
 *
 * **Codicon, como o resto da barra lateral** — a mesma família de ícones do produto, não um
 * conjunto novo desenhado só para esta tela.
 */
const ICONE: Record<Ambiente, string> = {
  empresa: 'organization',
  engenharia: 'code',
  automacao: 'git-branch',
  ia: 'robot',
  estrategico: 'graph',
  administracao: 'gear'
}

function IconeDoAmbiente({ nome }: { nome: string }) {
  return <span aria-hidden="true" className={`codicon codicon-${nome} text-[1.375rem]`} />
}

export function HomeB3po() {
  const ativo = useStore($ambiente)

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col items-center px-6 pb-10 text-center">
      <BrandHero alt={BRAND_HERO_ALT} className="mb-2" />

      <h1 className="text-[2rem] font-semibold tracking-tight text-(--ui-text-primary)">
        Bem-vindo ao <span className="text-(--theme-primary)">B-3PO</span>
      </h1>

      <p className="mt-2 mb-8 text-[0.9375rem] text-(--ui-text-secondary)">
        Sua plataforma de gestão, automação e inteligência empresarial.
      </p>

      {/*
       * `role="group"` e não `list`: são SEIS botões de escolha, não seis itens de uma lista
       * que se percorre. O rótulo nomeia o grupo para o leitor de tela.
       *
       * r269 — O GRID MUDOU POR CAUSA DO ZOOM
       *
       * Medido: em 1366x768 a 100% os 6 cartões cabiam; **a 125% dois ficavam cortados e a
       * 150%, quatro**. O `sm:grid-cols-3` dispara pelo `min-width` do VIEWPORT, e o zoom
       * reduz o viewport efetivo — então o layout achava que ainda havia espaço para três
       * colunas com o conteúdo já ampliado.
       *
       * **Duas colunas viram o padrão** e a terceira só entra em `xl` (1280px de viewport
       * efetivo). A referência mostra 3x2; ela continua sendo 3x2 numa tela larga — e vira
       * 2x3 onde três não cabem, que é o que "não cortar" significa.
       */}
      <div aria-label="Escolher ambiente" className="grid w-full grid-cols-2 gap-3 xl:grid-cols-3" role="group">
        {AMBIENTES.map(ambiente => {
          const selecionado = ambiente === ativo

          return (
            <button
              aria-pressed={selecionado}
              className={cn(
                'group flex flex-col items-center gap-2 rounded-xl border px-4 py-5 transition-colors',
                selecionado
                  ? 'border-(--theme-primary) bg-(--theme-accent-soft) text-(--ui-text-primary)'
                  : 'border-(--ui-border) bg-(--ui-bg-secondary) text-(--ui-text-secondary) hover:border-(--theme-primary) hover:text-(--ui-text-primary)'
              )}
              key={ambiente}
              onClick={() => setAmbiente(ambiente)}
              type="button"
            >
              <IconeDoAmbiente nome={ICONE[ambiente]} />
              <span className="text-[0.9375rem] font-medium">{AMBIENTE_LABEL[ambiente]}</span>
              <span className="text-[0.75rem] leading-snug text-(--ui-text-tertiary)">{DESCRICAO[ambiente]}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
