// Agentes departamentais (rodada 142).
//
// A AUDITORIA DA r141
//
// O GOAL pede onze agentes (Business Manager, Sales, Support, Inventory, Finance, Scheduling, Marketing, HR,
// Operations, After-Sales, Analytics) e diz que "os agentes devem colaborar por tarefas rastreáveis". Nenhum
// deles existia como configuração.
//
// O QUE ESTE ARQUIVO NÃO FAZ
//
// Não chama modelo, não cria perfil, não instala ferramenta. Declara **quem são** e **até onde podem ir**.
// Criar o perfil é trabalho do runtime; decidir o teto é trabalho de produto — e é aqui.
//
// O TETO DE AUTONOMIA É POR DOMÍNIO, NÃO POR AGENTE
//
// Um agente de vendas pode FECHAR uma venda e NÃO pode conceder desconto acima do limite. Se o teto fosse um
// número por agente, uma dessas duas capacidades herdaria o teto da outra. Por isso cada capacidade carrega o
// seu.
//
// NÍVEIS (do GOAL, item 23)
//
//   READ               consultar
//   RECOMMEND          recomendar
//   PREPARE            preparar a ação para aprovação humana
//   EXECUTE_ALLOWED    executar o que já foi autorizado
//   SUPERVISED_AUTONOMY operar continuamente dentro de limites
//
// Os dois primeiros são seguros por construção. `PREPARE` é o teto de tudo que afeta dinheiro, pessoa ou
// Fisco — porque nesses três, errar não se desfaz.

export const NIVEIS = ['READ', 'RECOMMEND', 'PREPARE', 'EXECUTE_ALLOWED', 'SUPERVISED_AUTONOMY'] as const

export type Nivel = (typeof NIVEIS)[number]

/** Ordem numérica, para comparar níveis sem decorar a lista. */
export function ordemDoNivel(nivel: Nivel): number {
  return NIVEIS.indexOf(nivel)
}

/** Uma capacidade concreta, com o teto que lhe cabe. */
export interface Capacidade {
  /** O que o agente faz, em uma frase que o operador lê. */
  descricao: string
  /** Domínio dono da capacidade — o mesmo nome usado pelos stores. */
  dominio: string
  nivel: Nivel
}

export interface AgenteDepartamental {
  capacidades: readonly Capacidade[]
  /** Uma frase: o que este agente existe para fazer. */
  missao: string
  nome: string
  /** Fonte canônica de dados que o agente lê. Nunca tem banco próprio. */
  le: readonly string[]
  id: string
  /** O que este agente NUNCA faz sozinho, e por quê. Vazio é legítimo. */
  nuncaSozinho?: readonly string[]
}

/**
 * Os onze agentes do GOAL.
 *
 * `le` lista os domínios — não os arquivos. Um agente que lesse arquivo por caminho criaria dependência da
 * organização do disco, e a regra do produto é que os agentes usam os **mesmos serviços** da empresa.
 */
