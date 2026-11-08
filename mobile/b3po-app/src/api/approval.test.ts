import { describe, expect, it } from 'vitest'

import {
  approvalResponseFrame,
  approvalSummary,
  approvalsFromOpenRequests,
  choiceLabel,
  firstPendingApproval,
  parseApprovalFrame
} from './approval'

const frame = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 7,
  jsonrpc: '2.0',
  method: 'approval',
  params: {
    choices: ['once', 'session', 'deny'],
    command: 'rm -rf build',
    description: 'Apagar a pasta de build',
    request_id: 'req-1'
  },
  ...over
})

describe('pedido de aprovação', () => {
  it('extrai id do frame, request_id, comando, descrição e escolhas', () => {
    expect(parseApprovalFrame(frame())).toEqual({
      choices: ['once', 'session', 'deny'],
      command: 'rm -rf build',
      description: 'Apagar a pasta de build',
      requestId: 'req-1',
      wireId: 7
    })
  })

  it('ignora frames que não são aprovação', () => {
    expect(parseApprovalFrame(null)).toBeNull()
    expect(parseApprovalFrame({ id: 1, result: {} })).toBeNull()
    expect(parseApprovalFrame({ id: 1, method: 'clarify' })).toBeNull()
  })

  it('sem id numérico não é pedido respondível', () => {
    expect(parseApprovalFrame(frame({ id: 'abc' }))).toBeNull()
    expect(parseApprovalFrame(frame({ id: undefined }))).toBeNull()
  })

  it('sem escolhas do servidor oferece o mínimo seguro: permitir uma vez ou negar', () => {
    const parsed = parseApprovalFrame(frame({ params: { command: 'ls' } }))

    expect(parsed?.choices).toEqual(['once', 'deny'])
  })

  it('descarta escolhas que não são texto e preserva a ordem do servidor', () => {
    const parsed = parseApprovalFrame(frame({ params: { choices: ['deny', 3, null, 'once'] } }))

    expect(parsed?.choices).toEqual(['deny', 'once'])
  })

  it('a resposta volta no id do frame, como result', () => {
    expect(approvalResponseFrame(7, 'deny')).toEqual({ id: 7, jsonrpc: '2.0', result: { choice: 'deny' } })
  })

  it('rótulos em pt-BR e escolha desconhecida aparece como veio', () => {
    expect(choiceLabel('once')).toBe('Permitir uma vez')
    expect(choiceLabel('session')).toBe('Permitir nesta sessão')
    expect(choiceLabel('deny')).toBe('Negar')
    expect(choiceLabel('quarantine')).toBe('quarantine')
  })

  it('o cartão mostra a descrição; sem descrição, o comando; sem nada, uma frase honesta', () => {
    const base = parseApprovalFrame(frame())!

    expect(approvalSummary(base)).toBe('Apagar a pasta de build')
    expect(approvalSummary({ ...base, description: '' })).toBe('rm -rf build')
    expect(approvalSummary({ ...base, command: '  ', description: '' })).toBe(
      'O computador pediu uma autorização.'
    )
  })
})

describe('snapshot de pedidos abertos na reconexão', () => {
  it('recupera o pedido que o servidor deixou aberto', () => {
    const open = [
      { id: 12, method: 'approval', params: { command: 'npm publish', request_id: 'r-2' } },
      { id: 13, method: 'clarify', params: {} }
    ]

    expect(approvalsFromOpenRequests(open)).toEqual([
      { choices: ['once', 'deny'], command: 'npm publish', description: '', requestId: 'r-2', wireId: 12 }
    ])
  })

  it('sem pedidos (ou lixo) devolve lista vazia', () => {
    expect(approvalsFromOpenRequests(undefined)).toEqual([])
    expect(approvalsFromOpenRequests(null)).toEqual([])
    expect(approvalsFromOpenRequests([{ method: 'clarify' }, 'texto', 42])).toEqual([])
  })

  it('a tela recebe uma decisão por vez, na ordem do servidor', () => {
    const open = [
      { id: 1, method: 'approval', params: { request_id: 'a' } },
      { id: 2, method: 'approval', params: { request_id: 'b' } }
    ]

    expect(firstPendingApproval(open)?.requestId).toBe('a')
  })
})
