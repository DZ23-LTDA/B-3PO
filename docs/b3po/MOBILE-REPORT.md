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

## Rodada 49 — causa raiz do cartão sem corpo: colisão de nome no tipo

O defeito aberto na rodada anterior **está corrigido**, e a causa não era layout.

O tipo do estado tinha dois campos chamados `status`:

```ts
| { status: 'connected'; origin: string; …; status: StatusInfo | null; checkedAt: number }
//  ^ discriminante da união        ^ informação do gateway — MESMO NOME
```

Em runtime o segundo sobrescrevia o primeiro: `connection.status` era o **objeto** do gateway, não a
string `'connected'`. O `switch` nunca casava e caía no `default` — a tela mostrava "Estado
inesperado", e o corpo do cartão vinha vazio porque o `JSON.stringify` do estado era o único texto e
o layout o cortava. O TypeScript só reclamou (TS1117) quando a colisão apareceu num literal de teste,
não na declaração do tipo.

### Correção

1. o campo do gateway passou a se chamar `gateway` (nome com significado próprio, sem colidir com o
   discriminante);
2. o texto do cartão saiu do JSX e virou módulo puro `src/screens/status-card.ts`, com **7 testes** —
   é o teste que teria pego o bug desde o começo;
3. o `Card` intermediário saiu: o texto é desenhado em `<Text>` direto no `<View>`.

### Prova no aparelho (emulador → servidor real)

```
Conectado ao computador
Servidor: http://127.0.0.1:54686
Compilação: 98695c0cc7e58f85b5ff790482ff434ca722a1da
Token exigido: não
Gateway: rodando
Estado: running
Nenhum bot ainda
```

Evidências: `docs/b3po/evidence/mobile-conectado-servidor-real.png` e `.txt`.

**101 testes + 5 pulados**, `tsc --noEmit` limpo.

## Rodada 55 — a lista de bots aparece no celular (401 resolvido)

O bloqueio de três rodadas tinha **duas causas**, e nenhuma era "falta de permissão":

1. **endpoint errado**: eu batia em `/api/agents`, que é do *portal cloud* e dá **404** no backend
   local. O backend local publica os bots em **`/api/profiles`**;
2. **token aleatório**: o gateway gera um `HERMES_DASHBOARD_SESSION_TOKEN` por processo. Rodando
   `hermes serve` em foreground com o token definido, o valor é conhecido e estável.

Prova com `curl` no servidor real (porta 9119):

```
/api/health   -> 200 {"ok":true,…,"auth_required":false}
/api/profiles -> 200 {"profiles":[{"name":"default","model":"qwen3.5:4b","provider":"custom",
                                    "gateway_running":true,"bot_title":…}, …]}
/api/sessions -> 200 {"sessions":[],"total":1,…}
/api/agents   -> 404  (não existe no backend local)
```

### No aparelho

Depois de parear com `b3po://pair?url=http://127.0.0.1:9119&token=…`, a tela mostra **os bots reais**
do servidor, com título e descrição que estão no perfil:

```
Conectado ao computador
Servidor: http://127.0.0.1:9119 · Compilação: 98695c0c… · Gateway: rodando · Estado: running
default                          custom · qwen3.5:4b
analista-financeiro              Analista Financeiro - le planilhas e aponta desvios de orcamento.
Revisor de Código                Revisor de Código — Revisa diffs, aponta riscos e sugere testes…
```

Evidência: `docs/b3po/evidence/mobile-bots-reais.png` e `.txt`.

### Testes ao vivo (8 verdes contra o servidor real)

`B3PO_LIVE_ORIGIN=http://127.0.0.1:9119 B3PO_LIVE_TOKEN=…`:

| Caso | Resultado |
|---|---|
| `/api/profiles` **com** token | 200, lista com nome/título/modelo/provider |
| `/api/profiles` **sem** token | 401 — a lista de bots **não é pública** |
| `/api/sessions` com token | 200 com estrutura de paginação |

