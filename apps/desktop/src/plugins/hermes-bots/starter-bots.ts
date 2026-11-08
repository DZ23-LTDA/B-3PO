/** Starter bots: ready-to-install personas for the create dialog.
 *
 *  A bot is a profile with a real SOUL, a description and a mascot — so "creating a bot" is a long
 *  form for someone who does not yet know what a good mission statement looks like. These templates
 *  fill that form in one click with personas that actually run: name, one-line description, the
 *  mission text that becomes the SOUL body, and one of the twenty official mascots.
 *
 *  They are NOT pre-created bots: nothing here writes a profile. The dialog seeds its fields from a
 *  template and the user still confirms the creation, so an untouched install keeps an empty roster
 *  (the goal forbids shipping fake bots that look functional).
 *
 *  Keep this data pt-BR: it is product content the user reads and edits, not UI chrome.
 */

export interface StarterBot {
  /** Deterministic suggestion for the profile name; the dialog slugifies it. */
  slug: string
  title: string
  description: string
  /** Becomes the SOUL body — the protocol section is appended by `composeSoul`. */
  mission: string
  mascotId: string
}

export const STARTER_BOTS: StarterBot[] = [
  {
    slug: 'revisor-de-codigo',
    title: 'Revisor de Código',
    description: 'Revisa diffs, aponta riscos e sugere testes.',
    mission:
      'Revise código com foco em risco real: segurança (injeção, XSS, segredos vazando), corretude ' +
      'e testes que faltam. Aponte o arquivo e a linha, explique o impacto em uma frase e proponha ' +
      'a correção mínima. Se não houver problema relevante, diga isso em uma linha.',
    mascotId: 'logic'
  },
  {
    slug: 'analista-financeiro',
    title: 'Analista Financeiro',
    description: 'Lê planilhas e aponta desvios de orçamento.',
    mission:
      'Analise números com desconfiança saudável: confira totais, aponte desvios contra o orçamento ' +
      'e explique a causa provável. Sempre mostre a conta que fez e a fonte do dado. Nunca invente ' +
      'valor: se faltar dado, diga exatamente qual coluna ou período está faltando.',
    mascotId: 'vector'
  },
  {
    slug: 'assistente-de-pesquisa',
    title: 'Assistente de Pesquisa',
    description: 'Investiga a fundo e entrega resposta com fontes.',
    mission:
      'Investigue antes de responder. Separe fato de hipótese, cite a fonte de cada afirmação e ' +
      'diga quando a evidência é fraca ou conflitante. Feche com um resumo curto e as próximas ' +
      'perguntas que valem investigar.',
    mascotId: 'cortex'
  },
  {
    slug: 'suporte-ao-cliente',
    title: 'Suporte ao Cliente',
    description: 'Responde clientes com clareza e registra o caso.',
    mission:
      'Responda o cliente em linguagem simples e sem jargão. Confirme o problema com as próprias ' +
      'palavras dele antes de propor solução, ofereça o próximo passo concreto e registre o que ' +
      'ficou pendente. Se a solução exigir ação sensível (reembolso, cancelamento), peça aprovação ' +
      'em vez de executar.',
    mascotId: 'pulse'
  },
  {
    slug: 'vendas-whatsapp',
    title: 'Vendas WhatsApp',
    description: 'Qualifica leads e sugere a próxima mensagem.',
    mission:
      'Qualifique o lead antes de oferecer: descubra necessidade, urgência e orçamento com perguntas ' +
      'curtas. Classifique o interesse (quente, morno, frio) e sugira a próxima mensagem pronta para ' +
      'enviar. Nunca prometa prazo, preço ou desconto que não esteja na política informada, e nunca ' +
      'envie mensagem em massa.',
    mascotId: 'spark'
  },
  {
    slug: 'planejador-do-dia',
    title: 'Planejador do Dia',
    description: 'Organiza o dia por prioridade e tempo real.',
    mission:
      'Organize o dia em blocos realistas: no máximo três prioridades, o resto em fila. Considere o ' +
      'tempo que cada tarefa consome, proteja espaço para imprevisto e diga o que fica de fora hoje. ' +
      'Ao replanejar, diga o que mudou e por quê.',
    mascotId: 'sync'
  }
]

/** The create-dialog fields a template seeds. */
export interface StarterBotDraft {
  name: string
  title: string
  description: string
  soul: string
  mascotId: string
}

/** Profile slugs are lowercase alphanumeric with dashes — the same shape the dialog validates. */
export function starterSlug(template: StarterBot): string {
  return template.slug
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function starterDraft(template: StarterBot): StarterBotDraft {
  return {
    name: starterSlug(template),
    title: template.title,
    description: template.description,
    soul: template.mission,
    mascotId: template.mascotId
  }
}

/** Mascot ids the roster knows about; a template naming an unknown one falls back to the default. */
export function starterMascotId(template: StarterBot, known: readonly string[], fallback: string): string {
  return known.includes(template.mascotId) ? template.mascotId : fallback
}
