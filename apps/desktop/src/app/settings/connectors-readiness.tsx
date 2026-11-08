/**
 * Prontidão dos conectores de plataforma do gateway (r15 do V5, G4).
 *
 * O QUE ESTA TELA MOSTRA, E O QUE ELA NÃO PROMETE
 *
 * O backend calcula cinco estados honestos. `ready` significa **apto a conectar quando o gateway
 * subir** — esta tela nunca diz "conectado", porque o gateway não afirma socket vivo por esta rota.
 *
 * Falha de leitura **não vira lista vazia**: um erro aparece como erro. A regra é a mesma da home
 * V4 — `null` vira `—`, nunca `0` —, porque "não consegui ler" e "não existe nenhum" são coisas
 * diferentes, e a segunda afirma algo falso sobre o produto.
 */
import { useEffect, useState } from 'react'
import { useI18n } from '@/i18n'
import { ListRow, Pill, SettingsSkeleton } from '@/app/settings/primitives'
import {
  type CargaDeProntidao,
  type EstadoDoConector,
  lerProntidaoDosConectores,
  rotuloDoEstado
} from '@/api/conectores'

/** Tom do selo por estado. `ready` é informativo, **não** é sucesso de conexão. */
const TOM: Record<EstadoDoConector, 'muted' | 'warn' | 'destructive' | 'success'> = {
  ready: 'muted',
  missing_credential: 'warn',
  deps_missing: 'destructive',
  not_configured: 'muted',
  unknown_platform: 'destructive'
}

export function ProntidaoDeConectores() {
  const { t } = useI18n()
  const copy = t.settings.connectorsReadiness
  const [carga, definirCarga] = useState<CargaDeProntidao | null>(null)
  const [tentativa, definirTentativa] = useState(0)

  useEffect(() => {
    let vivo = true

    definirCarga(null)

    void lerProntidaoDosConectores().then(resultado => {
      if (vivo) definirCarga(resultado)
    })

    return () => {
      vivo = false
    }
  }, [tentativa])

  // O título mora AQUI: a função que monta (GatewayConnectionSettings) está no teto do ratchet e
  // não pode ganhar nem uma linha. Um `<h2>` dentro do componente dá a âncora de acessibilidade sem
  // tocar no pai.
  const titulo = (
    <h2 className="mt-6 mb-2 text-[length:var(--conversation-caption-font-size)] text-muted-foreground uppercase">
      {copy.titulo}
    </h2>
  )

  if (!carga) return titulo

  if (carga.estado === 'erro') {
    return (
      <div className="flex flex-col gap-2 py-2">
        {titulo}
        <p className="text-[length:var(--conversation-body-font-size)] text-muted-foreground">
          {copy.erro}
        </p>
        <p className="break-words text-[length:var(--conversation-caption-font-size)] text-muted-foreground">
          {carga.erro}
        </p>
        <div>
          <button
            className="rounded border border-(--ui-border) px-2 py-1 text-[length:var(--conversation-caption-font-size)]"
            onClick={() => definirTentativa(n => n + 1)}
            type="button"
          >
            {copy.tentarDeNovo}
          </button>
        </div>
      </div>
    )
  }

  const { connectors, resumo } = carga.prontidao

  if (connectors.length === 0) {
    // Lista vazia LIDA: o registry não registrou plataforma nenhuma. Não é erro.
    return (
      <div>
        {titulo}
        <p className="py-2 text-[length:var(--conversation-body-font-size)] text-muted-foreground">
          {copy.semPlataformas}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      {titulo}
      <p className="text-[length:var(--conversation-caption-font-size)] text-muted-foreground">
        {copy.resumo
          .replace('{prontos}', String(resumo.prontos))
          .replace('{total}', String(resumo.total))
          .replace('{faltando}', String(resumo.credenciais_faltando.length))}
      </p>
      {connectors.map(conector => (
        <ListRow
          description={conector.next_action}
          key={conector.platform}
          title={conector.platform}
          action={<Pill tone={TOM[conector.status]}>{rotuloDoEstado(conector.status)}</Pill>}
        />
      ))}
    </div>
  )
}
