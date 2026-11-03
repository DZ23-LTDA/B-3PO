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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Linking,
  ScrollView,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'
import { SafeAreaView } from 'react-native'

import { back, backLabel, currentRoute, headerTitle, initialNav, openChat } from './src/app/router'
import type { NavState } from './src/app/router'
import { RestClient, restFailureMessage } from './src/api/rest-client'
import type { BotProfile } from './src/api/rest-client'
import { GatewayChatSocket } from './src/api/gateway-chat-socket'
import {
  FOLLOW_UP_DELAYS_MS,
  chatBubbles,
  chatEmptyCopy,
  sessionRows,
  shouldFollowUp,
  shouldReplaceBubbles
} from './src/screens/chat-session'
import type { ChatBubble, RawMessage, SessionRow } from './src/screens/chat-session'
import { nextRetryDelay, RETRY_BUTTON_LABEL, retryingCopy } from './src/api/retry'
import { isStaleSession } from './src/api/session-guard'
import { PairLinkCard } from './src/screens/pair-link-card'
import { ChatChrome } from './src/screens/chat-chrome'
import { statusCard } from './src/screens/status-card'
import type { ConnectionState } from './src/screens/status-card'
import { pairingFailureMessage, parsePairingLink } from './src/pairing/pairing'

export default function App() {
  const [connection, setConnection] = useState<ConnectionState>({ status: 'disconnected' })
  // Falhas seguidas de conexao: decide se ainda vale tentar sozinho ou se so o toque resolve.
  const [attempt, setAttempt] = useState(0)
  // Sem o deep link a mao o usuario ficava sem saida depois de desconectar; aqui ele cola o link.
  const [pairLink, setPairLink] = useState('')
  // Conversas do bot aberto: o aparelho so mostrava a mais recente e nao deixava escolher.
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [showSessions, setShowSessions] = useState(false)
  // Cada Desconectar invalida os pedidos que ja sairam (senao um connect() em voo ressuscita a sessao).
  const sessionGeneration = useRef(0)
  // O estado 'failed' guarda so origem+mensagem; para reconectar preciso das credenciais do pareamento.
  const lastCredentials = useRef<{ origin: string; deviceId: string; token: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [nav, setNav] = useState<NavState>(initialNav)
  const [bots, setBots] = useState<BotProfile[]>([])
  const [bubbles, setBubbles] = useState<ChatBubble[]>([])
  const [chatNote, setChatNote] = useState<string | null>(null)
  const [chatLoading, setChatLoading] = useState(false)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const socketRef = useRef<GatewayChatSocket | null>(null)

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
    const startedAt = sessionGeneration.current

    lastCredentials.current = { origin, deviceId, token }
    setConnection({ status: 'connecting', origin })

    const client = new RestClient({ origin, token })

    try {
      const health = await client.health()
      const gateway = await client.status().catch(() => null)
      // A lista de bots NÃO é pública: com token vem de /api/profiles; sem token, fica vazia e a tela
      // mostra o estado vazio honesto em vez de inventar bots.
      const profiles = await client.profiles().catch(() => [] as BotProfile[])

      // Desconectar durante o pedido: o resultado chegou tarde e nao pode reabrir a sessao.
      if (isStaleSession(startedAt, sessionGeneration.current)) {
        return
      }

      setBots(profiles)
      setAttempt(0)
      setConnection({ status: 'connected', origin, deviceId, token, health, gateway, checkedAt: Date.now() })
    } catch (failure) {
      if (isStaleSession(startedAt, sessionGeneration.current)) {
        return
      }

      const detail = failure instanceof Error ? failure.message : String(failure)

      setAttempt(previous => previous + 1)
      setConnection({
        status: 'failed',
        origin,
        message: `${restFailureMessage(failure)}\n\nDetalhe técnico: ${detail}`
      })
    }
  }, [])

  // Reconexao com espera crescente: 1s, 3s, 8s. Depois disso o cartao oferece o toque manual —
  // insistir sozinho para sempre esconde do usuario que o servidor nao esta la.
  useEffect(() => {
    if (connection.status !== 'failed') {
      return
    }

    const delay = nextRetryDelay(Math.max(0, attempt - 1))
    const credentials = lastCredentials.current

    if (delay === null || !credentials) {
      return
    }

    const timer = setTimeout(() => {
      void connect(credentials.origin, credentials.deviceId, credentials.token)
    }, delay)

    return () => clearTimeout(timer)
  }, [attempt, connect, connection])

  /** Desconectar: escolha do usuario, nao falha. Para o retry e esquece as credenciais em memoria. */
  const disconnect = useCallback(() => {
    // Invalida qualquer connect() em voo: sem isso o pedido antigo sobrescreveria 'signed_out'.
    sessionGeneration.current += 1
    lastCredentials.current = null
    setAttempt(0)
    setBots([])
    // Erro de pareamento antigo mascararia o cartao "Desconectado".
    setError(null)
    // O link antigo nao pode ficar no campo: na proxima conexao ele se mistura com o texto novo.
    setPairLink('')
    setConnection({ status: 'signed_out' })
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
        const found = sessionRows(await client.sessions(bot.name))

         setSessions(found)

        if (sessions.length === 0) {
          setChatNote(chatEmptyCopy('no-sessions').body)
        } else {
          const messages = await client.messages(bot.name, found[0]!.id)
          const loaded = chatBubbles(messages as RawMessage[])

          setBubbles(loaded)
          setChatNote(loaded.length === 0 ? chatEmptyCopy('no-messages').body : null)
        }
      } catch (failure) {
        setChatNote(restFailureMessage(failure))
      } finally {
        setChatLoading(false)
      }

      // Socket de envio: mesmo contrato provado contra o servidor real
      // (?token= + Origin + sem subprotocolo). Criado sob demanda, fechado ao sair.
      if (!socketRef.current) {
        socketRef.current = new GatewayChatSocket(origin, token, (url, options) => {
          // React Native: new WebSocket(url, protocols, options). Passar as options no lugar de
          // `protocols` (2º argumento) não abre o socket — o contrato exige o 2º vazio.
          const Impl = WebSocket as unknown as {
            new (u: string, p: string[], o?: { headers?: Record<string, string> }): WebSocket
          }

          return new Impl(url, [], options) as unknown as never
        })
      }
    },
    [connection]
  )

  /** Abre uma conversa especifica do bot aberto (escolhida na lista). */
  const openSession = useCallback(
    async (session: SessionRow) => {
      setShowSessions(false)
      setChatNote(null)

      // A navegacao e um NavState: a rota atual vem de currentRoute, e o campo do bot e `botName`
      // (usar `nav.name`/`nav.bot` aqui fazia a funcao retornar sem carregar nada).
      const route = currentRoute(nav)

      if (connection.status !== 'connected' || route.name !== 'chat') {
        return
      }

      setChatLoading(true)

      try {
        const client = new RestClient({ origin: connection.origin, token: connection.token })
        const loaded = chatBubbles((await client.messages(route.botName, session.id)) as RawMessage[])

        setBubbles(loaded)
        setChatNote(loaded.length === 0 ? chatEmptyCopy('no-messages').body : null)
      } catch (failure) {
        setChatNote(restFailureMessage(failure))
      } finally {
        setChatLoading(false)
      }
    },
    [connection, nav]
  )

  /** Envia o texto digitado pelo transporte do gateway. */
  const sendDraft = useCallback(async () => {
    const text = draft.trim()

    if (!text || sending) {
      return
    }

    if (connection.status !== 'connected') {
      setChatNote('Sem conexão com o computador: pareie o aparelho para enviar.')

      return
    }

    setSending(true)
    setChatNote(null)

    // Cria o socket aqui se ainda não existir: depender de `openBot` fazer isso deixava o botão
    // sem ação quando a conversa abria antes de a conexão ficar pronta (falha silenciosa).
    if (!socketRef.current) {
      const originHere = connection.origin
      const tokenHere = connection.token

      socketRef.current = new GatewayChatSocket(originHere, tokenHere, (url, options) => {
        const Impl = WebSocket as unknown as {
          new (u: string, p: string[], o?: { headers?: Record<string, string> }): WebSocket
        }

        return new Impl(url, [], options) as unknown as never
      })
    }

    const socket = socketRef.current

    try {
      await socket.connect()
      const result = await socket.sendPrompt(text)

      if (result.accepted) {
        setDraft('')

        // O envio é aceito antes de o modelo terminar: recarrega do servidor em passos curtos até a
        // resposta aparecer. A bolha que entra na tela é a persistida, nunca uma otimista.
        const originNow = connection.status === 'connected' ? connection.origin : ''
        const tokenNow = connection.status === 'connected' ? connection.token : ''
        const botName = nav.kind === 'chat' ? nav.bot.name : ''
        const client = new RestClient({ origin: originNow, token: tokenNow })

        const load = async (): Promise<RawMessage[]> =>
          (await client.messages(botName, socket.getSessionId() ?? '', 50)) as RawMessage[]

        let previous = bubbles.length

        for (let attempt = 0; attempt <= FOLLOW_UP_DELAYS_MS.length; attempt += 1) {
          if (attempt > 0) {
            await new Promise(resolve => setTimeout(resolve, FOLLOW_UP_DELAYS_MS[attempt - 1]))
          }

          try {
            const loaded = chatBubbles(await load())

            setBubbles(current => (shouldReplaceBubbles(current, loaded) ? loaded : current))

            if (!shouldFollowUp({ previousCount: previous, currentCount: loaded.length, attempt, stopped: false })) {
              previous = loaded.length
              break
            }

            previous = loaded.length
          } catch {
            break
          }
        }
      } else {
        setChatNote('O computador não confirmou o envio.')
      }
    } catch (failure) {
      const message =
        failure && typeof failure === 'object' && 'message' in failure
          ? String((failure as { message: unknown }).message)
          : 'Falha ao enviar'

      setChatNote(`Não foi possível enviar: ${message}`)
    } finally {
      setSending(false)
    }
  }, [draft, sending, connection, nav])

  const pair = useCallback(
    (value: string) => {
      const result = parsePairingLink(value)

      if (!result.ok) {
        setError(pairingFailureMessage(result.reason))
        setConnection({ status: 'disconnected' })

        return
      }

      setError(null)
      setPairLink('')
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
        <ChatChrome
          backLabel={backLabel(nav)}
          onBack={() => setNav(back(nav))}
          onCloseSessions={() => setShowSessions(false)}
          onSelectSession={row => void openSession(row)}
          onToggleSessions={() => setShowSessions(open => !open)}
          sessions={sessions}
          showMenu={route.name === 'chat'}
          showSessions={showSessions}
          title={route.name === 'chat' ? headerTitle(route) : ''}
          wordmark="B-3PO"
        />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        style={styles.body}
      >
        <ScrollView contentContainerStyle={styles.content}>
        {route.name === 'bots' ? (
          <View style={styles.block}>
            <Text style={styles.tagline}>Seus bots, no seu computador.</Text>

            {connection.status === 'connecting' ? <ActivityIndicator color="#7f9cff" /> : null}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>{card.title}</Text>
              <Text style={styles.cardBody}>{card.body}</Text>

              {connection.status === 'connected' ? (
                <TouchableOpacity
                  accessibilityLabel="Desconectar deste computador"
                  accessibilityRole="button"
                  activeOpacity={0.7}
                  onPress={disconnect}
                  style={styles.disconnectButton}
                >
                  <Text style={styles.disconnectText}>Desconectar</Text>
                </TouchableOpacity>
              ) : null}

              {connection.status === 'failed' ? (
                <>
                  <Text style={styles.cardBody}>{retryingCopy(Math.max(0, attempt - 1))}</Text>
                  <TouchableOpacity
                    accessibilityLabel={RETRY_BUTTON_LABEL}
                    accessibilityRole="button"
                    activeOpacity={0.7}
                    onPress={() => {
                      setAttempt(0)

                      const credentials = lastCredentials.current

                      if (credentials) {
                        void connect(credentials.origin, credentials.deviceId, credentials.token)
                      }
                    }}
                    style={styles.sendButton}
                  >
                    <Text style={styles.sendButtonText}>{RETRY_BUTTON_LABEL}</Text>
                  </TouchableOpacity>
                </>
              ) : null}
            </View>

            {connection.status === 'disconnected' || connection.status === 'signed_out' ? (
              <PairLinkCard onChangeText={setPairLink} onSubmit={() => pair(pairLink.trim())} value={pairLink} />
            ) : null}

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

      {route.name === 'chat' ? (
        <View style={styles.composer}>
          <TextInput
            accessibilityLabel="Mensagem para o bot"
            blurOnSubmit
            onChangeText={setDraft}
            onSubmitEditing={() => void sendDraft()}
            returnKeyType="send"
            placeholder="Escreva para o bot"
            placeholderTextColor="#5b6478"
            style={styles.composerInput}
            value={draft}
          />
          <TouchableOpacity
            accessibilityLabel="Enviar mensagem"
            accessibilityRole="button"
            activeOpacity={0.7}
            disabled={sending || draft.trim().length === 0}
            onPress={() => void sendDraft()}
            style={[styles.sendButton, (sending || draft.trim().length === 0) && styles.sendButtonDisabled]}
          >
            <Text style={styles.sendButtonText}>{sending ? 'Enviando…' : 'Enviar'}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  back: { paddingVertical: 4 },
  backText: { color: '#7f9cff', fontSize: 15 },
  block: { gap: 14 },
  conversationsRow: { paddingHorizontal: 20, paddingTop: 8 },
  disconnectButton: { alignItems: 'center', paddingVertical: 10 },
  disconnectText: { color: '#7f9cff', fontSize: 15 },
  body: { flex: 1 },
  composer: { backgroundColor: '#0d1016', borderColor: '#1f2430', borderRadius: 14, borderWidth: 1, gap: 8, padding: 10 },
  composerInput: { color: '#e8eefc', fontSize: 14, maxHeight: 110, minHeight: 40, paddingHorizontal: 4, paddingVertical: 6 },
  sendButton: { alignItems: 'center', backgroundColor: '#2b5cff', borderRadius: 10, paddingVertical: 10 },
  sendButtonDisabled: { backgroundColor: '#232a3a' },
  sendButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
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
  headerTitle: { color: '#e8eefc', flexShrink: 1, fontSize: 17, fontWeight: '600' },
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
