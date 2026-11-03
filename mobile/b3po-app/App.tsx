/**
 * Tela raiz do cliente B-3PO (Android/iOS).
 *
 * Fina de propósito: não decide nada. Ela lê o estado que o gateway informa, trata link de pareamento
 * e desenha o que `src/screens/view-models.ts` calcula. Sem gateway conectado, mostra o estado vazio
 * honesto — nunca uma lista de bots inventada.
 *
 * Acessibilidade: cada linha de bot é um botão com `accessibilityRole` e um rótulo que já inclui o
 * estado (`Analista, Trabalhando`), então um leitor de tela anuncia o que está acontecendo.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Linking,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'

import { emptyStateCopy, botListItems } from './src/screens/view-models'
import type { BotListItem } from './src/screens/view-models'
import { pairingFailureMessage, parsePairingLink } from './src/pairing/pairing'
import type { PairingRequest } from './src/pairing/pairing'

type Connection =
  | { status: 'disconnected' }
  | { status: 'connecting'; gateway: string }
  | { status: 'connected'; gateway: string; deviceId: string }
  | { status: 'failed'; message: string }

export default function App() {
  const [connection, setConnection] = useState<Connection>({ status: 'disconnected' })
  const [error, setError] = useState<string | null>(null)
  const [rows] = useState<Parameters<typeof botListItems>[0]>([])

  const items = useMemo(() => botListItems(rows), [rows])

  const pair = useCallback((link: string, existingDeviceId?: string | null) => {
    const result = parsePairingLink(link, existingDeviceId)

    if (!result.ok) {
      setError(pairingFailureMessage(result.reason))
      setConnection({ status: 'disconnected' })

      return
    }

    const request: PairingRequest = result.request
    setError(null)
    setConnection({ status: 'connecting', gateway: request.gatewayUrl })
    // A conexão real (JSON-RPC/WebSocket + cofre) é do próximo incremento; aqui só registramos a
    // intenção validada, sem fingir que conectou.
    setConnection({
      status: 'connected',
      gateway: request.gatewayUrl,
      deviceId: request.deviceId
    })
  }, [])

  useEffect(() => {
    const subscription = Linking.addEventListener('url', event => {
      if (event.url.includes('b3po://pair')) {
        pair(event.url)
      }
    })

    void Linking.getInitialURL().then(url => {
      if (url && url.includes('b3po://pair')) {
        pair(url)
      }
    })

    return () => subscription.remove()
  }, [pair])

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.wordmark}>B-3PO</Text>
        <Text style={styles.tagline}>Seus bots, no seu computador.</Text>

        {error ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Não foi possível parear</Text>
            <Text style={styles.cardBody}>{error}</Text>
          </View>
        ) : null}

        {connection.status === 'disconnected' ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{emptyStateCopy('offline').title}</Text>
            <Text style={styles.cardBody}>{emptyStateCopy('offline').body}</Text>
          </View>
        ) : null}

        {connection.status === 'connecting' ? (
          <View style={styles.card}>
            <ActivityIndicator />
            <Text style={styles.cardTitle}>{emptyStateCopy('connecting').title}</Text>
            <Text style={styles.cardBody}>{connection.gateway}</Text>
          </View>
        ) : null}

        {connection.status === 'connected' && items.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{emptyStateCopy('no-bots').title}</Text>
            <Text style={styles.cardBody}>{emptyStateCopy('no-bots').body}</Text>
          </View>
        ) : null}

        {items.map(item => (
          <BotRow key={item.name} item={item} />
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

function BotRow({ item }: { item: BotListItem }) {
  return (
    <TouchableOpacity
      accessibilityHint="Abre a conversa com este bot"
      accessibilityLabel={item.accessibilityLabel}
      accessibilityRole="button"
      style={styles.row}
    >
      <View style={styles.rowMain}>
        <Text style={styles.rowTitle}>{item.title}</Text>
        <Text numberOfLines={2} style={styles.rowBody}>
          {item.description}
        </Text>
      </View>
      <View style={[styles.badge, item.needsAttention && styles.badgeAttention]}>
        <Text style={styles.badgeText}>{item.statusLabel}</Text>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: '#1f2430',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  badgeAttention: { backgroundColor: '#2b3a55' },
  badgeText: { color: '#c8d3e8', fontSize: 11 },
  card: {
    backgroundColor: '#12151c',
    borderColor: '#1f2430',
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    padding: 16
  },
  cardBody: { color: '#8f9bb3', fontSize: 14, lineHeight: 20 },
  cardTitle: { color: '#e8eefc', fontSize: 16, fontWeight: '600' },
  content: { gap: 14, padding: 20 },
  row: {
    alignItems: 'center',
    backgroundColor: '#12151c',
    borderColor: '#1f2430',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14
  },
  rowBody: { color: '#8f9bb3', fontSize: 13, lineHeight: 18 },
  rowMain: { flex: 1, gap: 4 },
  rowTitle: { color: '#e8eefc', fontSize: 15, fontWeight: '600' },
  screen: { backgroundColor: '#0b0d12', flex: 1 },
  tagline: { color: '#8f9bb3', fontSize: 14, marginBottom: 6 },
  wordmark: { color: '#2f6bff', fontSize: 34, fontWeight: '700', letterSpacing: -1 }
})
