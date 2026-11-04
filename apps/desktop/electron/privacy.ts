// Direitos do titular sobre os próprios dados (LGPD art. 18).
//
// POR QUE ESTE MÓDULO SÓ EXPORTA
//
// O art. 18 dá ao titular dois direitos distintos:
//
//   I  — confirmação e ACESSO aos dados
//   VI — ELIMINAÇÃO dos dados tratados com consentimento
//
// O primeiro é somente leitura e não pode causar dano. O segundo é DESTRUTIVO e irreversível num
// armazenamento que não tem lixeira: apagar um contato do CRM apaga junto o histórico de conversa, as
// tarefas e as oportunidades ligadas a ele.
//
// O GOAL do projeto trata "exclusão destrutiva de dados" como exceção que exige autorização específica
// do proprietário. Por isso este módulo implementa o ACESSO e não implementa a ELIMINAÇÃO — não por
// esquecimento, mas porque a eliminação precisa de uma decisão sobre o que ela alcança.
//
// A pergunta que falta responder, e que não é técnica: apagar o contato apaga as vendas dele? Uma venda
// é fato contábil e fiscal, não dado pessoal descartável; apagá-la quebraria o financeiro. A resposta
// provável é "anonimiza o contato, mantém o fato" — mas isso muda o formato dos registros e precisa de
// decisão.
//
// O QUE ESTE MÓDULO ENTREGA
//
// Um retrato completo e legível dos dados de um telefone, atravessando os domínios que o guardam. Serve
// para o titular ver o que existe, e serve para o proprietário decidir o que a eliminação deve alcançar
// quando autorizar.

import type { CrmContact } from './crm-contacts-store'
import type { CrmConversation } from './crm-conversations-store'
import type { CrmOpportunity } from './crm-pipeline-store'
import type { CrmTask } from './crm-tasks-store'

/** Dados do titular por domínio. Ausência de domínio = ausência de dado, e isso é explícito. */
export interface TitularExport {
  contatos: CrmContact[]
  conversas: CrmConversation[]
  gerado_em: number
  oportunidades: CrmOpportunity[]
  tarefas: CrmTask[]
  telefone: string
  /** Contagem por domínio, para a resposta ao titular ser legível sem abrir os arrays. */
  totais: Record<'contatos' | 'conversas' | 'mensagens' | 'oportunidades' | 'tarefas', number>
}

export interface PrivacyDeps {
  conversations: { list: (tenantId?: string) => Promise<CrmConversation[]> }
  contacts: { list: (tenantId?: string) => Promise<CrmContact[]> }
  opportunities: { list: (tenantId?: string) => Promise<CrmOpportunity[]> }
  tasks: { list: (tenantId?: string) => Promise<CrmTask[]> }
}

/**
 * Só dígitos — o `+` também cai.
 *
 * O CRM guarda `+5511…` e `5511…` como chaves diferentes, mas para o titular são o mesmo telefone.
 * Comparar com o `+` dentro faria a exportação voltar vazia justamente quando o dado foi gravado sem
 * ele — o pior resultado possível para um pedido de acesso: parecer que não há nada.
 */
export function normalizarTelefone(value: unknown): string {
  const raw = typeof value === 'string' ? value : ''

  return raw.replace(/\D/g, '')
}

/** Um telefone é pesquisável quando tem ao menos 8 dígitos — o mesmo mínimo do CRM. */
export function telefoneValido(telefone: string): boolean {
  return telefone.replace(/\D/g, '').length >= 8
}

/**
 * Reúne tudo que existe sobre um telefone.
 *
 * A comparação é pelo telefone normalizado, nunca pelo nome: homônimo não é o mesmo titular, e nome é
 * justamente o campo que mais varia.
 */
export async function exportarTitular(
  telefoneBruto: unknown,
  deps: PrivacyDeps,
  tenantId?: string,
  now: number = Date.now()
): Promise<{ error: string } | { export: TitularExport }> {
  const telefone = normalizarTelefone(telefoneBruto)

  if (!telefoneValido(telefone)) return { error: 'telefone_invalido' }

  const [contatos, conversas, oportunidades, tarefas] = await Promise.all([
    deps.contacts.list(tenantId),
    deps.conversations.list(tenantId),
    deps.opportunities.list(tenantId),
    deps.tasks.list(tenantId)
  ])

  const meusContatos = contatos.filter(c => normalizarTelefone(c.phone) === telefone)
  const minhasConversas = conversas.filter(c => normalizarTelefone(c.contact_phone) === telefone)
  const minhasOportunidades = oportunidades.filter(o => normalizarTelefone(o.contact_phone) === telefone)
  const minhasTarefas = tarefas.filter(t => normalizarTelefone(t.contact_phone) === telefone)

  return {
    export: {
      contatos: meusContatos,
      conversas: minhasConversas,
      gerado_em: now,
      oportunidades: minhasOportunidades,
      tarefas: minhasTarefas,
      telefone,
      totais: {
        contatos: meusContatos.length,
        conversas: minhasConversas.length,
        mensagens: minhasConversas.reduce((soma, c) => soma + c.messages.length, 0),
        oportunidades: minhasOportunidades.length,
        tarefas: minhasTarefas.length
      }
    }
  }
}

/**
 * O que a eliminação alcançaria, sem eliminar.
 *
 * Existe para que a autorização do proprietário seja dada sobre números reais, e não sobre uma promessa
 * vaga de "apagar os dados do titular".
 */
export async function preverEliminacao(
  telefoneBruto: unknown,
  deps: PrivacyDeps,
  tenantId?: string
): Promise<{ error: string } | { alcance: TitularExport['totais']; telefone: string }> {
  const r = await exportarTitular(telefoneBruto, deps, tenantId)

  return 'error' in r ? r : { alcance: r.export.totais, telefone: r.export.telefone }
}
