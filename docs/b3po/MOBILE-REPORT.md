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

## Rodada 44 — pareamento por deep link provado no aparelho (e um bug real do React Native)

### O que faltava

`parsePairingLink` existia e tinha testes, mas o Android **nunca entregava** o link ao app: o
`AndroidManifest.xml` não declarava o filtro. Código sem fio ligado não é funcionalidade.

Filtro adicionado em `MainActivity`:

```xml
<intent-filter android:autoVerify="false">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="b3po" android:host="pair" />
</intent-filter>
```

### O bug que o aparelho revelou

Com o filtro no lugar, o link chegou — e foi **recusado** com "Este QR não é um convite do B-3PO".
Causa: o React Native (Hermes) usa um polyfill de `URL` que **não** interpreta esquema customizado
como o Node faz; `new URL("b3po://pair?…")` não devolve host `pair`. Meus 12 testes passavam porque
rodam em Node, onde o `URL` nativo funciona — o teste estava certo e mesmo assim o produto quebrava.

Correção: `splitPairLink` separa o link textualmente (regex + `decodeURIComponent`); `URL` continua
usado só para http(s)/ws(s), que o polyfill trata bem. Quatro testes novos cobrem o formato exato que
o Android entrega, caixa alta, percent-encoding inválido e host errado. **85 testes** no pacote.

### Prova no emulador (dois caminhos, os dois valem)

Link válido:

```
adb shell am start -a android.intent.action.VIEW \
  -d "b3po://pair?url=https%3A%2F%2Fpc.dz23.dev&token=tok_abcdefghijklmnop&name=Escritorio"
→ "B-3PO" / "Seus bots, no seu computador." / "Nenhum bot ainda"
```

Link inseguro (http para host remoto) — recusado pela regra de TLS:

```
-d "b3po://pair?url=http%3A%2F%2Fpc.dz23.dev&token=…"
→ "Não foi possível parear"
  "Conexão sem criptografia para um computador na rede. Use o endereço https/wss."
```

Screenshots: `docs/b3po/evidence/mobile-pair-ok.png` e `mobile-pair-insecure.png`.

### Artefatos atualizados

| Arquivo | Tamanho | SHA-256 |
|---|---|---|
| `app-release.apk` | 44,2 MB | `DEA8F4FC9263A127FF615EED92FC15826CF44AFB95D6C5560A3D2ED70811874A` |
| `app-release.aab` | 19,0 MB | `5B84826FF9B13347C588534B8F48F62646B086F7E34F5803D451410E8E787F18` |

O **AAB** agora existe (o GOAL pedia "quando possível"), gerado com a mesma chave de debug do
template: serve para validar o empacotamento, **não** para publicar — loja exige chave de release.

## Rodada 45 — transporte WebSocket real e teste de contrato sobre socket

### O que faltava

`GatewayClient` recebia o transporte por injeção e **nada o implementava** para produção: a tela não
tinha como falar com o gateway. Isso é código sem consumidor real — exatamente o que não deve ficar.

`src/api/ws-transport.ts` implementa o transporte sobre o `WebSocket` global (existe no React Native e
no Node 22+), com duas decisões explícitas:

- **token no handshake, como subprotocolo** (`["b3po.v1", "token.<token>"]`), nunca na query string —
  query string vaza em log de proxy, histórico e crash report;
- **fila de envio antes do `open`**: `send` antes do handshake perde o frame, então o frame espera; o
  chamador não precisa conhecer o estado do socket.

### Prova sobre socket de verdade

`src/api/ws-transport.integration.test.ts` sobe um servidor WebSocket real em `127.0.0.1` e conversa
com ele pelo mesmo `WebSocket` que o app usa. Cinco casos:

| Caso | Prova |
|---|---|
| pedido/resultado | JSON-RPC completo pelo socket, sem mock |
| handshake | `sec-websocket-protocol` chega com `b3po.v1` + `token.…`, e a URL não carrega token |
| erro do servidor | vira `GatewayError` com código `-32601` |
| dois pedidos simultâneos | respostas correlacionadas por id, sem troca |
| queda de conexão | pendente rejeitado com `connection_lost` e `pendingCount() === 0` |

**90 testes** no pacote (26 originais preservados), `tsc --noEmit` limpo.

### Dois erros meus nesta rodada, corrigidos

1. O teste de queda usava um método que o servidor respondia na hora, então a promise **resolvia** em
   vez de rejeitar. Corrigi com um método `hang` que nunca responde — o pendente tem de existir de
   verdade quando o socket cai.
2. `afterAll` estourava o timeout de 10 s porque `server.close()` espera sockets pendentes. Agora os
   sockets são terminados antes do close.

Ainda não provado: a conexão contra o **gateway Hermes real** (o endpoint registrado em `gw.json`
estava com a porta fechada nesta rodada). O contrato está provado; falta o servidor real — item aberto.

## Rodada 46 — investigação do gateway real (resultado honesto)

Subi o gateway do perfil de teste (`hermes gateway ensure --json`) e ele **está de pé**:

```
state: ready
endpoint: http://127.0.0.1:54686
runtime_protocol: 1
capabilities: durable-admission-v1, event-replay-v1, session-authority-v1
processo: python.exe -m hermes_c… (-m hermes_core/gateway)
```

Mas essa porta **não é** o endpoint JSON-RPC do cliente mobile: qualquer caminho (`/`, `/health`,
`/rpc`) devolve o HTML do **dashboard**, ou seja, é o servidor web do painel. O contrato que o cliente
mobile precisa falar é o do `serve` backend do desktop (`apps/desktop/electron/main.ts` cria o
`http.createServer` e o canal RPC), que ainda não foi mapeado rota a rota.

