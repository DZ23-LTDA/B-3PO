/**
 * O que a tela mostra para cada estado de conexão.
 *
 * Antes isso era JSX dentro do `App.tsx` e o cartão aparecia só com o título no aparelho — um defeito
 * impossível de testar naquele formato. Aqui é dado puro (título + corpo), com teste; a tela só
 * desenha. Se o texto estiver errado, o teste pega; se o teste estiver verde e a tela em branco, o
 * problema é de layout, não de lógica.
 */

export type ConnectionState =
  | { status: 'disconnected' }
  /** O usuario tocou em Desconectar: nao e falha de rede, e uma escolha. */
  | { status: 'signed_out' }
  | { status: 'connecting'; origin: string }
  | {
      status: 'connected'
      origin: string
      deviceId: string
      /** Token de sessao do pareamento; sem ele os endpoints protegidos recusam. */
      token: string
      health: { ok: boolean; commit: string | null; authRequired: boolean }
      // Nome 'gateway' e nao 'status': em rodada anterior o campo se chamava 'status' e SOBRESCREVIA o
      // discriminante da uniao, entao `state.status` era o objeto do gateway e o switch caia no default
      // (a tela mostrava 'Estado inesperado'). Colisao silenciosa, pega pelo teste.
      gateway: { gatewayRunning: boolean; gatewayState: string | null; configVersion: number | null } | null
      checkedAt: number
    }
  | { status: 'failed'; origin: string; message: string }

export interface StatusCard {
  title: string
  body: string
}

export const SIGNED_OUT_TITLE = 'Desconectado deste computador'
export const SIGNED_OUT_BODY =
  'Abra o link de pareamento (b3po://pair?url=…&token=…) para conectar de novo.'

export const OFFLINE_TITLE = 'Sem conexão com o computador'
export const OFFLINE_BODY =
  'Verifique se o B-3PO está aberto na mesma rede. Suas ações continuam pendentes até reconectar.'

/** Traduz o estado em texto de tela. Nunca devolve `null`: tela em branco não informa nada. */
export function statusCard(state: ConnectionState, pairingError: string | null = null): StatusCard {
  if (pairingError) {
    return { title: 'Não foi possível parear', body: pairingError }
  }

  switch (state.status) {
    case 'disconnected':
      return { title: OFFLINE_TITLE, body: OFFLINE_BODY }
    case 'signed_out':
      // Depois de desconectar, dizer "sem conexão" seria mentira: a conexão foi encerrada de proposito.
      return { title: SIGNED_OUT_TITLE, body: SIGNED_OUT_BODY }
    case 'connecting':
      return { title: 'Conectando…', body: `Falando com o computador em ${state.origin}` }
    case 'failed':
      return { title: 'Sem conexão com o computador', body: state.message }
    case 'connected': {
      const lines = [
        `Servidor: ${state.origin}`,
        `Compilação: ${state.health.commit ?? 'não informada'}`,
        `Token exigido: ${state.health.authRequired ? 'sim' : 'não'}`
      ]

      if (state.gateway?.gatewayRunning !== undefined) {
        lines.push(`Gateway: ${state.gateway.gatewayRunning ? 'rodando' : 'parado'}`)
      }

      if (state.gateway?.gatewayState) {
        lines.push(`Estado: ${state.gateway.gatewayState}`)
      }

      return { title: 'Conectado ao computador', body: lines.join('\n') }
    }
    default:
      // Estado fora do contrato: melhor dizer que algo saiu do esperado do que fingir normalidade.
      return {
        title: 'Estado inesperado',
        body: `Feche e abra o aplicativo. Se repetir, informe: ${JSON.stringify(state)}`
      }
  }
}
