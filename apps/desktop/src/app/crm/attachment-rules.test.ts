import { describe, expect, it } from 'vitest'

import { ALLOWED_MIME, MAX_ATTACHMENT_BYTES, attachmentRejection } from './attachment-rules'

const MB = 1024 * 1024

describe('attachmentRejection', () => {
  it('aceita pdf dentro do limite', () => {
    expect(attachmentRejection({ mime: 'application/pdf', sizeBytes: 2 * MB })).toBe(null)
  })

  it('recusa arquivo vazio: 0 byte costuma ser falha de gravacao', () => {
    expect(attachmentRejection({ mime: 'application/pdf', sizeBytes: 0 })).toBe('vazio')
    expect(attachmentRejection({ mime: 'application/pdf', sizeBytes: -3 })).toBe('vazio')
  })

  it('recusa acima do teto e aceita exatamente no teto', () => {
    expect(attachmentRejection({ mime: 'image/png', sizeBytes: MAX_ATTACHMENT_BYTES + 1 })).toBe(
      'muito_grande'
    )
    expect(attachmentRejection({ mime: 'image/png', sizeBytes: MAX_ATTACHMENT_BYTES })).toBe(null)
  })

  it('recusa tipo fora da lista, inclusive executavel', () => {
    expect(attachmentRejection({ mime: 'application/x-msdownload', sizeBytes: 1024 })).toBe(
      'mime_nao_permitido'
    )
    expect(attachmentRejection({ mime: 'text/html', sizeBytes: 1024 })).toBe('mime_nao_permitido')
  })

  it('aceita maiuscula e espaco porque o tipo vem do sistema de arquivos', () => {
    expect(attachmentRejection({ mime: ' IMAGE/PNG ', sizeBytes: 1024 })).toBe(null)
  })

  it('a lista publicada nao tem tipo perigoso', () => {
    expect(ALLOWED_MIME.some(mime => mime.includes('html'))).toBe(false)
    expect(ALLOWED_MIME.some(mime => mime.includes('javascript'))).toBe(false)
  })
})
