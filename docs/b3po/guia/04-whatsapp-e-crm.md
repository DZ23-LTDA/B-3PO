# 4 — WhatsApp e CRM

## Antes de tudo: o que é oficial e o que não é

O B-3PO integra pelo caminho **oficial**: WhatsApp Business Platform / Cloud API, com conta Meta
Business, templates aprovados e webhook assinado. Não usamos automação do WhatsApp Web, não fazemos
engenharia reversa de protocolo privado e não contornamos mecanismo de segurança do WhatsApp — nada
disso é arquitetura de produção aceitável, e o risco cairia no seu número.

## O que já está pronto

| Peça | Estado | O que faz |
|---|---|---|
| Consentimento | ✅ | registra opt-in/opt-out com evidência, respeita janela de 24 h, reconhece palavras de saída ("parar", "sair") e decide se pode enviar |
| Webhook | ✅ | valida assinatura HMAC-SHA-256 em tempo constante, faz o handshake do Meta e ignora reenvio pelo id da mensagem |
| Contatos | ✅ | telefone em E.164, contato estável (não duplica), funil com valor informativo |
| Envio real | 🔒 | depende de conta Meta Business aprovada + número verificado |

Nada disso envia mensagem sozinho hoje: as peças existem e são testadas, o disparo real está bloqueado
por credencial.

## Como funciona quando estiver ligado

1. **Contato escreve** → o webhook recebe, valida a assinatura e registra a mensagem.
2. **Consentimento decide** se o bot pode responder (janela de 24 h, opt-out, template).
3. **Bot classifica e sugere** — resumo da conversa, intenção, próxima ação.
4. **Ação sensível pede aprovação** — o bot não manda mensagem em massa nem mexe em valor sem você.

## Funil

As etapas padrão são: Novo lead → Contato iniciado → Qualificação → Proposta → Negociação → Ganho /
Perdido. As etapas são configuráveis. Cada oportunidade guarda valor, origem, responsável, contato,
probabilidade e motivo de perda.

## LGPD, em uma página

- **Finalidade**: cada dado tem um porquê declarado; não coletamos "só por segurança".
- **Minimização**: guardamos o necessário para atender, não tudo que é possível guardar.
- **Consentimento**: registrado com data e origem; revogar é uma operação normal, não um favor.
- **Retenção e exclusão**: prazos definidos e exclusão atendida (ver `DATA-RETENTION.md`).
- **Acesso**: quem vê o quê é decidido no backend, não na tela.

## Comando de desbloqueio (quando a conta existir)

O passo a passo de configuração da conta Meta, número, templates e variáveis de ambiente está em
[WHATSAPP-CRM-SETUP.md](../WHATSAPP-CRM-SETUP.md). Sem esses valores, não há envio — e o sistema
**não** finge que enviou.
