import { useEffect, useState } from 'react'

import { fiscalAvailable, fiscalStatus, type FiscalStatus } from '@/api/fiscal'

/**
 * Faixa de status do emissor fiscal.
 *
 * Existe porque o operador precisa saber, ANTES de clicar em "Emitir nota", se o documento terá validade
 * fiscal. Descobrir depois — quando o cliente já recebeu uma nota de homologação — é tarde.
 *
 * Três estados, e cada um diz a verdade:
 *
 * - **homologado** (emissor sem autoridade): "notas sairão em homologação, sem validade fiscal"
 * - **faltando credencial**: nomeia as variáveis que faltam, para o operador saber o que pedir
 * - **sem emissor escolhido**: explica que há emissão de teste e como configurar
 *
 * Não renderiza nada quando a ponte não existe: uma faixa sobre fiscal num app sem fiscal seria ruído.
 */
export function FiscalStatusBanner() {
  const [status, setStatus] = useState<FiscalStatus | null>(null)

  useEffect(() => {
    let vivo = true

    if (!fiscalAvailable()) return

    void fiscalStatus()
      .then(s => {
        if (vivo) setStatus(s)
      })
      .catch(() => {
        // Falha ao consultar o emissor não é motivo para esconder a tela: sem status, sem faixa.
      })

    return () => {
      vivo = false
    }
  }, [])

  if (!status) return null

  const faltando = status.faltando.filter(Boolean)
  const emissorPadrao = status.id === 'sandbox'

  const texto = faltando.length
    ? `Emissor ${status.nome} sem credencial. Faltam: ${faltando.join(', ')}. Enquanto isso, a emissão fica em homologação.`
    : emissorPadrao
      ? 'Emissão em homologação: o documento gerado não tem validade fiscal.'
      : status.homologado
        ? `Emissor ${status.nome} configurado, mas ainda sem adapter de emissão: a nota ficará em homologação.`
        : `Emissor ${status.nome} com autoridade fiscal.`

  return (
    <p
      className="rounded-md border border-(--ui-border) px-3 py-2 text-[length:var(--conversation-caption-font-size)] text-(--ui-text-tertiary)"
      data-fiscal-status={status.id}
      role={status.homologado ? 'status' : undefined}
    >
      {texto}
    </p>
  )
}
