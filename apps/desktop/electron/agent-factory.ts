// O Agent Factory (r82 do GOAL V2).
//
// O QUE O §12 PEDE
//
// *"Agent Factory reutiliza agentes, skills, providers e ferramentas existentes, configurando especialização,
// escopo, permissão, ferramentas e contexto."*
//
// E a regra que define o comportamento:
//
// *"**Não criar bots duplicados para cada tarefa.**"*
//
// O QUE JÁ EXISTIA
//
// `agent-roster.ts` (r142) declara **os onze agentes** e o teto de cada capacidade por domínio. `agent-tools`
// declara as ferramentas. Faltava **a decisão de contratar**: dada uma necessidade, **reaproveitar quem já
// existe ou criar alguém novo?**
//
// A DECISÃO, E ELA É A MAIORIA DAS VEZES "REAPROVEITAR"
//
// A resposta padrão é **o agente que já cobre aquele domínio**. Criar um segundo agente para o mesmo domínio
// duplica a permissão, a memória e o erro — e a segunda cópia envelhece sem que ninguém saiba qual das duas
// está certa.
//
// **Criar só é sugerido quando o domínio não tem cobertura nenhuma** — e mesmo aí o Factory **não cria**: ele
// diz o que falta, e quem decide é uma pessoa.
//
// O QUE ESTE ARQUIVO **NÃO** FAZ
//
// **Não cria perfil, não chama modelo, não instala ferramenta.** É a mesma fronteira do roster: *"Criar o
// perfil é trabalho do runtime; decidir o teto é trabalho de produto."*
//
// **Não eleva permissão.** A r66 pôs `publish_external` e `set_price` em `HUMAN_ONLY`; um agente novo nasce
// com o teto do **domínio**, e um agente **nunca** recebe nível acima do que o roster permite.

import { AGENTES, agentePorId, NIVEIS, ordemDoNivel, type AgenteDepartamental, type Nivel } from './agent-roster'

export type RecusaContratacao =
  | 'agente_inexistente'
  | 'dominio_ja_coberto'
  | 'duplicata'
  | 'nivel_acima_do_permitido'

/** Uma necessidade de trabalho: o domínio, o que precisa ser feito e o nível que a pessoa quer. */
export interface Necessidade {
  /** O que precisa ser feito, em uma frase. Vai para a capacidade do agente novo, se houver. */
  descricao: string
  dominio: string
  nivel: Nivel
}

/**
 * Quem já cobre esta necessidade?
 *
 * Devolve **todos** os agentes que têm capacidade no domínio — não só o primeiro. A tela precisa saber se a
 * escolha é óbvia ou se há mais de um candidato.
 *
 * **Não ordena por "melhor"**: ordena por **id**, para a resposta ser estável entre chamadas. Uma lista que
 * muda de ordem entre duas leituras faz a tela parecer quebrada.
 */
export function candidatos(dominio: string): AgenteDepartamental[] {
  return AGENTES.filter(a => a.capacidades.some(c => c.dominio === dominio)).sort((a, b) =>
    a.id.localeCompare(b.id)
  )
}

export interface Contratacao {
  /** O agente reutilizado, quando há um. */
  agente: AgenteDepartamental
  /** O nível que o agente já tem naquele domínio. **Não** o nível pedido. */
  nivelDoAgente: Nivel
  motivo: 'dominio_coberto'
}

/**
 * Reaproveitar ou criar?
 *
 * **Reaproveita quando há candidato.** E quando o nível pedido é **maior** que o do candidato, devolve a
 * contratação mesmo assim, com o nível **do agente** — porque a resposta é *"esta pessoa já cuida disso, e
 * no nível dela"*. Subir o nível é uma decisão separada, e ela **não acontece aqui**.
 */