Registrado como próximo passo concreto: enumerar as rotas/canal do `serve` backend e então falar com
ele pelo `ws-transport.ts` já implementado. **Nada aqui foi declarado funcionando** — a conexão contra
o servidor real segue sem prova, e o `gw.json` do perfil estava apontando para uma porta antiga já
fechada (58036), o que também precisa de atenção em outro ciclo.

## Rodada 47 — cliente mobile falando com o **servidor real** (contrato corrigido)

### O que estava errado

O transporte que escrevi na rodada anterior mandava `b3po.v1` + `token.<token>` no handshake. Nomes
**inventados**: o servidor do B-3PO/Hermes aceita outros. Lidos em
`hermes_cli/web_server_boundary.py`:

```
_GATEWAY_WS_PROTOCOL               = "hermes-gateway-v1"
_GATEWAY_WS_TICKET_PROTOCOL_PREFIX = "hermes-gateway-ticket."
```

Com os nomes errados o handshake seria recusado e eu teria "provado" o cliente contra um servidor
que aceitava qualquer coisa. Corrigido em `ws-transport.ts`, junto do caminho real `ws(s)://…/api/ws`
(`gatewayWsUrl` converte a origem HTTP).

### E o protocolo não é JSON-RPC

O Desktop fala **REST** com o runtime (`/api/health`, `/api/status`, `/api/agents`,
`/api/sessions/…`) e usa WebSocket só em `/api/ws`. Isso estava errado no meu modelo mental.

`src/api/rest-client.ts` implementa o cliente REST com o header real `X-Hermes-Session-Token` (e
`Authorization: Bearer` no modo token), timeout, e erro classificado (`unauthorized`, `unreachable`,
`timeout`, `bad-response`) — cada um com mensagem de tela em português.

### Prova contra o servidor vivo

`src/api/rest-client.live.test.ts`, rodando contra o servidor de verdade
(`B3PO_LIVE_ORIGIN=http://127.0.0.1:54686`), **5 testes verdes**:

| Teste | Resultado real observado |
|---|---|
| `/api/health` | `{"ok":true,…,"auth_required":false}` |
| `/api/status` | `{"gateway_running":true,…}` |
| endpoint protegido sem token | 401 → `RestError('unauthorized')` |
| token no header | aparece em `x-hermes-session-token`, **não** na URL |
| servidor fora do ar | `RestError('unreachable')` em 1,5 s, sem travar |

Sem servidor no ar os mesmos testes são **pulados** (nunca verdes por omissão).

### Contagem

**92 testes passando + 5 pulados** (os live, quando não há servidor), `tsc --noEmit` limpo.

### Ainda pendente

- as telas ainda não consomem o `RestClient` (falta ligar lista de bots e conversa ao cliente REST);
- `/api/ws` exige *gateway ticket* de uso único gerado pelo servidor: falta descobrir como o Desktop
  obtém o ticket para o celular pareado receber um.

## Rodada 48 — o app do celular falou com o servidor real (e um defeito de tela)

### O que foi ligado

`App.tsx` agora consulta o servidor depois do pareamento: `RestClient.health()` e `.status()`, com
estado de carregamento, de erro (com detalhe técnico) e de sucesso. Nada de dado de exemplo.

Também nesta rodada, dois bloqueios reais de plataforma:

| Bloqueio | Causa | Correção |
|---|---|---|
| HTTP recusado no Android | `targetSdk 36` bloqueia cleartext por padrão | `network_security_config.xml` liberando cleartext **só** para `localhost`, `127.0.0.1` e `10.0.2.2` (host do emulador); todo o resto continua exigindo TLS |
| `AbortSignal.timeout` | não existe em todo runtime JS (Hermes) | `AbortController` + `setTimeout` com `clearTimeout` no `finally`, e o motivo real na mensagem de erro |
| Rede do emulador | NAT não alcançava o host | `adb reverse tcp:54686 tcp:54686` e pareamento em `http://127.0.0.1:54686` |

### Prova de execução no aparelho (logcat)

```
[b3po] connect   'http://127.0.0.1:54686' 'dev-11nqhpwr6s9ktyfc2ysrrp'
[b3po] connected '{"ok":true,"commit":"98695c0cc7e58f85b5ff790482ff434ca722a1da","authRequired":false}'
                 '{"gatewayRunning":true,"gatewayState":"running",…}'
```

O celular (emulador) **alcançou o servidor B-3PO/Hermes real** e interpretou o JSON: saúde ok, commit
real do código, `auth_required=false`, gateway rodando. Evidência em
`docs/b3po/evidence/mobile-live-connection-logcat.txt`.

### Defeito aberto (honesto)

Na tela, o cartão de status aparece **sem o corpo do texto**: mostra o título ("Estado inesperado",
por exemplo) e nada abaixo. O dado chegou (log acima), então o problema é de renderização do
componente `Card` no release, não de rede. **Não está corrigido.**

Sintoma exato medido com `uiautomator`: a `ScrollView` tem um único filho com 280 px e só o título do
cartão; o `<Text>` do corpo não é desenhado. Próximo passo: eliminar o `Card` intermediário e desenhar
o texto direto no container (suspeita: `gap` + `flex` do `View` dentro da `ScrollView` no release), e
comparar com um build de debug com Metro para isolar release × runtime.

Detalhe do caminho: o `default` do `switch` de estado existe justamente para nunca deixar a tela em
branco — e foi ele que apareceu, provando que o estado chegou a um valor que o `case 'connected'` não
capturou na renderização. Investigar junto do defeito acima.

### Também adicionado

`ErrorBoundary` (`src/app/error-boundary.tsx`): erro de render no release antes deixava a tela preta
sem mensagem; agora mostra título, explicação e a mensagem técnica.
