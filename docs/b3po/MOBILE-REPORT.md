# MOBILE-REPORT — cliente B-3PO (Android/iOS)

**Decisão de tecnologia:** React Native 0.81 + TypeScript, registrada em
[MOBILE-ARCHITECTURE-DECISION.md](./MOBILE-ARCHITECTURE-DECISION.md). O cliente **não** é um segundo
runtime: fala JSON-RPC com um gateway B-3PO/Hermes existente e apresenta estado real.

## Baseline (exigido pelo GOAL §02)

| Item | Estado |
|---|---|
| Testes originais informados pelo proprietário | **26 — preservados e verdes** (`auth/session` 7, `api/gateway` 7, `protocol/execution` 12) |
| Total atual | **53 testes** em 6 arquivos, `vitest run` verde em ~0,2 s |
| `tsc --noEmit` do pacote | limpo |

## Camadas implementadas e testadas

| Módulo | O que garante | Testes |
|---|---|---|
| `src/protocol/execution.ts` | contrato público `execution.*` sobre frames do gateway; frame desconhecido vira `null`, nunca evento inventado | 12 |
| `src/api/gateway.ts` | cliente JSON-RPC/WebSocket com reconexão | 7 |
| `src/auth/session.ts` | login/logout e cofre do sistema (Keychain/Keystore) | 7 |
| `src/pairing/pairing.ts` | link/QR `b3po://pair` válido; recusa TLS ausente para host remoto, esquema exótico (`file:`, `javascript:`) e token curto; preserva o id do dispositivo ao reparear | 10 |
| `src/sync/cursor.ts` | aplica eventos em ordem por `sequence`, descarta reenvio, **recusa o lote inteiro** ao encontrar buraco, devolve o payload de `resume` | 9 |
| `src/notifications/payload.ts` | notificação só navega; qualquer campo de decisão (`approve`, `cancel`, `confirm`…) é rejeitado; a decisão sai da tela com o token do cofre | 8 |

## Pendente (sem maquiagem)

| Item | Por quê |
|---|---|
| Telas React Native (bots, conversa, execução, aprovação) | ainda não escritas |
| `android/` e `ios/` nativos | exigem `react-native init` + SDKs |
| APK debug / release / AAB | depende do Gradle + Android SDK no runner |
| IPA / archive iOS | **BLOCKED_BY_EXTERNAL_DEPENDENCY**: exige macOS + Xcode + certificado |

Nada acima está declarado pronto. Os módulos que existem foram provados por teste; o resto é
trabalho pendente, não entrega.

## Rodada 41 — view-models das telas + revisão independente (MCP DZ23)

### View-models (a lógica que as telas vão desenhar)

`src/screens/view-models.ts` calcula lista de bots (ordem, estado, rótulo de acessibilidade), resumo
de execução (fase, ferramenta, erro real) e tela de aprovação. As telas React Native ficam finas e o
comportamento é provável sem aparelho. Total do pacote: **75 testes**.

### Revisão independente (obrigatória, executada)

`mcp__dz23__delegate`, papel `security`, provider `groq`/`qwen3.8-27b`, request
`70da2277-cb48-421f-b9de-268b0ba39a15`. Seis achados; o que é responsabilidade do cliente foi
corrigido **com teste**:

| Achado | Correção no cliente | Teste |
|---|---|---|
| Recusar lote com buraco pode travar a UI se o gateway nunca reenviar | `gapVerdict` + `REPLAY_TIMEOUT_MS` (30 s) e `forgetExecution` para forçar resync | 4 |
| Notificação/deep link pode citar `execution_id` de outra pessoa | `approvalView` exige `ownershipVerified` (confirmação do backend) antes de oferecer decisão | 1 |
| Convite/QR sem prazo pode parear dias depois | `expires_at` no link; convite vencido é recusado com mensagem própria | 2 |

**Fica para o backend (registrado, não fingido):** `device_id` é identificador, não credencial — o
gateway precisa exigir prova de posse de chave privada do aparelho; token de pareamento de uso único
com expiração de minutos; rate limit por IP; revogação por dispositivo; e revalidar que a execução
pertence ao dispositivo que pede aprovação.

**Achado aceito como está:** `ws://` para host local continua permitido (o app não executa código e o
token é o controle de acesso), com a ressalva de que produção deve preferir `wss://`.

## Rodada 42 — projeto nativo Android e **APK debug gerado**

### O que foi feito

- `android/` e `ios/` gerados a partir do template React Native 0.81 e integrados a
  `mobile/b3po-app` (o app não foi recriado: `src/` e os 26 testes originais continuam);
- pacote renomeado para **`com.dz23.b3po`** (Gradle `namespace`/`applicationId`, Kotlin e pastas);
- rótulo visível do app: **B-3PO** (`strings.xml`, `app.json`);
- `App.tsx` escrito: wordmark, estados vazios reais, pareamento por deep link `b3po://pair` e lista de
  bots desenhada pelo view-model (nenhum dado inventado).

