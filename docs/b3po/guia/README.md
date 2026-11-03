# Guia do usuário — B-3PO

Documentação em português para quem vai **usar** o B-3PO. Não é documentação de desenvolvedor
(`docs/b3po/*.md` cobre arquitetura, auditoria e evidências).

## O que é o B-3PO

Uma plataforma de bots que rodam **no seu computador**. Cada bot é um perfil do runtime Hermes com
nome, personalidade, instruções e mascote. Você conversa com ele pelo desktop ou pelo celular; o
trabalho acontece na sua máquina, não na nuvem de terceiros.

## Legenda de estado

Cada funcionalidade abaixo aparece com um destes selos. A regra é simples: **se não foi provado, não
está marcado como pronto**.

| Selo | Significado |
|---|---|
| ✅ VALIDADO | testado de ponta a ponta, com evidência registrada |
| 🟡 PARCIAL | existe e funciona, mas com limite conhecido (documentado no item) |
| ⬜ PLANEJADO | ainda não existe; não conte com isso hoje |
| 🔒 BLOQUEADO | depende de algo externo (conta, certificado, outro sistema) |

## Capítulos

| # | Assunto | Estado do capítulo |
|---|---|---|
| 1 | [Instalar e abrir](01-instalar-e-abrir.md) | ✅ |
| 2 | [Criar um bot e conversar](02-criar-e-conversar-com-bot.md) | ✅ |
| 3 | [Android: instalar e parear](03-android.md) | 🟡 |
| 4 | [WhatsApp e CRM](04-whatsapp-e-crm.md) | 🟡 🔒 |
| 5 | [Segurança e privacidade](05-seguranca-e-privacidade.md) | ✅ |
| 6 | [Problemas comuns](06-problemas-comuns.md) | ✅ |
| 7 | [Backup e atualização](07-backup-e-atualizacao.md) | ✅ |

## Resumo honesto do que existe hoje

**Funciona (validado nesta máquina):**

- criar bot com nome, instruções, persona e mascote oficial;
- conversar com o bot pelo desktop, com provider local (Ollama);
- cancelar uma execução em andamento;
- instalar o app Android e parear por link/QR, com a regra de TLS valendo no aparelho;
- catálogo de mascotes, tema escuro e interface em português.

**Funciona com limite:**

- aplicativo Android: telas de bots e conversa existem, mas a conversa ainda não puxa mensagens do
  gateway (a conexão é o próximo passo);
- WhatsApp CRM: consentimento, webhook assinado, contatos e funil existem e são testados; **envio
  real** de mensagem depende de conta Meta Business (🔒).

**Ainda não existe:**

- aplicativo iOS publicado (precisa de macOS/Xcode/certificado — 🔒);
- publicação em loja (precisa de keystore de release — 🔒).

## Onde pedir ajuda

Leia o capítulo [Problemas comuns](06-problemas-comuns.md) antes de tudo: ele cobre os erros que já
apareceram de verdade, com a mensagem exata e o que fazer.
