/**
 * Barreira de erro da tela.
 *
 * Por que existe: um erro de render no React Native **release** derruba a árvore inteira e deixa a
 * tela em branco, sem mensagem e sem log fácil de achar. Já aconteceu neste app (tela preta abaixo do
 * título). Uma barreira que mostra a mensagem transforma "não funciona" em informação acionável — para
 * quem usa e para quem depura.
 */

import { Component, type ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'

interface Props {
  children: ReactNode
}

interface State {
  message: string | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { message: null }

  static getDerivedStateFromError(error: unknown): State {
    return { message: error instanceof Error ? `${error.name}: ${error.message}` : 'erro desconhecido' }
  }

  render() {
    if (this.state.message) {
      return (
        <View style={styles.box}>
          <Text style={styles.title}>O aplicativo encontrou um problema</Text>
          <Text style={styles.body}>
            Esta tela falhou ao desenhar. A mensagem abaixo ajuda a corrigir — copie e envie junto do
            relato.
          </Text>
          <Text style={styles.detail}>{this.state.message}</Text>
        </View>
      )
    }

    return this.props.children
  }
}

const styles = StyleSheet.create({
  body: { color: '#8f9bb3', fontSize: 14, lineHeight: 20 },
  box: { backgroundColor: '#0b0d12', flex: 1, gap: 10, padding: 24, paddingTop: 72 },
  detail: { color: '#ffb4b4', fontFamily: 'monospace', fontSize: 13, lineHeight: 18 },
  title: { color: '#e8eefc', fontSize: 18, fontWeight: '700' }
})