### APK gerado e verificado

```
gradlew assembleDebug            -> BUILD SUCCESSFUL (2.2 min)
arquivo   android/app/build/outputs/apk/debug/app-debug.apk
tamanho   93,2 MB
sha256    10DB8315F004768755CD6463470878D4A1289D94A6312EFF9C5E0BA56532ACA5
pacote    com.dz23.b3po   versão 1.0
minSdk    24   targetSdk 36
assinatura  CN=Android Debug (certificado de DEBUG)
```

**Limite honesto:** é APK **debug**, assinado com a chave de debug do Android — não é artefato de
distribuição. APK de release/AAB exigem keystore de release (não disponível aqui) e ficam
`BLOCKED_BY_EXTERNAL_DEPENDENCY` até o proprietário fornecer/gerar a chave.

### Por que a primeira tentativa falhou (registrado)

O build quebrou em `:react-native-screens:generateCodegenSchemaFromJavaScript`:

```
The first argument of method showColumn must be of type React.ElementRef<>
```

É o codegen da Nova Arquitetura do RN 0.81 rejeitando o spec dessa versão do `react-native-screens`.
Desligar `newArchEnabled` não dispensa a tarefa. Como navegação ainda não é renderizada no `App.tsx`,
as dependências nativas não usadas (`@react-navigation/*`, `react-native-screens`,
`react-native-safe-area-context`, `react-native-keychain`) saíram do `package.json` para o primeiro
APK sair. **Reintroduzir exige versão compatível com o codegen do RN 0.81** — item aberto.

### Pendente

| Item | Estado |
|---|---|
| Navegação (bots → conversa) | dependência a reintroduzir com versão compatível |
| Cofre seguro real (Keychain/Keystore) | mesma dependência a reintroduzir |
| Conexão JSON-RPC/WebSocket real | cliente existe em `src/api`, falta ligar na tela |
| APK release / AAB | BLOCKED_BY_EXTERNAL_DEPENDENCY (keystore de release) |
| iOS / IPA | BLOCKED_BY_EXTERNAL_DEPENDENCY (macOS + Xcode + certificado) |

## Rodada 43 — APK **release com JS embutido**, instalado e rodando no emulador

### Navegação própria (decisão com evidência)

`@react-navigation` + `react-native-screens` **não compilam** neste ambiente: o codegen da Nova
Arquitetura do RN 0.81 falha em

```
:react-native-screens:generateCodegenSchemaFromJavaScript
Error: The first argument of method showColumn must be of type React.ElementRef<>
```

Evidências coletadas antes de decidir:

| Tentativa | Resultado |
|---|---|
| `react-native-screens` 4.30.0 / 4.30.1 | falha (spec usa `React.ComponentRef`, RN 0.82+) |
| 4.16.0, 4.13.0, 4.11.0 | falha igual |
| `newArchEnabled=false` | a tarefa de codegen continua rodando |
| Node 24 em vez de 26 no PATH do Gradle | falha igual |
| cache de build apagado | falha igual |
| `react-native-keychain` 10.0.0 isolado | falha igual |

Como o app tem três telas, a navegação foi escrita à mão em `src/app/router.ts` (pilha, voltar,
toque duplo não empilha, rótulo de acessibilidade) — **6 testes**. Quando o RN for atualizado, a troca
volta a ser local: as telas consomem esta interface. CoFre seguro real segue pendente pelo mesmo motivo.

### Artefatos Android

| Arquivo | Tamanho | SHA-256 | Observação |
|---|---|---|---|
| `app-debug.apk` | 93,2 MB | `10DB8315…32ACA5` | **não embute o JS** (espera Metro) |
| `app-release.apk` | 44,2 MB | `F6C343D4…13268` | **JS embutido (888 KB)**, assinado com a chave de debug do template |

O debug não muda de hash ao alterar `App.tsx` — foi assim que descobri que ele não empacota o bundle;
o release é o artefato utilizável fora do Metro.

### Prova de execução real (emulador)

```
adb install -r app-release.apk        -> Success
adb shell am start -n com.dz23.b3po/.MainActivity
topResumedActivity = com.dz23.b3po/.MainActivity
uiautomator dump -> "B-3PO"
                    "Seus bots, no seu computador."
                    "Sem conexão com o computador"
                    "Verifique se o B-3PO está aberto na mesma rede. Suas ações continuam
                     pendentes até reconectar."
```

Screenshot: `docs/b3po/evidence/mobile-apk-running.png`. O bundle embutido contém o texto do app
(`B-3PO`, `Seus bots, no seu computador`, `Voltar para a lista de bots`) — conferido descompactando o
APK, não por suposição.

### Limite honesto

O APK release está assinado com a **chave de debug** que o template do RN traz, porque não existe
keystore de release. É instalável e roda, mas **não é artefato de publicação**: AAB/loja exigem chave
de release — `BLOCKED_BY_EXTERNAL_DEPENDENCY`.
