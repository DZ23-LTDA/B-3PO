import { Pressable, StyleSheet, Text, View } from 'react-native'

import { approvalSummary, choiceLabel, type ApprovalRequest } from '../api/approval'
import { cardStyles } from './card-styles'

/**
 * Faixa de decisão: o computador parou um turno esperando autorização.
 *
 * Fica acima do composer e só aparece com pedido aberto. Cada botão é uma escolha que o backend
 * ofereceu — a tela não inventa opções nem decide sozinha; "Negar" é sempre explícito.
 */
export function ApprovalBar({
  onChoose,
  request
}: {
  onChoose: (choice: string) => void
  request: ApprovalRequest
}) {
  const showsCommand = Boolean(request.command.trim()) && Boolean(request.description.trim())

  return (
    <View style={[cardStyles.card, styles.bar]}>
      <Text style={styles.kicker}>Decisão pendente</Text>
      <Text style={cardStyles.title}>{approvalSummary(request)}</Text>
      {showsCommand ? <Text style={styles.command}>{request.command.trim()}</Text> : null}

      <View style={styles.row}>
        {request.choices.map(choice => (
          <Pressable
            accessibilityRole="button"
            key={choice}
            onPress={() => onChoose(choice)}
            style={({ pressed }) => [
              styles.button,
              choice === 'deny' ? styles.deny : styles.allow,
              pressed ? styles.pressed : null
            ]}
          >
            <Text style={[styles.buttonText, choice === 'deny' ? styles.denyText : null]}>
              {choiceLabel(choice)}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  allow: { backgroundColor: '#2f5bea' },
  bar: { borderColor: '#7a5b12', backgroundColor: '#1d1a10', marginBottom: 8, marginHorizontal: 12 },
  button: { borderRadius: 8, flexGrow: 1, minWidth: 120, paddingHorizontal: 10, paddingVertical: 10 },
  buttonText: { color: '#ffffff', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  command: { color: '#8d97a8', fontFamily: 'monospace', fontSize: 12 },
  deny: { backgroundColor: 'transparent', borderColor: '#7a5b12', borderWidth: 1 },
  denyText: { color: '#e8ecf4' },
  kicker: { color: '#e6b84f', fontSize: 12, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  pressed: { opacity: 0.7 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }
})
