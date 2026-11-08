# 6 — Problemas comuns

Todos os itens abaixo são erros que **aconteceram de verdade** durante o desenvolvimento. A mensagem
está como você vai ver na tela.

## "404 page not found" ao mandar a primeira mensagem

O endereço do provider está incompleto. Dois casos:

- **Ollama**: a URL precisa terminar em `/v1` → `http://127.0.0.1:11434/v1`. Sem o `/v1`, o pedido vai
  para `/chat/completions` e o servidor responde 404.
- **Provider embutido com endpoint próprio**: a configuração do perfil precisa carregar o bloco
  `providers.<nome>` (não só `base_url` solto).

## "Model X has a context window of N tokens, which is below the minimum 64,000"

O modelo escolhido é pequeno demais. Escolha um com **64k de contexto ou mais**. Exemplo que passa:
`qwen3.5:4b` (262k). Exemplo que não passa: `qwen3:8b` (40.960).

## A conversa mostra "Waking up <perfil>…" e parece travada

Esse aviso é a preparação do backend do perfil. Ele fica no topo por alguns segundos e **não bloqueia**
a caixa de mensagem. Se passar de ~30 s, feche e abra a conversa de novo; se repetir, veja o log de
inicialização do app.

## O bot "pensa" mas não usa ferramenta nenhuma

Modelos muito pequenos narram a ação ("vou rodar o comando") em vez de emitir a chamada de ferramenta.
Não é bug do B-3PO: é limite do modelo. Use um modelo com suporte a tool calling e contexto ≥ 64k.

## A janela abre em inglês mesmo com o idioma em português

Escolha o idioma em **Configurações → Idioma** e reabra a conversa. Os títulos das abas são recalculados
quando o idioma carrega; se ficou preso, fechar e abrir o app resolve.

## O celular recusa o link de pareamento

Leia a mensagem, ela diz o motivo exato:

- "Conexão sem criptografia para um computador na rede" → use `https://` ou `wss://`, ou pareie com
  `localhost` apenas em desenvolvimento.
- "Este convite expirou" → gere um QR novo no computador.
- "Este QR não é um convite do B-3PO" → o link não começa com `b3po://pair`.

## O APK não abre / fica em tela branca

Você instalou o **debug** (93 MB). Ele não tem o app embutido e espera um servidor de desenvolvimento.
Instale o `app-release.apk` (44 MB).

## `npm install` falha com `ETARGET ... with a date before ...`

Este repositório usa `.npmrc` com `min-release-age=14`: pacotes publicados nos últimos 14 dias são
recusados de propósito (proteção de supply chain). Espere a data passar ou use a versão anterior
estável.

## Ainda travado?

1. Veja `docs/b3po/RELEASE-READINESS.md` — limitações conhecidas por plataforma.
2. Veja os logs do app (pasta `logs` do perfil Hermes).
3. Se for erro de integração com WhatsApp, confirme a conta Meta antes de investigar código.
