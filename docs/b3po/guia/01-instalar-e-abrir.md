# 1 — Instalar e abrir o B-3PO

## O que você vai instalar

O B-3PO no Windows vem em dois formatos. Os dois contêm o mesmo aplicativo:

| Arquivo | Para que serve | Tamanho |
|---|---|---|
| `B-3PO.exe` (em `win-unpacked`) | versão portátil: dá para abrir direto, sem instalar | ~235 MB |
| `B3PO-0.0.0-win-x64.msix` | instalador do Windows (aparece no Menu Iniciar) | ~191 MB |

Os arquivos ficam na pasta `release` da build. Os hashes SHA-256 oficiais estão em
[ARTIFACT-MANIFEST.md](../ARTIFACT-MANIFEST.md) — confira antes de abrir, é a única forma de saber que
o arquivo não foi trocado no caminho.

> **Aviso do Windows na primeira abertura.** O B-3PO **não é assinado** com certificado comercial.
> O Windows vai mostrar "Aplicativo não reconhecido" / SmartScreen. Isso é esperado: assinatura de
> código exige um certificado pago (🔒 dependência externa). Clique em "Mais informações" → "Executar
> assim mesmo". Não desative o SmartScreen do sistema para contornar isso.

## Primeiro acesso

1. Abra o B-3PO. A janela principal mostra a barra lateral de bots e a área de conversa.
2. Na primeira execução o app prepara o ambiente (Python e dependências). Isso pode levar alguns
   minutos; é normal ver progresso no terminal de inicialização.
3. Escolha o idioma em **Configurações → Idioma** (`Português (Brasil)`). A interface passa a mostrar
   "Nova conversa", "Bots", "Parar", "Enviando" etc. em português.

## Configurar o modelo (provider)

O bot precisa de um modelo para responder. Duas opções:

**A — local (recomendado para começar, sem custo e sem mandar dado para fora)**

1. Instale o [Ollama](https://ollama.com) e baixe um modelo:
   ```
   ollama pull qwen3.5:4b
   ```
2. Em **Configurações → Provedores**, escolha `custom` (compatível com OpenAI) e preencha:
   - URL base: `http://127.0.0.1:11434/v1`
   - Modelo: `qwen3.5:4b`
   - Chave: deixe vazio (Ollama local não exige)

**B — provedor externo**

Escolha o provedor na mesma tela e cole sua chave de API. A chave fica guardada na sua máquina, no
arquivo de configuração do perfil — nunca é enviada para a DZ23.

> **Atenção ao tamanho do contexto.** O B-3PO exige modelo com **pelo menos 64.000 tokens** de
> contexto. Modelos pequenos são recusados com a mensagem
> `Model X has a context window of N tokens, which is below the minimum 64,000 required`. É proteção,
> não bug: abaixo disso o agente perde o fio da conversa no meio de uma tarefa.

## Onde ficam seus dados

Tudo fica no seu computador, dentro da pasta do perfil Hermes (por padrão em
`%LOCALAPPDATA%`/`HERMES_HOME`). Sessões, transcrições, configurações e chaves de provider não saem da
máquina — detalhes no capítulo [Segurança e privacidade](05-seguranca-e-privacidade.md).

## Desinstalar

- Versão portátil: apague a pasta `win-unpacked`.
- MSIX: **Configurações → Aplicativos → B-3PO → Desinstalar**.

Seus perfis e conversas **não** são apagados pela desinstalação; eles ficam na pasta do perfil. Apague
manualmente só se quiser remover os dados.
