/**
 * Backup e restore dos dados de negócio no renderer.
 *
 * A tela é deliberadamente **chata**: uma lista de arquivos, as versões de cada um, e um botão. Restaurar
 * sobrescreve dados reais, então a interface não tenta ser esperta — ela mostra **o que** vai voltar e
 * **quando** aquilo foi gravado, e pede confirmação.
 *
 * O restore é **reversível**: o estado atual vira mais uma versão antes de ser trocado. Isso está no
 * processo principal (`backup-restore.ts`), não aqui — o renderer não pode ser a única coisa entre um
 * clique errado e a perda do dado.
 */

export interface VersaoBackupRow {
  arquivo: string
  bytes: number
  quando: number
}

export interface ArquivoComBackupRow {
  nome: string
  versoes: VersaoBackupRow[]
}

export interface ResultadoRestoreRow {
  arquivoSalvo: string
  bytes: number
  ok: true
  versaoAplicada: string
}

interface BackupBridge {
  list: () => Promise<{ arquivos: ArquivoComBackupRow[] }>
  restore: (nomeArquivo: string, versaoArquivo: string) => Promise<{ error: string; ok: false } | ResultadoRestoreRow>
}

function bridge(): BackupBridge | null {
  const host = (globalThis as { hermesDesktop?: { backup?: BackupBridge } }).hermesDesktop

  return host?.backup ?? null
}

export function backupAvailable(): boolean {
  return bridge() !== null
}

export async function listarBackups(): Promise<ArquivoComBackupRow[]> {
  const api = bridge()

  if (!api) return []

  const r = await api.list()

  return r.arquivos ?? []
}

export async function restaurarBackup(nome: string, versao: string) {
  const api = bridge()

  return api ? api.restore(nome, versao) : { error: 'indisponivel', ok: false as const }
}

/** Tamanho legível — o painel mostra que uma versão é 0,1 KB e a de trabalho 851 KB. */
export function tamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`

  const kb = bytes / 1024

  return kb < 1024 ? `${kb.toFixed(1).replace('.', ',')} KB` : `${(kb / 1024).toFixed(1).replace('.', ',')} MB`
}

export const RESTORE_ERRO: Record<string, string> = {
  arquivo_invalido: 'Nome de arquivo inválido.',
  falha_ao_restaurar: 'Falha ao restaurar. Nada foi alterado.',
  indisponivel: 'Restaurar precisa do aplicativo desktop.',
  versao_corrompida: 'Aquela versão não é JSON válido — restaurar trocaria um dado bom por lixo.',
  versao_de_outro_arquivo: 'Aquela versão pertence a outro arquivo.',
  versao_invalida: 'Nome de versão inválido.',
  versao_nao_encontrada: 'A versão não existe mais.',
}
