// Aprovações — store e expiração (rodada 145).
//
// O que estes testes travam: pedido vencido não pode ser aprovado, pedido que cabe no teto não entra na fila,
// e a expiração vale na leitura (não depende de agendador).

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { aplicarExpiracao, agentApprovalsPath, openApprovalStore, VALIDADE_MS } from './agent-approval-store'

const AGORA = 1_700_000_000_000

let userData = ''

beforeEach(() => {
  userData = mkdtempSync(join(tmpdir(), 'b3po-apr-'))
})

afterEach(() => {
  rmSync(userData, { force: true, recursive: true })
})

const entrada = (over: Record<string, unknown> = {}) => ({
  acao: 'conceder desconto de 15%',
  dominio: 'sales',
  execution_id: 'e1',
  motivo: 'cliente pediu desconto para fechar pedido grande',
  nivel_pedido: 'EXECUTE_ALLOWED' as const,
  solicitado_por: 'agente-vendas',
  teto: 'PREPARE' as const,
  ...over
})

describe('criar', () => {
  it('cria quando o pedido esta acima do teto', () => {
    const s = openApprovalStore(userData)
    const r = s.criar(entrada(), AGORA)

    expect(r.error).toBeUndefined()
    expect(r.solicitacao?.status).toBe('pendente')
    expect(r.solicitacao?.id).toMatch(/^apr_/)
  })

  it('NAO cria quando o pedido ja cabe no teto', () => {
    // Encher a fila de ruido ensina o operador a aprovar sem ler.
    const s = openApprovalStore(userData)

    expect(s.criar(entrada({ nivel_pedido: 'PREPARE' }), AGORA)).toEqual({ error: 'nao_precisa_aprovacao' })
    expect(s.listar()).toEqual([])
  })

  it('recusa motivo curto', () => {
    expect(openApprovalStore(userData).criar(entrada({ motivo: 'curto' }), AGORA)).toEqual({ error: 'motivo_curto' })
  })

  it('recusa sem autor ou sem acao', () => {
    const s = openApprovalStore(userData)

    expect(s.criar(entrada({ solicitado_por: '  ' }), AGORA)).toEqual({ error: 'autor_obrigatorio' })
    expect(s.criar(entrada({ acao: ' ' }), AGORA)).toEqual({ error: 'acao_obrigatoria' })
  })
})

describe('decidir', () => {
  it('outra pessoa aprova', () => {
    const s = openApprovalStore(userData)
    const id = s.criar(entrada(), AGORA).solicitacao!.id

    expect(s.aprovar(id, 'leandro', AGORA + 1000)).toEqual({ ok: true })
    expect(s.listar('aprovada', AGORA + 1000)).toHaveLength(1)
    expect(s.listar('aprovada', AGORA + 1000)[0]!.decidido_por).toBe('leandro')
  })

  it('o proprio autor NAO aprova', () => {
    const s = openApprovalStore(userData)
    const id = s.criar(entrada(), AGORA).solicitacao!.id

    expect(s.aprovar(id, 'agente-vendas', AGORA + 1000)).toEqual({ error: 'mesmo_autor' })
    expect(s.listar('pendente', AGORA + 1000)).toHaveLength(1)
  })

  it('recusar marca recusada', () => {
    const s = openApprovalStore(userData)
    const id = s.criar(entrada(), AGORA).solicitacao!.id

    expect(s.recusar(id, 'leandro', AGORA + 1000)).toEqual({ ok: true })
    expect(s.listar('recusada', AGORA + 1000)).toHaveLength(1)
  })

  it('id inexistente devolve nao_encontrada', () => {
    expect(openApprovalStore(userData).aprovar('apr_nada', 'leandro', AGORA)).toEqual({
      error: 'nao_encontrada'
    })
  })

  it('VENCIDA nao pode ser aprovada', () => {
    // Um pedido de desconto aprovado tres semanas depois nao e aprovacao - e acidente.
    const s = openApprovalStore(userData)
    const id = s.criar(entrada(), AGORA).solicitacao!.id

    expect(s.aprovar(id, 'leandro', AGORA + VALIDADE_MS + 1)).toEqual({ error: 'ja_decidida' })
    expect(s.listar('expirada', AGORA + VALIDADE_MS + 1)).toHaveLength(1)
  })

  it('dentro da validade ainda aprova', () => {
    const s = openApprovalStore(userData)
    const id = s.criar(entrada(), AGORA).solicitacao!.id

    expect(s.aprovar(id, 'leandro', AGORA + VALIDADE_MS - 1)).toEqual({ ok: true })
  })
})

describe('aplicarExpiracao', () => {
  const sol = (status: 'pendente' | 'aprovada', idade: number) => ({
    acao: 'x',
    decidido_em: null,
    decidido_por: null,
    dominio: 'sales',
    execution_id: 'e1',
    id: 'a1',
    motivo: 'motivo suficientemente longo',
    nivel_pedido: 'EXECUTE_ALLOWED' as const,
    solicitado_em: AGORA - idade,
    solicitado_por: 'bot',
    status,
    tenant_id: 'local'
  })

  it('marca pendente vencida', () => {
    const r = aplicarExpiracao([sol('pendente', VALIDADE_MS + 1)], AGORA)

    expect(r[0]!.status).toBe('expirada')
  })

  it('nao mexe em aprovada, mesmo velha', () => {
    // A decisao ja foi tomada; expirar depois apagaria o fato.
    expect(aplicarExpiracao([sol('aprovada', VALIDADE_MS * 10)], AGORA)[0]!.status).toBe('aprovada')
  })

  it('pendente recente continua pendente', () => {
    expect(aplicarExpiracao([sol('pendente', 1000)], AGORA)[0]!.status).toBe('pendente')
  })
})

describe('listar', () => {
  it('ordena da mais recente para a mais antiga', () => {
    const s = openApprovalStore(userData)

    s.criar(entrada({ acao: 'antiga' }), AGORA - 1000)
    s.criar(entrada({ acao: 'nova' }), AGORA)

    expect(s.listar('pendente', AGORA).map(x => x.acao)).toEqual(['nova', 'antiga'])
  })

  it('sobrevive ao reabrir', () => {
    openApprovalStore(userData).criar(entrada(), AGORA)

    expect(openApprovalStore(userData).listar()).toHaveLength(1)
  })

  it('arquivo corrompido nao derruba o produto', () => {
    mkdirSync(join(userData, 'b3po'), { recursive: true })
    writeFileSync(agentApprovalsPath(userData), 'nao e json', 'utf8')

    expect(openApprovalStore(userData).listar()).toEqual([])
  })
})