Sem servidor no ar esses testes são pulados (nunca verdes por omissão).

**101 testes + 8 pulados** no mobile, `tsc` limpo.

## Rodada 56 — a conversa real abre no celular

Contrato confirmado contra o servidor rodando:

```
GET /api/sessions?profile=<bot>
    -> { sessions: [{ id, title, preview, message_count, unread, last_activity_at, … }] }
GET /api/sessions/{id}/messages?limit=N&profile=<bot>
    -> { messages: [{ id, role: 'user'|'assistant'|'tool'|…, content, timestamp }] }
```

Sem `?profile=`, o servidor devolve só o perfil padrão — por isso o mobile manda o perfil do bot.

`RestClient.sessions()` e `RestClient.messages()` implementam isso; `src/screens/chat-session.ts` traduz
para bolhas, com **10 testes**:

| Regra | Por quê |
|---|---|
| `role: 'tool'` não vira fala do bot | saída de ferramenta é programa, não conversa |
| `role` desconhecido aparece como "Sistema" | não descarta nem inventa; quem depura vê o que veio |
| conteúdo vazio não gera bolha | sem bolha fantasma |
| conteúdo multimodal junta partes de texto e **descarta vazias** | senão sobra espaço duplo na frase |
| ordem por `timestamp` com desempate numérico por id | transcript não embaralha |

### No aparelho

Tocando no bot **Revisor de Código**, a tela abre a conversa mais recente com mensagens reais do
servidor:

```
‹ Voltar para a lista de bots
Revisor de Código
Você
Conte em 500 palavras a historia do teclado.
Bot
```

Evidência: `docs/b3po/evidence/mobile-conversa-real.png` e `.txt`.

### Erro meu nesta rodada

Esqueci de guardar o **token** no estado da conexão: a lista de bots funcionava (o token ia na chamada
de `/api/profiles`) mas a conversa dizia "Pareie o aparelho" porque `openBot` não tinha token para
autenticar. Corrigi pondo `token` no estado `connected` — e o `tsc` acusou na hora os testes que
montavam o estado sem ele.

**111 testes + 8 pulados** no mobile, `tsc` limpo, gate **14 ok** verificado antes do commit.

## Rodada 59 — envio de mensagem pelo celular: topologia de autenticação descoberta, envio NÃO liberado

Três tentativas contra o servidor real, três respostas diferentes. Registro as três porque a diferença
é o que explica o bloqueio.

| Tentativa | O que fiz | Resposta |
|---|---|---|
| 1 | `POST /api/auth/ws-ticket` com `x-hermes-session-token` | **401 Unauthorized** |
| 2 | `WS /api/ws?token=<token>` + subprotocolo `hermes-gateway-v1` | upgrade recusado, **close 1006** |
| 3 | WS com ticket de `hermes-gateway-ticket.<ticket>` | não alcançado — depende da tentativa 1 |

### Por que o endpoint de ticket recusa

`hermes_cli/dashboard_auth/routes.py:573` — `api_auth_ws_ticket` chama `_require_session(request)`, que
exige uma **sessão de login do dashboard** (cookie/sessão de usuário), não o `x-hermes-session-token`.
O token que o pareamento usa é de outro nível: serve para REST (`/api/profiles`, `/api/sessions`,
`/api/sessions/{id}/messages` — todos comprovados com 200), mas não emite ticket de WebSocket.

### O caminho local que existe e por que não serve no celular

`hermes_cli/gateway_client.py:285` minta `session-ticket` por um **socket de controle privado**
(`{"protocol":1,"id":1,"verb":"session-ticket"}`). É um named pipe/unix socket da máquina: o
`adb reverse` encaminha TCP, não pipe. Um celular não alcança esse caminho.
Quando o servidor está sem gate, `web_server_chat.py:_server_internal_ws_url` monta
`ws://host:port/api/ws?token=<_SESSION_TOKEN>` — foi a tentativa 2, e o upgrade caiu mesmo com o token
válido em REST (`/api/health` responde `auth_required:false`).

