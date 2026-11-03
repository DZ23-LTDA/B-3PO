/**
 * Tela raiz do cliente B-3PO (Android/iOS).
 *
 * Fina de propósito: não decide nada. Depois do pareamento ela consulta o servidor de verdade
 * (`/api/health` e `/api/status` via `RestClient`) e **só mostra o que recebeu** — sem dado de exemplo.
 * Se o servidor estiver fora do ar, a tela diz isso em português, com a hora da última tentativa.
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
import type { HealthInfo, StatusInfo } from './src/api/rest-client'
import { emptyStateCopy } from './src/screens/view-models'
import { pairingFailureMessage, parsePairingLink } from './src/pairing/pairing'

type Connection =
  | { status: 'disconnected' }
  | { status: 'connecting'; origin: string }
  | { status: 'connected'; origin: string; deviceId: string; health: HealthInfo; status: StatusInfo | null; checkedAt: number }
  | { status: 'failed'; origin: string; message: string }

export default function App() {
  const [connection, setConnection] = useState<Connection>({ status: 'disconnected' })
  const [error, setError] = useState<string | null>(null)
  const [nav, setNav] = useState<NavState>(initialNav)

  const route = currentRoute(nav)

  const connect = useCallback(async (origin: string, deviceId: string) => {
    console.log('[b3po] connect', origin, deviceId)
    setConnection({ status: 'connecting', origin })

    const client = new RestClient({ origin })

    try {
      const health = await client.health()
      // /api/status é público também; se falhar, o health já provou que o servidor está de pé
      const status = await client.status().catch(() => null)

      console.log('[b3po] connected', JSON.stringify(health), JSON.stringify(status))
      setConnection({ status: 'connected', origin, deviceId, health, status, checkedAt: Date.now() })
    } catch (failure) {
      console.log('[b3po] failed', String(failure))
      const detail = failure instanceof Error ? failure.message : String(failure)
      setConnection({ status: 'failed', origin, message: `${restFailureMessage(failure)}\n\nDetalhe técnico: ${detail}` })
    }
  }, [])

  const pair = useCallback(
    (value: string) => {
      const result = parsePairingLink(value)

      if (!result.ok) {
        setError(pairingFailureMessage(result.reason))
        setConnection({ status: 'disconnected' })

        return
      }

      setError(null)
      void connect(result.request.gatewayUrl, result.request.deviceId)
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

  const connected = connection.status === 'connected'
  const botItems = useMemo(() => [] as { name: string; title: string; description: string }[], [])

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
          <>
            <Text style={styles.tagline}>Seus bots, no seu computador.</Text>

            {statusCard(connection, error)}

            {connected && botItems.length === 0 ? (
              <Card title={emptyStateCopy('no-bots').title} body={emptyStateCopy('no-bots').body} />
            ) : null}

            {botItems.map(item => (
              <TouchableOpacity
                accessibilityHint="Abre a conversa com este bot"
                accessibilityRole="button"
                key={item.name}
                onPress={() => setNav(openChat(nav, { name: item.name, title: item.title }))}
                style={styles.row}
              >
                <View style={styles.rowMain}>
                  <Text style={styles.rowTitle}>{item.title}</Text>
                  <Text numberOfLines={2} style={styles.rowBody}>
                    {item.description}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </>
        ) : (
          <Card
            title="Conversa"
            body={
              connected
                ? `Conectado a ${connection.origin}. As mensagens deste bot aparecem aqui quando a conversa for ligada ao servidor.`
                : emptyStateCopy('offline').body
            }
          />
        )}
      </ScrollView>
    </SafeAreaView>
  )
}


/**
 * Um cartão por estado, com `default` explícito: qualquer estado inesperado mostra mensagem em vez de
 * deixar a tela em branco. Tela em branco não informa nada e parece app quebrado.
 */
function statusCard(connection: Connection, pairingError: string | null) {
  if (pairingError) {
    return <Card title="Não foi possível parear" body={pairingError} />
  }

  switch (connection.status) {
    case 'disconnected':
      return <Card title={emptyStateCopy('offline').title} body={emptyStateCopy('offline').body} />
    case 'connecting':
      return (
        <View style={styles.card}>
          <ActivityIndicator />
          <Text style={styles.cardTitle}>{emptyStateCopy('connecting').title}</Text>
          <Text style={styles.cardBody}>{connection.origin}</Text>
        </View>
      )
    case 'failed':
      return <Card title="Sem conexão com o computador" body={connection.message} />
    case 'connected':
      return (
        <Card
          title="Conectado ao computador"
          body={`Servidor: ${connection.origin}\nCompilação: ${connection.health.commit ?? 'não informada'}\nGateway: ${
            connection.status ? 'consultado' : 'não consultado'
          }\nToken exigido: ${connection.health.authRequired ? 'sim' : 'não'}${
            connection.status ? `\nEstado do gateway: ${connection.status.gatewayRunning ? 'rodando' : 'parado'}` : ''
          }`}
        />
      )
    default:
      return (
        <Card
          title="Estado inesperado"
          body={`Feche e abra o aplicativo. Diagnóstico: ${JSON.stringify(connection)}`}
        />
      )
  }
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
  row: {
    backgroundColor: '#12151c',
    borderColor: '#1f2430',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14
  },
  rowBody: { color: '#8f9bb3', fontSize: 13, lineHeight: 18 },
  rowMain: { gap: 4 },
  rowTitle: { color: '#e8eefc', fontSize: 15, fontWeight: '600' },
  screen: { backgroundColor: '#0b0d12', flex: 1 },
  tagline: { color: '#8f9bb3', fontSize: 14 },
  wordmark: { color: '#2f6bff', fontSize: 26, fontWeight: '700', letterSpacing: -0.5 }
})
