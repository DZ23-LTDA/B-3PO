# Android renderiza — APK release assinado com a chave de debug (rodada 153)

## O problema da r152, e a saída correta

A r152 provou que o APK debug compila, instala e abre, mas a tela ficava branca: o build debug tem
`getUseDeveloperSupport() = true`, e nessa configuração o React Native procura o Metro antes de usar o bundle
empacotado (`Failed to connect to /10.0.2.2:8081`).

Duas saídas foram descartadas com razão: rodar Metro faria o app depender de um servidor que usuário final não
tem; e `assembleRelease` "exige keystore". **A segunda premissa estava incompleta.**

## A assinatura injetada por linha de comando

O AGP aceita assinatura injetada por propriedade, sem tocar em `build.gradle`:

```
gradlew assembleRelease \
  -Pandroid.injected.signing.store.file=%USERPROFILE%\.android\debug.keystore \
  -Pandroid.injected.signing.store.password=android \
  -Pandroid.injected.signing.key.alias=androiddebugkey \
  -Pandroid.injected.signing.key.password=android
```

**BUILD SUCCESSFUL in 13s** → `app-release.apk`, **44,2 MB** (o debug tinha 94,5: sem tooling de desenvolvimento).

O keystore usado é o **debug.keystore que o próprio Gradle já cria** em `~/.android/` — 2618 bytes, gerado
automaticamente por qualquer build debug. **Não é um keystore de release; não criei credencial nenhuma.**

## O resultado, na tela

`evidencias-r153/android-renderiza.png` — emulador `dsh_pixel`, Android 15:

```
B-3PO
Seus bots, no seu computador.

[ Sem conexão com o computador
  Verifique se o B-3PO está aberto na mesma rede.
  Suas ações continuam pendentes até reconectar. ]

[ Conectar a um computador
  Cole o link de pareamento que o B-3PO mostrou no computador.
  [ b3po://pair?url=...&token=... ]
  [ Conectar ] ]
```

## O que essa tela prova

| Alegação | Veredito |
|---|---|
| o APK release gera | **provado** (44,2 MB) |
| instala num aparelho | **provado** |
| **renderiza a interface** | **provado** — a r152 não conseguiu, esta conseguiu |
| está em português | **provado** — todo o texto visível |
| mostra a marca B-3PO | **provado** — "B-3PO" no topo |
| tem estado de erro honesto | **provado** — "Sem conexão com o computador", e diz o que fazer |
| o pareamento funciona | **NÃO provado** — nenhum computador pareado neste teste |

## Por que "Sem conexão" é a tela certa

O app abriu **sem** um desktop pareado, e em vez de uma tela em branco ou um spinner infinito, ele diz o que
aconteceu e o que fazer. É o mesmo princípio que norteia as telas do desktop desde a r96: **não fingir estado**.

E a frase *"Suas ações continuam pendentes até reconectar"* descreve a intenção de projeto — o app não perde o
que estava fazendo.

## O que eu NÃO fiz

- Não editei `mobile/b3po-app`. A única escrita foi o bundle gerado (gitignored na r152) e o APK (gitignored).
- Não gerei keystore de release.
- Não commitei binário.
- Não pareei o app a um desktop — isso exigiria abrir o Desktop e gerar um link, e a tela de pareamento é
  justamente o que foi validado.

## O critério "Android" agora

| Item | Estado |
|---|---|
| Build debug | `TESTED` — r152 |
| Build release (assinatura de debug) | `TESTED` — r153 |
| Instalação em aparelho | `VALIDATED` |
| Renderização | `VALIDATED` — captura |
| pt-BR na tela | `VALIDATED` |
| Pareamento real com desktop | `NOT_TESTED` |
| APK release com **chave do proprietário** | `BLOCKED_BY_EXTERNAL_DEPENDENCY` — e deve continuar: a chave de distribuição é dele |