export const AGENTES: readonly AgenteDepartamental[] = [
  {
    capacidades: [
      { descricao: 'resumir o dia da empresa', dominio: 'analytics', nivel: 'READ' },
      { descricao: 'recomendar prioridade entre pendências', dominio: 'analytics', nivel: 'RECOMMEND' },
      { descricao: 'preparar pauta de reunião a partir dos indicadores', dominio: 'documents', nivel: 'PREPARE' }
    ],
    id: 'business_manager',
    nome: 'Gerente de Negócio',
    le: ['analytics', 'sales', 'finance', 'inventory', 'scheduling', 'desk'],
    missao: 'Olhar a empresa inteira e dizer o que merece atenção hoje.',
    nuncaSozinho: ['alterar meta ou orçamento']
  },
  {
    capacidades: [
      { descricao: 'qualificar lead', dominio: 'crm', nivel: 'EXECUTE_ALLOWED' },
      { descricao: 'montar proposta a partir do catálogo', dominio: 'sales', nivel: 'PREPARE' },
      { descricao: 'registrar pedido', dominio: 'sales', nivel: 'EXECUTE_ALLOWED' },
      { descricao: 'conceder desconto acima do limite', dominio: 'sales', nivel: 'PREPARE' }
    ],
    id: 'sales',
    nome: 'Agente de Vendas',
    le: ['crm', 'catalog', 'sales', 'inventory'],
    missao: 'Transformar interessado em pedido, dentro da política de preço.',
    nuncaSozinho: ['desconto acima do limite configurado']
  },
  {
    capacidades: [
      { descricao: 'classificar e resumir ticket', dominio: 'desk', nivel: 'EXECUTE_ALLOWED' },
      { descricao: 'responder dentro do SLA', dominio: 'desk', nivel: 'EXECUTE_ALLOWED' },
      { descricao: 'escalar exceção para humano', dominio: 'desk', nivel: 'EXECUTE_ALLOWED' }
    ],
    id: 'support',
    nome: 'Agente de Atendimento',
    le: ['desk', 'crm', 'documents'],
    missao: 'Responder rápido o que tem resposta, e escalar o resto sem demora.'
  },
  {
    capacidades: [
      { descricao: 'detectar item abaixo do mínimo', dominio: 'inventory', nivel: 'READ' },
      { descricao: 'comparar fornecedores por preço', dominio: 'purchases', nivel: 'RECOMMEND' },
      { descricao: 'preparar pedido de compra', dominio: 'purchases', nivel: 'PREPARE' },
      { descricao: 'ajustar saldo por inventário', dominio: 'inventory', nivel: 'PREPARE' }
    ],
    id: 'inventory',
    nome: 'Agente de Estoque',
    le: ['inventory', 'catalog', 'purchases'],
    missao: 'Nunca deixar faltar, e nunca comprar sem motivo.',
    nuncaSozinho: ['ajustar saldo sem contagem']
  },
  {
    capacidades: [
      { descricao: 'categorizar lançamento', dominio: 'finance', nivel: 'EXECUTE_ALLOWED' },
      { descricao: 'alertar vencimento próximo', dominio: 'finance', nivel: 'EXECUTE_ALLOWED' },
      { descricao: 'conciliar extrato com lançamentos', dominio: 'finance', nivel: 'PREPARE' },
      { descricao: 'efetuar pagamento', dominio: 'finance', nivel: 'PREPARE' }
    ],
    id: 'finance',
    nome: 'Agente Financeiro',
    le: ['finance', 'sales', 'purchases'],
    missao: 'Saber o que entra, o que sai e o que está atrasado — sem mover dinheiro.',
    nuncaSozinho: ['pagamento', 'transferência', 'estorno']
  },
  {
    capacidades: [
      { descricao: 'encontrar horário livre', dominio: 'scheduling', nivel: 'READ' },
      { descricao: 'confirmar agendamento existente', dominio: 'scheduling', nivel: 'EXECUTE_ALLOWED' },
      { descricao: 'criar agendamento', dominio: 'scheduling', nivel: 'EXECUTE_ALLOWED' },
      { descricao: 'reagendar fora da política', dominio: 'scheduling', nivel: 'PREPARE' }
    ],
    id: 'scheduling',
    nome: 'Agente de Agenda',
    le: ['scheduling', 'services', 'crm'],
    missao: 'Encaixar o cliente sem estourar a agenda de ninguém.'
  },
  {
    capacidades: [
      { descricao: 'montar segmento de clientes', dominio: 'marketing', nivel: 'READ' },
      { descricao: 'escrever conteúdo de campanha', dominio: 'marketing', nivel: 'PREPARE' },
      { descricao: 'agendar publicação', dominio: 'marketing', nivel: 'PREPARE' },
      { descricao: 'publicar em conta conectada', dominio: 'marketing', nivel: 'PREPARE' }
    ],
    id: 'marketing',
    nome: 'Agente de Marketing',
    le: ['marketing', 'crm', 'sales'],
    missao: 'Falar com quem tem motivo para ouvir, e medir se funcionou.',
    nuncaSozinho: ['publicação pública', 'mensagem em massa']
  },
  {
    capacidades: [
      { descricao: 'consultar férias e vencimentos', dominio: 'hr', nivel: 'READ' },
      { descricao: 'preparar aviso de férias', dominio: 'hr', nivel: 'PREPARE' },
      { descricao: 'organizar documento de admissão', dominio: 'hr', nivel: 'PREPARE' }
    ],
    id: 'hr',
    nome: 'Agente de RH',
    le: ['hr', 'documents'],
    missao: 'Manter o RH em dia sem decidir sobre pessoas.',
    nuncaSozinho: ['contratar', 'demitir', 'definir salário', 'avaliar desempenho']
  },
  {
    capacidades: [
      { descricao: 'acompanhar pendências entre departamentos', dominio: 'tasks', nivel: 'READ' },
      { descricao: 'criar tarefa de acompanhamento', dominio: 'tasks', nivel: 'EXECUTE_ALLOWED' },
      { descricao: 'cobrar responsável por tarefa atrasada', dominio: 'tasks', nivel: 'EXECUTE_ALLOWED' }
    ],
    id: 'operations',
    nome: 'Agente de Operações',
    le: ['tasks', 'desk', 'scheduling', 'inventory'],
    missao: 'Nada parado sem dono. Nada atrasado sem aviso.'
  },
  {
    capacidades: [
      { descricao: 'identificar cliente insatisfeito', dominio: 'aftersales', nivel: 'READ' },
      { descricao: 'abrir pesquisa de satisfação', dominio: 'aftersales', nivel: 'EXECUTE_ALLOWED' },
      { descricao: 'preparar oferta de recompra', dominio: 'aftersales', nivel: 'PREPARE' }
    ],
    id: 'after_sales',
    nome: 'Agente de Pós-venda',
    le: ['aftersales', 'crm', 'sales', 'desk'],
    missao: 'Descobrir quem saiu insatisfeito antes que ele fale mal.',
    nuncaSozinho: ['oferecer recompensa financeira']
  },
  {
    capacidades: [
      { descricao: 'responder pergunta sobre indicadores', dominio: 'analytics', nivel: 'READ' },
      { descricao: 'produzir relatório do período', dominio: 'analytics', nivel: 'READ' },
      { descricao: 'apontar tendência fora do padrão', dominio: 'analytics', nivel: 'RECOMMEND' }
    ],
    id: 'analytics',
    nome: 'Agente de Análise',
    le: ['analytics', 'sales', 'finance', 'inventory', 'desk', 'scheduling'],
    missao: 'Responder com número, e dizer quando o número não é suficiente.'
  }
]

