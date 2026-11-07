/**
 * Lista de conversas do bot aberto.
 *
 * Antes o aparelho abria sempre a conversa mais recente: para retomar outra, so pelo desktop. O servidor ja
 * expunha `/api/sessions?profile=<bot>`; faltava escolher. Aqui so o desenho e o toque — a decisao de qual
 * conversa abrir vive no App.
 */
import { ScrollView, Text, TouchableOpacity, View } from 'react-native'

import { cardStyles } from './card-styles'
import type { SessionRow } from './chat-session'
import { sessionRowLabel } from './chat-session'

export interface SessionPickerProps {
  onClose: () => void
  onSelect: (session: SessionRow) => void
  sessions: readonly SessionRow[]
}

export function SessionPicker({ onClose, onSelect, sessions }: SessionPickerProps) {
  return (
    <View style={cardStyles.card}>
      <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={cardStyles.title}>Conversas ({sessions.length})</Text>
        <TouchableOpacity accessibilityLabel="Fechar lista de conversas" accessibilityRole="button" onPress={onClose}>
          <Text style={{ color: '#7f9cff', fontSize: 15 }}>Fechar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ maxHeight: 320 }}>
        {sessions.length === 0 ? (
          <Text style={cardStyles.body}>Nenhuma conversa ainda. Envie a primeira mensagem.</Text>
        ) : (
          sessions.map(session => (
            <TouchableOpacity
              accessibilityLabel={sessionRowLabel(session)}
              accessibilityRole="button"
              activeOpacity={0.7}
              key={session.id}
              onPress={() => onSelect(session)}
              style={{ borderTopColor: '#222b3a', borderTopWidth: 1, gap: 4, paddingVertical: 10 }}
            >
              <Text style={{ color: '#e8ecf4', fontSize: 15 }} numberOfLines={1}>
                {session.title}
                {session.unread ? '  •' : ''}
              </Text>
              {session.preview ? (
                <Text style={cardStyles.body} numberOfLines={1}>
                  {session.preview}
                </Text>
              ) : null}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  )
}
