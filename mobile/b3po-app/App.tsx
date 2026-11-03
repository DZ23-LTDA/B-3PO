/**
 * Tela raiz do cliente B-3PO (Android/iOS).
 *
 * Fina de propósito: não decide nada. A lógica de "o que mostrar" vive em `src/screens/status-card.ts`
 * (testada) e a navegação em `src/app/router.ts` (testada). Aqui só há desenho.
 *
 * Depois do pareamento a tela consulta o servidor de verdade (`/api/health` e `/api/status` via
 * `RestClient`) e mostra o que recebeu — sem dado de exemplo. Sem servidor, diz isso em português.
 *
 * Nota de layout: o texto do cartão é renderizado em `<Text>` direto dentro de `<View>`, sem
 * componente intermediário. A versão anterior com um wrapper `Card` desenhava só o título no aparelho
 * (defeito registrado no MOBILE-REPORT) e este caminho mais curto remove a variável.
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
import { RestClient, restFailureMessage } from './src/api/rest-client'
import type { BotProfile } from './src/api/rest-client'
import { chatBubbles, chatEmptyCopy, sessionRows } from './src/screens/chat-session'
import type { ChatBubble, RawMessage } from './src/screens/chat-session'
import { statusCard } from './src/screens/status-card'
import type { ConnectionState } from './src/screens/status-card'
import { pairingFailureMessage, parsePairingLink } from './src/pairing/pairing'

export default function App() {
  const [connection, setConnection] = useState<ConnectionState>({ status: 'disconnected' })
  const [error, setError] = useState<string | null>(null)
  const [nav, setNav] = useState<NavState>(initialNav)
  const [bots, setBots] = useState<BotProfile[]>([])
  const [bubbles, setBubbles] = useState<ChatBubble[]>([])
  const [chatNote, setChatNote] = useState<string | null>(null)
  const [chatLoading, setChatLoading] = useState(false)

  const route = currentRoute(nav)
  const card = statusCard(connection, error)
  const botItems = useMemo(
    () =>
      bots.map(bot => ({
        name: bot.name,
        title: bot.title,
        description: bot.description || `${bot.provider ?? 'provider'} · ${bot.model ?? 'modelo não definido'}`
      })),
    [bots]
  )

  const connect = useCallback(async (origin: string, deviceId: string, token: string) => {
    setConnection({ status: 'connecting', origin })

    const client = new RestClient({ origin, token })

    try {
      const health = await client.health()
      const gateway = await client.status().catch(() => null)
      // A lista de bots NÃO é pública: com token vem de /api/profiles; sem token, fica vazia e a tela
      // mostra o estado vazio honesto em vez de inventar bots.
      const profiles = await client.profiles().catch(() => [] as BotProfile[])

      setBots(profiles)
      setConnection({ status: 'connected', origin, deviceId, token, health, gateway, checkedAt: Date.now() })
    } catch (failure) {
      const detail = failure instanceof Error ? failure.message : String(failure)

      setConnection({
        status: 'failed',
        origin,
        message: `${restFailureMessage(failure)}\n\nDetalhe técnico: ${detail}`
      })
    }
  }, [])

  /** Abre o bot: busca a conversa mais recente e carrega as mensagens do servidor. */
  const openBot = useCallback(
    async (bot: BotProfile) => {
      setNav(state => openChat(state, { name: bot.name, title: bot.title }))
      setBubbles([])
      setChatNote(null)

      const token = connection.status === 'connected' ? connection.token : ''
      const origin = connection.status === 'connected' ? connection.origin : ''

      if (!origin || !token) {
        setChatNote(chatEmptyCopy('not-connected').body)

        return
      }

      setChatLoading(true)

      try {
        const client = new RestClient({ origin, token })
        const sessions = sessionRows(await client.sessions(bot.name))

        if (sessions.length === 0) {
          setChatNote(chatEmptyCopy('no-sessions').body)
        } else {
          const messages = await client.messages(bot.name, sessions[0]!.id)
          const loaded = chatBubbles(messages as RawMessage[])

          setBubbles(loaded)
          setChatNote(loaded.length === 0 ? chatEmptyCopy('no-messages').body : null)
        }
      } catch (failure) {
        setChatNote(restFailureMessage(failure))
      } finally {
        setChatLoading(false)
      }
    },
    [connection]
  )

  const pair = useCallback(
    (value: string) => {
      const result = parsePairingLink(value)

      if (!result.ok) {
        setError(pairingFailureMessage(result.reason))
        setConnection({ status: 'disconnected' })

        return
      }

      setError(null)
      void connect(result.request.gatewayUrl, result.request.deviceId, result.request.token)
    },
    [connect]
  )

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
          <View style={styles.block}>
            <Text style={styles.tagline}>Seus bots, no seu computador.</Text>

            {connection.status === 'connecting' ? <ActivityIndicator color="#7f9cff" /> : null}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>{card.title}</Text>
              <Text style={styles.cardBody}>{card.body}</Text>
            </View>

            {connection.status === 'connected' && botItems.length === 0 ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Nenhum bot ainda</Text>
                <Text style={styles.cardBody}>
                  Os bots são criados no computador. Depois de criar um, ele aparece aqui para conversar.
                </Text>
              </View>
            ) : null}

            {botItems.map(item => (
              <TouchableOpacity
                accessibilityHint="Abre a conversa com este bot"
                accessibilityRole="button"
                key={item.name}
                onPress={() => void openBot(bots.find(bot => bot.name === item.name) ?? { name: item.name, title: item.title, description: '', model: null, provider: null, gatewayRunning: false, isDefault: false })}
                style={styles.row}
              >
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text numberOfLines={2} style={styles.rowBody}>
                  {item.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.block}>
            {chatLoading ? <ActivityIndicator color="#7f9cff" /> : null}

            {chatNote ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Conversa</Text>
                <Text style={styles.cardBody}>{chatNote}</Text>
              </View>
            ) : null}

            {bubbles.map(bubble => (
              <View
                accessibilityLabel={`${bubble.label}: ${bubble.body}`}
                key={bubble.id}
                style={[styles.bubble, bubble.align === 'right' ? styles.bubbleRight : styles.bubbleLeft]}
              >
                <Text style={styles.bubbleLabel}>{bubble.label}</Text>
                <Text style={styles.bubbleBody}>{bubble.body}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  back: { paddingVertical: 4 },
  backText: { color: '#7f9cff', fontSize: 15 },
  block: { gap: 14 },
  bubble: { borderRadius: 12, maxWidth: '88%', padding: 12 },
  bubbleBody: { color: '#e8eefc', fontSize: 14, lineHeight: 20 },
  bubbleLabel: { color: '#7f9cff', fontSize: 11, marginBottom: 2 },
  bubbleLeft: { alignSelf: 'flex-start', backgroundColor: '#12151c', borderColor: '#1f2430', borderWidth: 1 },
  bubbleRight: { alignSelf: 'flex-end', backgroundColor: '#1b2b52' },
  card: {
    backgroundColor: '#12151c',
    borderColor: '#1f2430',
    borderRadius: 14,
    borderWidth: 1,
    padding: 16
  },
  cardBody: { color: '#8f9bb3', fontSize: 14, lineHeight: 20, marginTop: 6 },
  cardTitle: { color: '#e8eefc', fontSize: 16, fontWeight: '600' },
  content: { padding: 20 },
  header: { alignItems: 'center', flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 12 },
  headerTitle: { color: '#e8eefc', fontSize: 17, fontWeight: '600' },
  row: {
    backgroundColor: '#12151c',
    borderColor: '#1f2430',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14
  },
  rowBody: { color: '#8f9bb3', fontSize: 13, lineHeight: 18, marginTop: 4 },
  rowTitle: { color: '#e8eefc', fontSize: 15, fontWeight: '600' },
  screen: { backgroundColor: '#0b0d12', flex: 1 },
  tagline: { color: '#8f9bb3', fontSize: 14 },
  wordmark: { color: '#2f6bff', fontSize: 26, fontWeight: '700', letterSpacing: -0.5 }
})
