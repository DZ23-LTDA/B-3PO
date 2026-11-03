# B-3PO Mobile (React Native)

Cliente **Android/iOS** do B-3PO. Ele **não** é um segundo runtime: não roda loop de agente, não abre
sessão própria, não executa ferramenta e não duplica transcript nem memória. Ele conversa com um
gateway B-3PO/Hermes já existente, recebe os eventos reais e apresenta.

## Por que React Native (decisão de 2026-11-03)

| Critério | React Native | Por quê |
|---|---|---|
| Reuso de linguagem | **sim** | o desktop já é TypeScript + React; contrato e tipos viajam sem tradução |
| Runtime único | **sim** | o cliente só fala JSON-RPC com o gateway, igual ao desktop |
| Manutenção DZ23 | **sim** | uma linguagem a menos para manter (JS/TS) |
| Android + iOS | **sim** | um código, duas pastas nativas |
| Acessibilidade | **sim** | `accessibilityLabel`/`accessibilityRole` de primeira classe |
| Comparado a Flutter | RN vence no reuso | Flutter exigiria reescrever o contrato em Dart |
| Comparado a Kotlin/Swift nativo | RN vence em custo | nativo dobraria o trabalho por plataforma |

Registrado em `docs/b3po/MOBILE-ARCHITECTURE-DECISION.md`.

## Estado atual (honesto)

| Item | Estado |
|---|---|
| Contrato de execução (`src/protocol/execution.ts`) | **implementado e testado** (12 testes) |
| Cliente de API (JSON-RPC/WebSocket) | a implementar |
| Login/logout + armazenamento seguro (Keychain/Keystore) | a implementar |
| Telas (bots, chat, execução, aprovação) | a implementar |
| `android/` e `ios/` nativos | a gerar (`npx react-native init`) |
| APK/AAB | **não gerado ainda** — exige Gradle + SDK |
| iOS archive/IPA | **bloqueado**: sem macOS/Xcode |

## O que o cliente pode e não pode

Pode: listar bots, abrir o chat do bot, enviar prompt, ver estado de execução, ver resultado, pedir
aprovação, pedir cancelamento, reconectar sem duplicar execução.

Não pode: executar ferramenta, criar sessão concorrente, guardar token em texto claro, tratar
notificação como autorização, ignorar a política de permissão do bot.

## Comandos

```bash
# contrato (não precisa de React Native instalado)
npx vitest run --root mobile/b3po-app

# app nativo (requer npm install + Android SDK; iOS exige macOS)
cd mobile/b3po-app
npm install
npm run android    # emulador/dispositivo
npm run build:android:debug
```

## Contrato de eventos

`execution.created` · `execution.started` · `execution.waiting_approval` · `execution.tool_started`
· `execution.tool_finished` · `execution.completed` · `execution.failed` ·
`execution.cancel_requested` · `execution.cancelled`

Frame desconhecido vira `null`: o cliente **nunca fabrica evento**. O log é idempotente por
`execution_id:sequence:type:event_id`, então reconexão não duplica linha.
