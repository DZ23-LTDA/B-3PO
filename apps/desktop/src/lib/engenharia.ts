// OS MODULOS DO AMBIENTE ENGENHARIA (r130 do GOAL V2).
//
// O QUE FALTAVA
//
// A r121 definiu os dois ambientes e os grupos de cada um. A r122 deu `grupo` aos 23 modulos - e TODOS os 23
// sao do ambiente EMPRESA.
//
// Resultado medido: `gruposDoAmbiente('engenharia')` tem 4 grupos, e **nenhum modulo do produto cai neles**. O
// ambiente Engenharia existia como regra e como preferencia, e **nao tinha conteudo**.
//
// O QUE ESTE ARQUIVO FAZ
//
// Mapeia, para os grupos do ambiente Engenharia, as rotas que JA EXISTEM. Ele nao cria tela, nem rota, nem
// dado - so diz **onde estao** as coisas que servem a quem constroi.
//
// POR QUE TODAS SAO DO UPSTREAM
//
// `/artifacts`, `/cron`, `/agents`, `/capabilities` e `/webhooks` sao do Hermes. **O produto nao escreveu
// nenhuma delas** - e nao deve: o §13:452 pede "arquitetura, codigo, testes, CI/CD, artefatos", e o runtime ja
// tem os quatro.
//
// **O que o produto acrescenta e o AGRUPAMENTO**: hoje elas sao ilhas no menu do nucleo; aqui elas viram uma
// arvore de trabalho.
//
// O QUE ELE NAO FAZ, E O §22 MANDA DIZER
//
// **Ele nao filtram a barra lateral.** O host que desenha a sidebar e do upstream (medido na r123/r124). Este
// arquivo entrega o MAPA, que e o que a tela `/ambiente` mostra e o que a barra vai usar quando o host permitir.

import type { Ambiente } from './ambiente'

export interface ModuloDeEngenharia {
  grupo: string
  label: string
  path: string
  /** O que a rota faz, em uma linha. Vai na tela; nao e decoracao. */
  oQueE: string
  /** `upstream` = veio do Hermes; `produto` = escrito pelo B-3PO. */
  origem: 'produto' | 'upstream'
}

/**
 * O mapa do ambiente Engenharia.
 *
 * **Sao 4 grupos porque o §13:452 lista 8 itens e 3 deles sao a mesma tela vista de angulos diferentes**
 * (a r121 ja dizia isso). `artifacts` e o que o CI/CD produziu; `cron` e a execucao agendada; `capabilities` e
 * o que o agente sabe fazer.
 */
export const MODULOS_DE_ENGENHARIA: readonly ModuloDeEngenharia[] = [
  // VISAO GERAL - o que ja e comum aos dois ambientes.
  {
    grupo: 'Visão geral',
    label: 'Painel',
    oQueE: 'O estado do negocio e do trabalho.',
    origem: 'produto',
    path: '/painel'
  },
  {
    grupo: 'Visão geral',
    label: 'Busca',
    oQueE: 'Encontrar um modulo pelo nome ou pelo que ele faz.',
    origem: 'produto',
    path: '/busca'
  },

  // CONSTRUCAO - o que se cria
  {
    grupo: 'Construção',
    label: 'Projetos',
    oQueE: 'O trabalho com objetivo e criterio de aceite.',
    origem: 'produto',
    path: '/projetos'
  },
  {
    grupo: 'Construção',
    label: 'Trabalhos',
    oQueE: 'O que precisa ser feito, com prazo e dono.',
    origem: 'produto',
    path: '/trabalhos'
  },
  {
    grupo: 'Construção',
    label: 'Agentes',
    oQueE: 'Quem executa: os subagentes do runtime.',
    origem: 'upstream',
    path: '/agents'
  },
  {
    grupo: 'Construção',
    label: 'Automações',
    oQueE: 'O que roda sem ninguem pedir.',
    origem: 'produto',
    path: '/automacoes'
  },

  // QUALIDADE - o que se prova
  {
    grupo: 'Qualidade',
    label: 'Artefatos',
    oQueE: 'O que cada execucao produziu.',
    origem: 'upstream',
    path: '/artifacts'
  },
  {
    grupo: 'Qualidade',
    label: 'Capacidades',
    oQueE: 'O que o agente sabe fazer, e o que falta.',
    origem: 'upstream',
    path: '/capabilities'
  },

  // CONFIGURACAO - como o ambiente e
  {
    grupo: 'Configuração',
    label: 'Agendamentos',
    oQueE: 'O que roda em horario marcado.',
    origem: 'upstream',
    path: '/cron'
  },
  {
    grupo: 'Configuração',
    label: 'Webhooks',
    oQueE: 'O que chega de fora.',
    origem: 'upstream',
    path: '/webhooks'
  },
  {
    grupo: 'Configuração',
    label: 'Documentos',
    oQueE: 'O que registra o trabalho.',
    origem: 'produto',
    path: '/documentos'
  }
]

/** Os modulos de um ambiente - o de engenharia tem mapa; o de empresa usa o menu do produto. */
export function modulosDeEngenharia(): readonly ModuloDeEngenharia[] {
  return MODULOS_DE_ENGENHARIA
}

/**
 * Quantos sao de cada origem.
 *
 * **Nao e curiosidade**: diz o quanto do ambiente Engenharia e **produto** e o quanto e **runtime**. Hoje e
 * 5 a 6 - e essa proporcao e a resposta honesta para "o Modo Engenharia existe?".
 */
export function proporcaoDeOrigem(): Record<ModuloDeEngenharia['origem'], number> {
  return MODULOS_DE_ENGENHARIA.reduce(
    (acc, m) => ({ ...acc, [m.origem]: acc[m.origem] + 1 }),
    { produto: 0, upstream: 0 } as Record<ModuloDeEngenharia['origem'], number>
  )
}

/** O ambiente a que este mapa pertence. Existe para o consumidor nao ter que saber o nome. */
export const AMBIENTE_DO_MAPA: Ambiente = 'engenharia'
