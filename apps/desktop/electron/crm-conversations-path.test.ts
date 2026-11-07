// Fonte de verdade das conversas do CRM (r11 do GOAL V2).
//
// POR QUE ESTE ARQUIVO EXISTE
//
// O mapa dos 26 stores mostrou que 24 gravam em `userData/b3po/` e **dois não**. Um deles era
// `crm-conversations-store.ts`, que gravava em `userData/crm-conversations.json` — um nível acima.
//
// Não era cosmético: `b3po/` é a pasta que o produto documenta como seu estado. Quem fizesse backup dela
// **perderia todas as conversas do WhatsApp**, sem nenhum aviso.
//
// A correção não pode ser só mudar o caminho: isso trocaria um bug (arquivo no lugar errado) por um pior
// (histórico que some de repente). Por isso a migração, e por isso este teste — a migração precisa provar
// que move, que não sobrescreve, e que não derruba o boot quando falha.

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { conversationsStorePath, migrarConversasAntigas } from './crm-conversations-store'

let dir = ''

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'b3po-conv-'))
})

afterEach(async () => {
  await rm(dir, { force: true, recursive: true })
})

describe('caminho das conversas', () => {
  it('grava DENTRO de b3po/, como os outros stores', () => {
    expect(conversationsStorePath(dir)).toBe(join(dir, 'b3po', 'crm-conversations.json'))
  })

  it('o caminho NAO e mais a raiz de userData', () => {
    expect(conversationsStorePath(dir)).not.toBe(join(dir, 'crm-conversations.json'))
  })
})

describe('migração do arquivo antigo', () => {
  it('instalação nova: nada a migrar, devolve false', () => {
    expect(migrarConversasAntigas(dir)).toBe(false)
  })

  it('arquivo antigo na raiz: move para b3po/ e devolve true', async () => {
    const antigo = join(dir, 'crm-conversations.json')
    await writeFile(antigo, JSON.stringify({ conversations: [{ id: 'c1' }] }), 'utf8')

    expect(migrarConversasAntigas(dir)).toBe(true)

    // O conteúdo tem de chegar inteiro ao destino.
    const destino = conversationsStorePath(dir)
    expect(existsSync(destino)).toBe(true)
    expect(JSON.parse(await readFile(destino, 'utf8'))).toEqual({ conversations: [{ id: 'c1' }] })

    // E o antigo não pode continuar na raiz.
    expect(existsSync(antigo)).toBe(false)
  })

  it('não sobrescreve o arquivo novo quando ele já existe', async () => {
    const antigo = join(dir, 'crm-conversations.json')
    await writeFile(antigo, JSON.stringify({ conversations: ['velho'] }), 'utf8')

    const { mkdir } = await import('node:fs/promises')
    await mkdir(join(dir, 'b3po'), { recursive: true })
    await writeFile(conversationsStorePath(dir), JSON.stringify({ conversations: ['novo'] }), 'utf8')

    expect(migrarConversasAntigas(dir)).toBe(false)

    // O novo é a verdade: o antigo NÃO pode ter vencido.
    expect(JSON.parse(await readFile(conversationsStorePath(dir), 'utf8'))).toEqual({ conversations: ['novo'] })
    // E o antigo fica onde está, para inspeção — não é apagado.
    expect(existsSync(antigo)).toBe(true)
  })

  it('roda duas vezes sem efeito na segunda', async () => {
    await writeFile(join(dir, 'crm-conversations.json'), '{"conversations":[]}', 'utf8')

    expect(migrarConversasAntigas(dir)).toBe(true)
    expect(migrarConversasAntigas(dir)).toBe(false)
  })

  it('não lança quando não consegue mover', async () => {
    // O diretório `b3po` ocupado por um ARQUIVO: `mkdirSync` falha, e a migração tem de engolir o erro.
    await writeFile(join(dir, 'b3po'), 'sou um arquivo, nao um diretorio', 'utf8')
    await writeFile(join(dir, 'crm-conversations.json'), '{"conversations":[]}', 'utf8')

    expect(() => migrarConversasAntigas(dir)).not.toThrow()
    expect(migrarConversasAntigas(dir)).toBe(false)
  })
})
