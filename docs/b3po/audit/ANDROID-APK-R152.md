# Android — o APK existe, instala e abre (rodada 152)

## O que funcionou

| Passo | Resultado |
|---|---|
| SDK Android presente | **sim** — `D:\IA-Workspace\Deepseek\tools\android\sdk` |
| Java | **21.0.13 LTS** (Temurin) |
| `gradlew assembleDebug` | **BUILD SUCCESSFUL** |
| APK gerado | `app-debug.apk`, **94,5 MB** |
| Instalação no emulador | **sucesso** (`com.dz23.b3po`) |
| Abertura | **abre** — o runtime React Native inicializa |
| Bundle JS empacotado | **sim**, 1,0 MB dentro do APK |

O emulador é `dsh_pixel`, Android 15, x86_64. Nada disto precisou de keystore: **debug usa a assinatura de debug do próprio Gradle**.

## O que NÃO funcionou — com diagnóstico exato

**A tela fica branca.** O log do processo diz por quê, repetidamente:

```
WebSocket exception Failed to connect to /10.0.2.2:8081
```

O app está procurando o **Metro**, o servidor de desenvolvimento do React Native. O bundle está empacotado no APK, mas o build `debug` tem `getUseDeveloperSupport() = true` — e nessa configuração o React Native **tenta o dev server antes de usar o bundle**.

### O primeiro sintoma foi diferente, e também é informação

Antes de empacotar o bundle, a tela era outra:

```
Unable to load script.
Make sure you're running Metro or that your bundle 'index.android.bundle' is packaged correctly for release.
```

Ou seja: **o APK original não tinha o bundle**. Empacotar (`react-native bundle`) mudou o erro de "script ausente" para "não alcanço o Metro" — dois estados distintos, e o segundo é mais adiantado que o primeiro.

## As duas saídas, e por que nenhuma foi aplicada nesta rodada

| Saída | O que exige | Por que não agora |
|---|---|---|
| `adb reverse tcp:8081 tcp:8081` + Metro rodando | servidor de desenvolvimento vivo | Metro é processo de longa duração; o app passaria a depender dele, o que **não é** como o produto roda |
| APK **release** (`assembleRelease`) | **keystore de release** | o GOAL proíbe que eu gere keystore — é credencial do proprietário |

**Nenhuma das duas é "mais um passo".** A primeira faz o app depender de um servidor que um usuário final não tem; a segunda depende de uma credencial que não é minha.

## O que isso muda no registro do critério "Android"

| Alegação | Antes da r152 | Depois |
|---|---|---|
| "existe código Android" | provado (r151) | provado |
| "o projeto compila para Android" | **não provado** | **provado** — `BUILD SUCCESSFUL` |
| "gera um APK" | **não provado** | **provado** — 94,5 MB |
| "o APK instala num aparelho" | **não provado** | **provado** |
| "o app abre" | **não provado** | **provado** |
| "o app mostra a interface" | **não provado** | **NÃO** — modo debug quer Metro |
| "APK release assinado" | não provado | `BLOCKED_BY_EXTERNAL_DEPENDENCY` (keystore) |

**Veredito:** `PARTIAL` — a cadeia de build e instalação está provada de ponta a ponta; a renderização depende de Metro (debug) ou de keystore (release).

## O que eu NÃO fiz

- Não gerei keystore.
- Não commitei o APK (está em `.gitignore`, e **deve** estar: binário de 94 MB não entra em repositório).
- Não alterei `mobile/b3po-app` — a única escrita foi o `index.android.bundle` gerado pelo `react-native bundle`, que é artefato de build.
