// O catálogo da busca (r97 do GOAL V2).
//
// POR QUE ELE NÃO LÊ O MENU
//
// O menu (`plugins/b3po-nav/plugin.tsx`) tem **label e path**. O que a busca precisa e **mais duas coisas**:
//
//   - `grupo` — o §13:429-438 agrupa por fluxo, e o resultado da busca **diz onde o módulo mora**
//   - `sinonimos` — a parte que faz a busca funcionar (r96)
//
// **Nenhuma das duas existe no menu.**
//
// E ele não pode ler o menu em tempo de execução: o menu é contribuído por um **plugin do runner**, e um
// catálogo que dependesse dele **quebraria quando o plugin estivesse desligado** — inclusive na busca, que é
// justamente o caminho de quem **não sabe onde está**.
//
// O QUE ISSO CUSTA — e é honesto dizer
//
// **Duas listas.** Quando um módulo entra no menu, ele precisa entrar aqui também. O teste `catálogo cobre o
// menu` existe para isso: ele **quebra** quando as duas divergem.
//
// **É o preço de a busca não depender do plugin** — e o teste é o que impede o preço de virar dívida.

import type { ModuloBuscavel } from './global-search'

/**
 * Os 23 módulos do menu, com grupo e sinônimos.
 *
 * **A ordem é a do menu** — o resultado de uma busca vazia mostra a mesma ordem que a pessoa vê na barra
 * lateral, e duas ordens diferentes para a mesma lista confundem.
 */
export const MODULOS_BUSCAVEIS: readonly ModuloBuscavel[] = [
  // 1. Visão geral
  { grupo: 'Visão geral', label: 'Painel', path: '/painel', sinonimos: ['home', 'início', 'resumo', 'dia'] },
  { grupo: 'Visão geral', label: 'Empresa', path: '/empresa', sinonimos: ['negócio', 'companhia', 'cnpj'] },

  // 2. Operação
  { grupo: 'Operação', label: 'Atendimento', path: '/atendimento', sinonimos: ['fila', 'conversa', 'chat', 'inbox'] },
  { grupo: 'Operação', label: 'Agenda', path: '/agenda', sinonimos: ['compromisso', 'horário', 'reunião'] },
  { grupo: 'Operação', label: 'Serviços', path: '/servicos', sinonimos: ['serviço', 'instalação', 'visita'] },
  { grupo: 'Operação', label: 'RH', path: '/rh', sinonimos: ['equipe', 'pessoa', 'funcionário', 'time'] },

  // 3. Comércio
  { grupo: 'Comércio', label: 'Produtos', path: '/products', sinonimos: ['catálogo', 'item', 'sku', 'preço'] },
  { grupo: 'Comércio', label: 'Estoque', path: '/stock', sinonimos: ['inventário', 'saldo', 'mercadoria'] },
  { grupo: 'Comércio', label: 'Vasilhames', path: '/gas', sinonimos: ['botijão', 'casco', 'comodato', 'gás', 'água', 'revenda', 'recarga', 'glp'] },
  { grupo: 'Comércio', label: 'Compras', path: '/compras', sinonimos: ['fornecedor', 'cotação', 'pedido de compra'] },
  { grupo: 'Comércio', label: 'Vendas', path: '/sales', sinonimos: ['pedido', 'faturamento', 'cliente vende'] },
  { grupo: 'Comércio', label: 'Entregas', path: '/entregas', sinonimos: ['logística', 'caminhão', 'rota', 'comprovante'] },
  { grupo: 'Comércio', label: 'Financeiro', path: '/finance', sinonimos: ['conta', 'dinheiro', 'a receber', 'a pagar'] },

  // 4. Trabalho
  { grupo: 'Trabalho', label: 'Projetos', path: '/projetos', sinonimos: ['plano', 'objetivo', 'critério'] },
  { grupo: 'Trabalho', label: 'Trabalhos', path: '/trabalhos', sinonimos: ['tarefa', 'pedido pontual', 'pesquisa'] },

  // 5. Crescimento
  { grupo: 'Crescimento', label: 'Marketing', path: '/marketing', sinonimos: ['campanha', 'anúncio', 'post'] },
  { grupo: 'Crescimento', label: 'Pós-venda', path: '/posvenda', sinonimos: ['suporte', 'cliente depois', 'reclamação'] },

  // 6. Inteligência e automação
  { grupo: 'Inteligência', label: 'Agentes', path: '/agentes', sinonimos: ['bot', 'assistente', 'aprovação'] },
  { grupo: 'Inteligência', label: 'Automações', path: '/automacoes', sinonimos: ['regra', 'gatilho', 'fluxo automático'] },
  { grupo: 'Inteligência', label: 'Sofia', path: '/sofia', sinonimos: ['ia', 'inteligência artificial', 'copiloto'] },
  { grupo: 'Inteligência', label: 'Documentos', path: '/documentos', sinonimos: ['arquivo', 'contrato', 'nota'] },

  // 7. Configuração
  { grupo: 'Configuração', label: 'Estrutura', path: '/organizacao', sinonimos: ['departamento', 'organograma', 'quem faz o quê'] },
  { grupo: 'Configuração', label: 'Privacidade', path: '/privacidade', sinonimos: ['lgpd', 'dados pessoais', 'auditoria', 'trilha'] }
] as const

/** Só os paths — para o teste comparar com o menu. */
export function pathsDoCatalogo(): string[] {
  return MODULOS_BUSCAVEIS.map(m => m.path)
}

/** Os grupos na ordem em que aparecem. */
export function gruposDoCatalogo(): string[] {
  return [...new Set(MODULOS_BUSCAVEIS.map(m => m.grupo))]
}
