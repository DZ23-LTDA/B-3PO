import type { AuxTaskCopyMap } from './types_aux_tasks'

/** pt-BR das tarefas auxiliares que podem rodar em modelo próprio. */
export const ptAuxTasks: AuxTaskCopyMap = {
  vision: { label: 'Visão', hint: 'Análise de imagem' },
  compression: { label: 'Compressão', hint: 'Compactação de contexto' },
  skills_hub: { label: 'Central de skills', hint: 'Busca de skills' },
  approval: { label: 'Aprovação', hint: 'Aprovação automática inteligente' },
  mcp: { label: 'MCP', hint: 'Roteamento de ferramentas MCP' },
  title_generation: { label: 'Títulos', hint: 'Títulos de sessão' },
  review: { label: 'Revisão', hint: 'Subagente revisor do /review' },
  voice_chat: { label: 'Conversa por voz', hint: 'Respostas faladas no modo voz' },
  triage_specifier: { label: 'Especificador de triagem', hint: 'Detalhar item do Kanban' },
  kanban_decomposer: { label: 'Decompositor do Kanban', hint: 'Decomposição de tarefas' },
  profile_describer: { label: 'Descrição de perfil', hint: 'Descrições automáticas de perfil' },
  curator: { label: 'Curador', hint: 'Revisão de uso de skills' }
}