### O contrato de envio (achado, pronto para usar quando houver credencial)

JSON-RPC sobre o WS do gateway (`gateway/session_controls.py`):

```
{"jsonrpc":"2.0","id":1,"method":"session.resume","params":{"session_id":"<id>"}}
{"jsonrpc":"2.0","id":2,"method":"prompt.submit","params":{
    "session_id":"<id>", "text":"...", "submission_id":"<uuid>"}}
```

`submission()` exige `submission_id` não vazio e recusa qualquer chave fora de
`{session_id, text, submission_id, input_id, queued, attachments, finite, unattended, surface,
voice_context, interrupted, voice_turn, display_kind, title_preview, turn_author, api_text,
model_override, clarify_batch}`. Também exige que o socket esteja **subscrito** à sessão
(`ref.session_id in self.subscriptions`) — daí o `session.resume` antes.

### Status

Envio pelo celular: **BLOCKED_BY_DESIGN** — falta fluxo de login do dashboard (ou ticket emitido para
token de dispositivo). Não implementei composer com botão que não envia: botão sem ação é proibido pelo
GOAL.

O que o usuário tem hoje no celular, comprovado: lista de bots real e conversa real (leitura).

## Rodada 60 — caminho de envio implementado e testado; credencial continua faltando

Corrigi a leitura do contrato: **não existe** `?token=` para o WebSocket neste build.

`web_server_chat.py::_consume_ws_ticket` aceita exatamente duas credenciais:

| Credencial | Como chega | Quem pode usar |
|---|---|---|
| ticket de uso único | subprotocolo `hermes-gateway-ticket.<t>` ou `?ticket=` | quem mintou via `POST /api/auth/ws-ticket` (exige login do dashboard) |
| credencial interna do processo | `?internal=` | somente filho gerado pelo próprio servidor (env), nunca exposto por REST |

`ws_tickets.py::internal_ws_credential` diz textualmente: *"Never injected into the SPA or returned
over REST — only passed to a spawned child via its environment."* Ou seja: o close 1006 da rodada 59
não foi bug de rede — foi credencial do tipo errado.

### O que passou a existir no repositório

`mobile/b3po-app/src/api/gateway-rpc.ts` — **10 testes**:

| Regra | Por quê |
|---|---|
| ticket vai no query **e** no subprotocolo | é o par que o servidor espera |
| credencial interna vai em `?internal=`, sem subprotocolo de ticket | assinatura diferente |
| `prompt.submit` só usa `session_id`/`text`/`submission_id` | o servidor recusa qualquer chave fora da lista permitida |
| recusa local quando texto/id vazio | falhar aqui é melhor que o servidor responder `invalid_params` |
| `session.resume` **antes** de `prompt.submit` | o socket precisa estar subscrito à sessão |
| socket que falha devolve `socket_failed` | nunca engole erro |
| submissão com id único | retry não duplica turno |

Inclui teste de integração com servidor WS real (`ws`) que aplica o contrato e confere a ordem dos
frames e as respostas `id: 1` e `id: 2`.

### Por que não há composer na tela

Falta a credencial. Sem ela o envio não acontece, e botão que não envia é proibido pelo GOAL. O caminho
correto é o produto ter **autorização de dispositivo** (GOAL §16): chave por dispositivo emitida na
pareamento, aceita pelo WS. Isso é uma funcionalidade a especificar, não um hack a fazer agora.

**Mobile: 121 testes + 8 pulados**, `tsc` limpo, gate **14 ok**.

### Especificação do desbloqueio

O caminho para permitir envio está especificado em `docs/b3po/DEVICE-AUTHORIZATION.md`: chave por
dispositivo emitida no pareamento, rota `POST /api/b3po/device-ticket`, ticket com
`provider = "b3po-device"` aceito no WS só para métodos de sessão, revogação e rate limit, com nove
critérios de aceite. O cliente (`gateway-rpc.ts`) já aceita `{kind:'ticket'}` — falta o emissor.
