import { StyleSheet } from 'react-native'

/** Estilos compartilhados pelos cartoes de estado/pareamento (evita duplicar o mesmo bloco em cada tela). */
export const cardStyles = StyleSheet.create({
  body: { color: '#a7b0c0', fontSize: 15, lineHeight: 22 },
  button: { alignItems: 'center', backgroundColor: '#2f5bea', borderRadius: 10, paddingVertical: 14 },
  buttonDisabled: { backgroundColor: '#243049' },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  card: { backgroundColor: '#151b26', borderColor: '#222b3a', borderRadius: 12, borderWidth: 1, gap: 12, padding: 16 },
  input: {
    backgroundColor: '#0d1119',
    borderColor: '#222b3a',
    borderRadius: 10,
    borderWidth: 1,
    color: '#e8ecf4',
    fontSize: 15,
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  title: { color: '#e8ecf4', fontSize: 17, fontWeight: '600' }
})
