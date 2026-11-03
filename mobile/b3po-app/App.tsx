/**
 * Tela raiz do cliente B-3PO (Android/iOS).
 *
 * Fina de propósito: não decide nada. Ela lê o estado que o gateway informa, trata link de pareamento,
 * navega com `src/app/router.ts` e desenha o que `src/screens/view-models.ts` calcula. Sem gateway
 * conectado, mostra o estado vazio honesto — nunca uma lista de bots inventada.
 *
 * Acessibilidade: cada linha é um botão com `accessibilityRole` e rótulo que já inclui o estado
 * (`Analista, Trabalhando`), então o leitor de tela anuncia o que está acontecendo.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'
import { SafeAreaView } from 'react-native'

import { back, backLabel, currentRoute, headerTitle, initialNav, openChat } from './src/app/router'
import type { NavState } from './src/app/router'
import { emptyStateCopy, botListItems } from './src/screens/view-models'
import type { BotListItem } from './src/screens/view-models'
import { pairingFailureMessage, parsePairingLink } from './src/pairing/pairing'

type Connection =
  | { status: 'disconnected' }
  | { status: 'connecting'; gateway: string }
  | { status: 'connected'; gateway: string; deviceId: string }

export default function App() {
  const [connection, setConnection] = useState<Connection>({ status: 'disconnected' })
  const [error, setError] = useState<string | null>(null)
  const [nav, setNav] = useState<NavState>(initialNav)
  const [rows] = useState<Parameters<typeof botListItems>[0]>([])

  const items = useMemo(() => botListItems(rows), [rows])
  const route = currentRoute(nav)

  const pair = useCallback((link: string) => {
    const result = parsePairingLink(link)

    if (!result.ok) {
      setError(pairingFailureMessage(result.reason))
      setConnection({ status: 'disconnected' })

      return
    }

    setError(null)
    setConnection({ status: 'connecting', gateway: result.request.gatewayUrl })
    // A conexão JSON-RPC real é o próximo incremento; aqui registramos só a intenção validada.
    setConnection({ status: 'connected', gateway: result.request.gatewayUrl, deviceId: result.request.deviceId })
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
      <View style={styles.header}>
        {route.name === 'chat' ? (
          <TouchableOpacity
            accessibilityLabel={backLabel(nav)}
            accessibilityRole="button"
            onPress={() => setNav(back(nav))}
            style={styles.back}
          >
            <Text style={styles.backText}>‹ {backLabel(nav)}</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.wordmark}>B-3PO</Text>
        )}
        {route.name === 'chat' ? <Text style={styles.headerTitle}>{headerTitle(route)}</Text> : null}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {route.name === 'bots' ? (
          <BotList
            connection={connection}
            error={error}
            items={items}
            onOpen={item => setNav(openChat(nav, { name: item.name, title: item.title }))}
          />
        ) : (
          <ChatScreen botName={route.botName} connection={connection} />
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function BotList({
  connection,
  error,
  items,
  onOpen
}: {
  connection: Connection
  error: string | null
  items: BotListItem[]
  onOpen: (item: BotListItem) => void
}) {
  return (
    <>
      <Text style={styles.tagline}>Seus bots, no seu computador.</Text>

      {error ? <Card title="Não foi possível parear" body={error} /> : null}

      {connection.status === 'disconnected' ? (
        <Card title={emptyStateCopy('offline').title} body={emptyStateCopy('offline').body} />
      ) : null}

      {connection.status === 'connecting' ? (
        <View style={styles.card}>
          <ActivityIndicator />
          <Text style={styles.cardTitle}>{emptyStateCopy('connecting').title}</Text>
          <Text style={styles.cardBody}>{connection.gateway}</Text>
        </View>
      ) : null}

      {connection.status === 'connected' && items.length === 0 ? (
        <Card title={emptyStateCopy('no-bots').title} body={emptyStateCopy('no-bots').body} />
      ) : null}

      {items.map(item => (
        <TouchableOpacity
          accessibilityHint="Abre a conversa com este bot"
          accessibilityLabel={item.accessibilityLabel}
          accessibilityRole="button"
          key={item.name}
          onPress={() => onOpen(item)}
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
      ))}
    </>
  )
}

function ChatScreen({ botName, connection }: { botName: string; connection: Connection }) {
  if (connection.status !== 'connected') {
    return <Card title={emptyStateCopy('offline').title} body={emptyStateCopy('offline').body} />
  }

  return (
    <>
      <Card
        title="Conversa"
        body={`Conectado a ${connection.gateway}. As mensagens deste bot aparecem aqui quando o gateway responder.`}
      />
      <Text style={styles.meta}>Bot: {botName}</Text>
    </>
  )
}

function Card({ body, title }: { body: string; title: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardBody}>{body}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  back: { paddingVertical: 4 },
  backText: { color: '#7f9cff', fontSize: 15 },
  badge: { backgroundColor: '#1f2430', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
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
  header: { alignItems: 'center', flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 12 },
  headerTitle: { color: '#e8eefc', fontSize: 17, fontWeight: '600' },
  meta: { color: '#5f6b83', fontSize: 12 },
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
  tagline: { color: '#8f9bb3', fontSize: 14 },
  wordmark: { color: '#2f6bff', fontSize: 26, fontWeight: '700', letterSpacing: -0.5 }
})
