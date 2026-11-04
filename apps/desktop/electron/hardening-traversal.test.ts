// Path traversal em `resolveRequestedPathForIpc` (rodada 156).
//
// POR QUE ESTE ARQUIVO EXISTE
//
// A auditoria de `fs-ipc.ts` achou dois fatos que se somam:
//
// 1. `fs-ipc.test.ts` substitui `resolveRequestedPathForIpc` por IDENTIDADE (`value => value`). O teste do
//    fs-ipc, portanto, NÃO exercita a hardening — ele a desliga. Faz sentido para testar o encanamento, mas
//    significa que nenhum teste de fs-ipc prova proteção de caminho.
//
// 2. `hardening.test.ts` cobre `\0`, device paths (`//?/`, `globalroot/device/`) e URL `file:` malformada —
//    mas nenhum caso de `..`.
//
// O comentário em `fs-ipc.ts` diz que `writeText` "never escapes the allowed roots". Ao ler a implementação,
// **não existe lista de roots permitidos**: `rejectUnsafePathSyntax` rejeita sintaxe insegura e `path.resolve`
// normaliza, mas nada compara o resultado com uma raiz.
//
// Estes testes NÃO "consertam" nada: eles fixam o comportamento REAL, para que a decisão de endurecer (ou de
// declarar que caminho absoluto é intencional) seja tomada com o fato à vista.

import { describe, expect, it } from 'vitest'

import { resolveRequestedPathForIpc } from './hardening'

const resolver = (p: string, baseDir?: string) =>
  resolveRequestedPathForIpc(p, { purpose: 'teste', ...(baseDir ? { baseDir } : {}) })

describe('o que a hardening REJEITA', () => {
  it('rejeita NUL', () => {
    expect(() => resolver('arquivo\u0000.txt')).toThrow()
  })

  it('rejeita caminho vazio', () => {
    expect(() => resolver('')).toThrow()
    expect(() => resolver('   ')).toThrow()
  })

  it('rejeita device path do Windows', () => {
    expect(() => resolver('//?/C:/Windows/System32/config/SAM')).toThrow()
    expect(() => resolver('//./PHYSICALDRIVE0')).toThrow()
  })
})

describe('o que a hardening ACEITA — e o fato que precisa de decisão', () => {
  it('ACEITA `../` e normaliza para fora do diretório base', () => {
    // Este e o fato central: `..` nao e rejeitado, e `path.resolve` o aplica. Com base em `C:\proj\app`,
    // tres niveis acima saem da arvore do projeto.
    const saida = resolver('../../../etc/passwd', 'C:\\proj\\app')

    expect(saida).not.toContain('proj')
    expect(saida.endsWith('passwd')).toBe(true)
  })

  it('ACEITA caminho absoluto fora de qualquer raiz', () => {
    // Nao ha lista de roots: um caminho absoluto passa direto.
    const saida = resolver('C:\\Windows\\System32\\drivers\\etc\\hosts')

    expect(saida).toContain('hosts')
  })

  it('ACEITA `~/` e expande para o home do usuário', () => {
    // Expansao deliberada (o gateway reporta cwds como `~/...`). E o que torna a ausencia de root
    // ainda mais ampla: o home inteiro e alcancavel.
    const saida = resolver('~/.ssh/id_rsa')

    expect(saida).toContain('id_rsa')
    expect(saida.startsWith('~')).toBe(false)
  })
})

describe('o invariante que a hardening NAO garante', () => {
  it('nao existe noção de "dentro do permitido"', () => {
    // Documenta a ausencia: dois caminhos com bases diferentes, ambos aceitos, sem relacao entre si.
    const a = resolver('C:\\empresa\\dados\\relatorio.pdf')
    const b = resolver('C:\\Windows\\System32\\config\\SAM')

    expect(a).toContain('relatorio.pdf')
    expect(b).toContain('SAM')
    // Se houvesse raiz permitida, um destes lancaria. Nenhum lanca.
  })
})
