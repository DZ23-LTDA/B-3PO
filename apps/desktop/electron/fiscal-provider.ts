// Emissão fiscal: contrato de provedor + sandbox (rodada 104).
//
// O QUE O GOAL EXIGE, E O QUE ELE PROÍBE
//
// Exige "integração fiscal quando disponível" (item 16) e proíbe "afirmar emissão fiscal sem integração
// homologada". As duas coisas juntas decidem a arquitetura: em vez de simular nota fiscal, o produto tem um
// CONTRATO de provedor e nenhum caminho que diga "autorizada" sem uma resposta real de autoridade.
//
// POR QUE UM CONTRATO E NÃO UMA INTEGRAÇÃO DIRETA
//
// No Brasil a emissão passa por um provedor (Focus NFe, eNotas, Nuvem Fiscal, PlugNotas) ou pelo MCP de um
// deles; cada um tem sua API, seu formato e seu preço. Amarrar o produto a um só significaria reescrever o
// fluxo para trocar de emissor. Com o contrato, trocar é registrar outro provedor.
//
// O SANDBOX NÃO É UMA NOTA FALSA
//
// `sandboxProvider` marca todo documento com `homologacao: true` e `chave` começando em `SANDBOX-`. Nada
// que ele produza pode ser confundido com autorização real, e o adapter que fala com a SEFAZ de verdade é
// outro. Ele existe para exercitar o fluxo inteiro — emitir, consultar, cancelar, imprimir — sem credencial,
// que é exatamente o que o GOAL permite: "sem credenciais, preparar e testar em sandbox".

export const FISCAL_DOCUMENT_KINDS = ['nfe', 'nfce', 'nfse'] as const
export type FiscalDocumentKind = (typeof FISCAL_DOCUMENT_KINDS)[number]

export const FISCAL_STATUSES = ['pendente', 'autorizado', 'rejeitado', 'cancelado'] as const
export type FiscalStatus = (typeof FISCAL_STATUSES)[number]

/** O que se pede para emitir. Derivado da venda — nunca digitado à mão. */
export interface PedidoFiscal {
  /** `ref` determinística: `venda:<id>`. Emitir duas vezes o mesmo pedido não emite duas notas. */
  ref: string
  kind: FiscalDocumentKind
  /** Itens e valores vêm do documento de origem, não do chamador. */
  payload: Record<string, unknown>
  tenant_id: string
}

export interface ResultadoFiscal {
  /** Começa em `SANDBOX-` no sandbox; nunca é confundida com chave real. */
  chave: string
  /** true quando veio de um provedor que não fala com a autoridade tributária. */
  homologacao: boolean
  /** URL do DANFE/DANFCE/PDF de serviço. Sem ela, não há como imprimir. */
  url_danfe: string
  mensagem: string
  numero: string
  status: FiscalStatus
}

export interface FiscalProvider {
  /** Falso quando o provedor não fala com a autoridade — o produto mostra "homologação", não "autorizada". */
  homologado: boolean
  id: string
  nome: string
  emitir: (pedido: PedidoFiscal) => Promise<{ error: string } | { resultado: ResultadoFiscal }>
  consultar: (chave: string) => Promise<{ error: string } | { resultado: ResultadoFiscal }>
  cancelar: (chave: string, motivo: string) => Promise<{ error: string } | { resultado: ResultadoFiscal }>
}

/**
 * Provedor de homologação: simula o ciclo e marca tudo como não-autorizado.
 *
 * A chave tem 44 dígitos como a real (formato de acesso do contribuinte), mas o prefixo `SANDBOX` deixa
 * impossível confundir. Um `cancelar` só funciona sobre chave `SANDBOX-` — o sandbox recusa cancelar nota
 * real, e o adapter real recusa cancelar chave de sandbox: os dois mundos não se cruzam.
 */
