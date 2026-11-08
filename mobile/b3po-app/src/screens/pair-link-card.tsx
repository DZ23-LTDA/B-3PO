/**
 * Cartao para colar o link de pareamento.
 *
 * Existe fora do App.tsx por dois motivos: a tela estava no limite do ratchet de complexidade do repo, e
 * o cartao tem regra propria ("Conectar" so habilita com texto) que merece morar junto do proprio JSX.
 */
import { Text, TextInput, TouchableOpacity, View } from 'react-native'

import { cardStyles } from './card-styles'

export interface PairLinkCardProps {
  onChangeText: (value: string) => void
  onSubmit: () => void
  value: string
}

export function PairLinkCard({ onChangeText, onSubmit, value }: PairLinkCardProps) {
  const empty = value.trim().length === 0

  return (
    <View style={cardStyles.card}>
      <Text style={cardStyles.title}>Conectar a um computador</Text>
      <Text style={cardStyles.body}>Cole o link de pareamento que o B-3PO mostrou no computador.</Text>
      <TextInput
        accessibilityLabel="Link de pareamento"
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={onChangeText}
        placeholder="b3po://pair?url=...&token=..."
        placeholderTextColor="#5b6478"
        style={cardStyles.input}
        value={value}
      />
      <TouchableOpacity
        accessibilityLabel="Conectar com este link"
        accessibilityRole="button"
        activeOpacity={0.7}
        disabled={empty}
        onPress={onSubmit}
        style={[cardStyles.button, empty && cardStyles.buttonDisabled]}
      >
        <Text style={cardStyles.buttonText}>Conectar</Text>
      </TouchableOpacity>
    </View>
  )
}