/** Agente por id, ou `undefined`. Um id errado não deve virar "o primeiro da lista". */
export function agentePorId(id: string): AgenteDepartamental | undefined {
  return AGENTES.find(a => a.id === id)
}

/**
 * O agente pode executar esta capacidade no nível pedido?
 *
 * Comparação por ORDEM, não por igualdade: quem tem `EXECUTE_ALLOWED` também pode `READ`. Um agente que só
 * pudesse exatamente o seu nível não conseguiria nem consultar o que precisa para decidir.
 */
export function podeExecutar(agente: AgenteDepartamental, dominio: string, acao: string, nivel: Nivel): boolean {
  return agente.capacidades.some(
    c => c.dominio === dominio && c.descricao.includes(acao) && ordemDoNivel(c.nivel) >= ordemDoNivel(nivel)
  )
}

/** Nível máximo que o agente tem num domínio, ou `null` se não atua ali. */
export function tetoNoDominio(agente: AgenteDepartamental, dominio: string): Nivel | null {
  const doDominio = agente.capacidades.filter(c => c.dominio === dominio)

  if (doDominio.length === 0) return null

  return doDominio.reduce<Nivel>(
    (maior, c) => (ordemDoNivel(c.nivel) > ordemDoNivel(maior) ? c.nivel : maior),
    'READ'
  )
}
