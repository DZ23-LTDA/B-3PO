/**
 * Chrome da tela de conversa: cabecalho com voltar/titulo, o atalho para as conversas do bot e a lista.
 *
 * Vive fora do App.tsx para a tela nao acumular ramos de layout (o repo limita a complexidade por funcao e o
 * aviso veio do proprio gate). Nao decide nada: recebe o que mostrar e para onde ir.
 */
import { Text, TouchableOpacity, View } from 'react-native'

import type { SessionRow } from './chat-session'
import { SessionPicker } from './session-picker'

export interface ChatChromeProps {
  backLabel: string
  onBack: () => void
  onCloseSessions: () => void
  onSelectSession: (session: SessionRow) => void
  onToggleSessions: () => void
  sessions: readonly SessionRow[]
  showSessions: boolean
  showMenu: boolean
  title: string
  wordmark: string
}

export function ChatChrome(props: ChatChromeProps) {
  const { backLabel, onBack, onCloseSessions, onSelectSession, onToggleSessions } = props
  const { sessions, showMenu, showSessions, title, wordmark } = props

  return (
    <>
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 12 }}>
        {showMenu ? (
          <TouchableOpacity accessibilityLabel={backLabel} accessibilityRole="button" onPress={onBack}>
            <Text style={{ color: '#7f9cff', fontSize: 15 }}>‹ {backLabel}</Text>
          </TouchableOpacity>
        ) : (
          <Text style={{ color: '#e8eefc', fontSize: 22, fontWeight: '700' }}>{wordmark}</Text>
        )}
        {showMenu ? (
          <Text style={{ color: '#e8eefc', flexShrink: 1, fontSize: 17, fontWeight: '600' }}>{title}</Text>
        ) : null}
      </View>

      {showMenu && sessions.length > 0 ? (
        <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
          <TouchableOpacity
            accessibilityLabel={`Conversas deste bot (${sessions.length})`}
            accessibilityRole="button"
            onPress={onToggleSessions}
          >
            <Text style={{ color: '#7f9cff', fontSize: 15 }}>Conversas ({sessions.length})</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {showMenu && showSessions ? (
        <SessionPicker onClose={onCloseSessions} onSelect={onSelectSession} sessions={sessions} />
      ) : null}
    </>
  )
}
