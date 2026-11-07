/**
 * Backups — ver as versões de cada arquivo de negócio e restaurar uma.
 *
 * A tela é chata de propósito. Restaurar **sobrescreve dados reais**: o que a interface pode fazer de
 * útil é mostrar **o que** vai voltar (nome do arquivo, versão, tamanho) e **quando** aquilo foi gravado
 * — e pedir confirmação com essas três coisas na frase, não com um "tem certeza?".
 *
 * O restore é reversível: o estado atual vira mais uma versão antes de ser trocado. Isso mora no processo
 * principal; a tela não é a única defesa.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  RESTORE_ERRO,
  backupAvailable,
  listarBackups,
  restaurarBackup,
  tamanho,
  type ArquivoComBackupRow,
} from '@/api/backup'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/context'

function dataHora(epoch: number): string {
  if (!epoch) return '—'

  return new Date(epoch).toLocaleString('pt-BR', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
  })
}

export function BackupsView() {
  const { t } = useI18n()
  const copy = t.settings.backups

  const [arquivos, setArquivos] = useState<ArquivoComBackupRow[] | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [aberto, setAberto] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    try {
      setArquivos(await listarBackups())
      setFailure(null)
    } catch {
      setArquivos([])
      setFailure(copy.carregarFalhou)
    }
  }, [copy.carregarFalhou])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const disponivel = backupAvailable()

  const total = useMemo(
    () => (arquivos ?? []).reduce((soma, a) => soma + a.versoes.length, 0),
    [arquivos]
  )

  async function restaurar(nome: string, versao: string, quando: number) {
    const confirmado = window.confirm(`${copy.confirmar(nome, dataHora(quando))}\n\n${copy.confirmarDica}`)

    if (!confirmado) return

    setSuccess(null)

    const r = await restaurarBackup(nome, versao)

    if ('error' in r) {
      setFailure(RESTORE_ERRO[r.error] ?? r.error)

      return
    }

    setFailure(null)
    setSuccess(copy.restaurado(nome))
    await carregar()
  }

  if (!disponivel) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-8">
        <h1 className="text-lg font-semibold text-foreground">{copy.title}</h1>

        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
          {copy.indisponivel}
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-8">
      <h1 className="text-lg font-semibold text-foreground">{copy.title}</h1>

      <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
        {copy.intro}
      </p>

      {failure ? (
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-danger)">{failure}</p>
      ) : null}

      {success ? (
        <p className="text-[length:var(--conversation-caption-font-size)] text-foreground">{success}</p>
      ) : null}

      {arquivos === null ? (
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
          {copy.carregando}
        </p>
      ) : arquivos.length === 0 ? (
        <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
          {copy.vazio}
        </p>
      ) : (
        <>
          <p className="text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)">
            {copy.resumo(arquivos.length, total)}
          </p>

          <section className="flex flex-col gap-1">
            {arquivos.map(arq => (
              <div className="flex flex-col gap-1 border-b border-(--ui-border) py-2" key={arq.nome}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[length:var(--conversation-caption-font-size)] text-foreground">
                    {arq.nome}
                    <span className="ml-2 text-(--ui-text-tertiary)">
                      {copy.versoes(arq.versoes.length)}
                    </span>
                  </span>

                  <Button
                    onClick={() => setAberto(aberto === arq.nome ? null : arq.nome)}
                    variant="ghost"
                  >
                    {aberto === arq.nome ? copy.ocultar : copy.ver}
                  </Button>
                </div>

                {aberto === arq.nome ? (
                  <table className="w-full border-collapse text-left text-[length:var(--conversation-caption-font-size)]">
                    <thead>
                      <tr className="text-(--ui-text-tertiary)">
                        <th className="py-1 pr-2 font-medium">{copy.colunas.quando}</th>
                        <th className="py-1 pr-2 font-medium">{copy.colunas.tamanho}</th>
                        <th className="py-1 pr-2 font-medium">{copy.colunas.arquivo}</th>
                        <th className="py-1 font-medium">
                          <span className="sr-only">{copy.colunas.acoes}</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {arq.versoes.map(v => (
                        <tr key={v.arquivo}>
                          <td className="py-1 pr-2 text-(--ui-text-secondary)">{dataHora(v.quando)}</td>
                          <td className="py-1 pr-2 text-(--ui-text-secondary)">{tamanho(v.bytes)}</td>
                          <td className="py-1 pr-2 text-(--ui-text-tertiary)">{v.arquivo}</td>
                          <td className="py-1">
                            <div className="flex justify-end">
                              <Button onClick={() => void restaurar(arq.nome, v.arquivo, v.quando)} variant="ghost">
                                {copy.restaurar}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : null}
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  )
}