export function contratar(
  necessidade: Necessidade
): { error: RecusaContratacao; suggestion?: string } | Contratacao {
  if (!necessidade.dominio.trim()) return { error: 'dominio_ja_coberto' }

  const lista = candidatos(necessidade.dominio)

  if (lista.length === 0) {
    // Sem cobertura: o Factory **diz o que falta** em vez de criar sozinho.
    return {
      suggestion: `Nenhum agente cobre "${necessidade.dominio}". Crie um com nível ${necessidade.nivel} e só as ferramentas que ele precisa.`,
      error: 'dominio_ja_coberto'
    }
  }

  const escolhido = lista[0] as AgenteDepartamental
  const capacidade = escolhido.capacidades.find(c => c.dominio === necessidade.dominio)

  return {
    agente: escolhido,
    motivo: 'dominio_coberto',
    // O nível **do agente**, e não o pedido: o teto é por domínio, e um pedido maior não o eleva.
    nivelDoAgente: capacidade?.nivel ?? 'READ'
  }
}

/**
 * Validar um agente proposto.
 *
 * Quatro recusas, e cada uma protege uma coisa:
 *
 *   1. id repetido              → `duplicata` (dois agentes com a mesma identidade)
 *   2. domínio já coberto       → `dominio_ja_coberto` (o §12: "não criar bots duplicados")
 *   3. nível acima do permitido → `nivel_acima_do_permitido` (a r66 e o `HUMAN_ONLY`)
 *   4. id inexistente ao editar → `agente_inexistente`
 */
export function validarProposta(input: unknown): { error: RecusaContratacao } | { ok: true } {
  const raw = (input ?? {}) as Record<string, unknown>
  const id = typeof raw['id'] === 'string' ? raw['id'].trim() : ''

  if (!id) return { error: 'duplicata' }

  // Já existe com este id: propor de novo é duplicata.
  if (agentePorId(id)) return { error: 'duplicata' }

  const capacidades = Array.isArray(raw['capacidades']) ? raw['capacidades'] : []

  for (const item of capacidades) {
    const c = (item ?? {}) as Record<string, unknown>
    const dominio = typeof c['dominio'] === 'string' ? c['dominio'].trim() : ''

    if (!dominio) continue

    // O domínio já tem dono: o §12 proíbe o segundo bot para a mesma tarefa.
    if (candidatos(dominio).length > 0) return { error: 'dominio_ja_coberto' }

    const nivel = c['nivel'] as Nivel

    // r82: o nível precisa EXISTIR antes de ser comparado. `ordemDoNivel` de um valor desconhecido não é
    // maior que nada — e sem esta checagem um nível inventado passaria como se fosse o mais baixo.
    if (typeof nivel !== 'string' || !NIVEIS.includes(nivel)) return { error: 'nivel_acima_do_permitido' }

    // `SUPERVISED_AUTONOMY` é o topo; nada acima existe. O que a r66 protege é outra camada — mas um agente
    // **novo** que já nascesse no topo passaria por cima da decisão humana de conceder.
    if (ordemDoNivel(nivel) > ordemDoNivel('EXECUTE_ALLOWED')) {
      return { error: 'nivel_acima_do_permitido' }
    }
  }

  return { ok: true }
}

/**
 * O que o Factory recomenda para uma necessidade.
 *
 * **A frase é a decisão**, e ela começa pelo que **não** vai acontecer: criar mais um agente.
 */
export function recomendacao(necessidade: Necessidade): string {
  const r = contratar(necessidade)

  if ('error' in r) {
    return r.suggestion ?? `Não há agente para "${necessidade.dominio}".`
  }

  return (
    `"${necessidade.dominio}" já é do ${r.agente.nome} (${r.agente.id}), no nível ${r.nivelDoAgente}. ` +
    'Não crie outro: o mesmo domínio com dois donos duplica a permissão e o erro.'
  )
}

/** Quantos agentes cobrem um domínio. Para a tela saber se a escolha é óbvia. */
export function cobertura(dominio: string): number {
  return candidatos(dominio).length
}