export function sandboxProvider(): FiscalProvider {
  return {
    homologado: false,
    id: 'sandbox',
    nome: 'Homologação (sem autoridade fiscal)',
    async emitir(pedido) {
      if (!pedido.ref) return { error: 'ref_obrigatoria' }

      const digitos = Array.from({ length: 44 }, (_, i) => String((i * 7 + pedido.ref.length) % 10)).join('')

      return {
        resultado: {
          chave: `SANDBOX-${digitos}`,
          homologacao: true,
          mensagem: 'Documento de homologação. Não tem validade fiscal.',
          numero: String(digitos.slice(0, 9)),
          status: 'autorizado',
          url_danfe: `https://sandbox.invalid/danfe/SANDBOX-${digitos}.pdf`
        }
      }
    },
    async consultar(chave) {
      if (!chave.startsWith('SANDBOX-')) return { error: 'chave_de_outro_provedor' }

      return {
        resultado: {
          chave,
          homologacao: true,
          mensagem: 'Documento de homologação.',
          numero: chave.slice(8, 17),
          status: 'autorizado',
          url_danfe: `https://sandbox.invalid/danfe/${chave}.pdf`
        }
      }
    },
    async cancelar(chave, motivo) {
      if (!chave.startsWith('SANDBOX-')) return { error: 'chave_de_outro_provedor' }
      if (!motivo.trim()) return { error: 'motivo_obrigatorio' }

      return {
        resultado: {
          chave,
          homologacao: true,
          mensagem: `Cancelado em homologação: ${motivo.trim()}`,
          numero: chave.slice(8, 17),
          status: 'cancelado',
          url_danfe: ''
        }
      }
    }
  }
}

/**
 * Provedor real, ainda sem credencial: recusa tudo com `nao_configurado`.
 *
 * Existe para o produto poder dizer a verdade: "há um emissor configurado e falta a chave", em vez de
 * esconder a funcionalidade ou — pior — emitir algo que não vale.
 */
export function provedorNaoConfigurado(id: string, nome: string): FiscalProvider {
  const recusa = async (): Promise<{ error: string }> => ({ error: 'nao_configurado' })

  return {
    cancelar: recusa,
    consultar: recusa,
    emitir: recusa,
    homologado: true,
    id,
    nome
  }
}

/** Catálogo de provedores conhecidos. O adapter de cada um lê as credenciais do ambiente do processo. */
export interface ProvedorConhecido {
  comoConectar: string
  id: string
  nome: string
  /** Variáveis que o adapter lê. Nunca valores — o app não guarda chave. */
  variaveis: readonly string[]
}

export const PROVEDORES_FISCAIS: readonly ProvedorConhecido[] = [
  {
    comoConectar: 'Crie um token no painel Focus NFe e exporte no ambiente do processo principal.',
    id: 'focus_nfe',
    nome: 'Focus NFe',
    variaveis: ['FOCUS_NFE_TOKEN', 'FOCUS_NFE_AMBIENTE']
  },
  {
    comoConectar: 'Crie uma conta no eNotas e exporte o token e o id da empresa.',
    id: 'enotas',
    nome: 'eNotas',
    variaveis: ['ENOTAS_TOKEN', 'ENOTAS_EMPRESA_ID']
  },
  {
    comoConectar: 'Use a Nuvem Fiscal com client id e secret do ambiente.',
    id: 'nuvem_fiscal',
    nome: 'Nuvem Fiscal',
    variaveis: ['NUVEM_FISCAL_CLIENT_ID', 'NUVEM_FISCAL_CLIENT_SECRET']
  },
  {
    comoConectar: 'Aponte para o MCP do emissor e exponha o endpoint e o token.',
    id: 'mcp_fiscal',
    nome: 'MCP do emissor',
    variaveis: ['FISCAL_MCP_URL', 'FISCAL_MCP_TOKEN']
  }
] as const

/**
 * Escolhe o provedor a partir do ambiente.
 *
 * Sem `FISCAL_PROVEDOR`, devolve o sandbox — e o produto mostra "homologação" na tela, não "nota
 * autorizada". É a diferença entre um sistema honesto e um que finge emitir.
 *
 * Com um provedor escolhido, devolve `nao_configurado` mesmo que as variáveis existam, porque **o adapter
 * HTTP de cada emissor ainda não foi escrito**. Inventar um "provavelmente funcionou" aqui seria pior que
 * recusar: uma venda com nota fantasma é passivo fiscal, não bug de interface.
 */
export function resolverProvedor(env: Record<string, string | undefined>): FiscalProvider {
  const escolhido = (env['FISCAL_PROVEDOR'] ?? '').trim()

  if (!escolhido) return sandboxProvider()

  const conhecido = PROVEDORES_FISCAIS.find(p => p.id === escolhido)

  if (!conhecido) return sandboxProvider()

  return provedorNaoConfigurado(conhecido.id, conhecido.nome)
}

/** Quais variáveis faltam para o provedor escolhido. Vazio quando não há provedor escolhido. */
export function variaveisFaltando(env: Record<string, string | undefined>): string[] {
  const escolhido = (env['FISCAL_PROVEDOR'] ?? '').trim()
  const conhecido = PROVEDORES_FISCAIS.find(p => p.id === escolhido)

  return conhecido ? conhecido.variaveis.filter(nome => !(env[nome] ?? '').trim()) : []
}
