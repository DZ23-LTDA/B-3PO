# 3 — Android: instalar e parear

## O que existe hoje (e o que não existe)

O aplicativo Android do B-3PO **existe e roda**: foi instalado e aberto num emulador, com as telas de
lista de bots e de conversa, em português. O pareamento por link/QR funciona.

O que **ainda não** funciona: puxar as mensagens da conversa do gateway. A tela mostra o estado real
("Nenhum bot ainda", "Sem conexão com o computador") em vez de inventar conteúdo — e o próximo passo
técnico é justamente ligar essa conexão.

## Arquivos

| Arquivo | Tamanho | Para que serve |
|---|---|---|
| `app-release.apk` | 44,2 MB | instalar no aparelho (já tem o app embutido, não precisa de servidor de desenvolvimento) |
| `app-release.aab` | 19,0 MB | formato de publicação para a Play Store |
| `app-debug.apk` | 93,2 MB | **só para desenvolvimento**: não tem o app embutido, precisa do Metro rodando |

> **Aviso.** O APK/AAB é assinado com a chave de **desenvolvimento** do Android. Ele instala e roda,
> mas não serve para publicar na loja — isso exige um keystore de release, que ainda não existe
> (🔒 dependência externa).

## Instalar no aparelho

1. Copie o `app-release.apk` para o celular (cabo, Drive, o que preferir).
2. Toque no arquivo. O Android vai pedir permissão para "instalar apps desconhecidos" — autorize para
   o app de onde você abriu (Arquivos, Chrome…).
3. Abra o **B-3PO**.

Por linha de comando, com o celular conectado e depuração USB ligada:

```
adb install -r app-release.apk
```

## Parear com o computador

O pareamento é um link que o computador gera e você abre no celular. O formato é:

```
b3po://pair?url=<endereço do computador>&token=<chave>&name=<apelido do aparelho>
```

Regras que o aplicativo aplica (e que foram testadas no aparelho):

| Situação | O que acontece |
|---|---|
| endereço `https://` ou `wss://` | aceito |
| endereço `http://` ou `ws://` **local** (`localhost`, `127.0.0.1`, `::1`) | aceito (desenvolvimento) |
| endereço `http://` para outro computador da rede | **recusado**: "Conexão sem criptografia para um computador na rede" |
| link sem chave, ou chave curta | **recusado**: o convite está incompleto |
| convite com prazo vencido (`expires_at` no passado) | **recusado**: "Este convite expirou" |
| link que não é do B-3PO | **recusado**: "Este QR não é um convite do B-3PO" |

Se o pareamento der certo, a tela muda do estado "Sem conexão" para a lista de bots.

## Limitações conhecidas

- **Notificação não aprova nada.** Se um dia houver push, ele só abre a tela; a decisão é sempre sua,
  no botão, validada pelo computador.
- **Cofre seguro (Keychain/Keystore) está pendente**: o token de pareamento ainda não é gravado no
  cofre do sistema porque a biblioteca usada para isso não compila neste ambiente (limitação do
  React Native 0.81 com Node/Android atuais). Não invente confiança: trate o aparelho como
  não-confiável até esse item fechar.
- **iOS**: o projeto existe, mas compilar e assinar exige macOS + Xcode + certificado Apple (🔒).

## Desinstalar

Ajustes → Aplicativos → B-3PO → Desinstalar. O pareamento é perdido; é preciso parear de novo.
