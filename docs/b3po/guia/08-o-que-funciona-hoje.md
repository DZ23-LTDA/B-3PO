# 8 — O que funciona hoje, o que é parcial e o que não existe

Esta página existe para você não perder tempo procurando coisa que não tem. Três marcas, usadas sem exceção:

- ✅ **validado** — funciona no app instalado, com captura ou teste no repositório
- 🟡 **parcial** — existe e funciona, mas com um limite conhecido (está escrito ao lado)
- ⬜ **planejado** — não existe; não conte com isso hoje

---

## ✅ Validado

| O que | Detalhe |
|---|---|
| Abrir e usar o app no Windows | instalador MSIX. **Não assinado** — o Windows mostra aviso |
| Idioma em português | interface inteira, **incluindo datas**. Sobram 2 linhas vindas do servidor |
| Criar bot | nome, descrição, persona, instruções, escolha de mascote |
| Editar bot | tudo acima, quando quiser |
| Persistência | fecha o app, reabre, seus bots continuam lá |
| Conversar com o bot | cada bot tem a própria conversa, guardada em disco |
| CRM — contatos | cadastrar, editar, apagar, exportar CSV |
| CRM — funil | 7 etapas, mover oportunidade, motivo ao perder, remover |
| CRM — filtro | buscar por nome/telefone e recortar por etapa, com contagem |
| CRM — tarefas | prazo, prioridade, marcar feita, atraso em vermelho |
| CRM — indicadores | contatos, oportunidades abertas, valor em aberto, ganho, tarefas e atrasadas |
| Atalhos de teclado | painel completo em português |
| Android — parear e conversar | link/QR, lista de bots, envio de mensagem real |

## 🟡 Parcial

| O que | O limite |
|---|---|
| **Conversas do CRM** | a caixa de entrada **não** existe. Contatos, funil e tarefas funcionam com dados locais; conversa precisa do canal oficial do WhatsApp Business |
| **Android** | conversa, envio, reconexão e aprovações funcionam. A **sessão não persiste** entre execuções: você pareia de novo a cada abertura |
| **Aprovações** | o celular já mostra e responde pedido do computador. Falta ter um pedido real nascendo do gateway |
| **Assinatura** | MSIX sem certificado; APK/AAB em chave de debug. Funciona para testar, não para distribuir |
| **Mascote** | aparece e é escolhido por bot. É **estático** — você pediu "pode deixar sem movimentos mesmo" |
| **Descrições do servidor** | 2 linhas em inglês nas Configurações vêm do backend, não da tela |

## ⬜ Planejado / não existe

| O que | Por quê |
|---|---|
| **iOS** | precisa de Mac, Xcode e certificado Apple. Não há artefato iOS |
| **macOS / Linux desktop** | só Windows foi construído aqui |
| **Enviar/receber WhatsApp de verdade** | precisa de conta WhatsApp Business + Cloud API |
| **Instalação limpa, atualização e desinstalação** | não foram testadas. Não afirmo que funcionam |
| **Equipes de agentes, automações, marketplace** | previstos no plano, não implementados |

## Como conferir sozinho

```powershell
. ./activate.ps1
python scripts/check                                          # 14 checks
cd apps/desktop; npx vitest run src/i18n src/app/settings      # 119 + 725 testes
cd ../../crm;    npx vitest run                                # 140 testes
```

O detalhe técnico de cada limite está em `docs/b3po/RELEASE-READINESS.md`. O histórico de cada rodada de trabalho,
inclusive dos erros, está em `docs/b3po/DESKTOP-RELEASE-REPORT.md`.

## Por que esta página é tão explícita

Porque prometer o que não existe é pior do que admitir o que falta. Tudo marcado ✅ acima foi aberto no app
instalado e conferido; tudo marcado ⬜ continua marcado assim até existir de verdade.
