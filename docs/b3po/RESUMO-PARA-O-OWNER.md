# B-3PO — resumo para o proprietário

Uma página, em português, com o que está pronto, o que está travado e o que falta. Sem promessa, sem número
inventado: tudo aqui saiu de medição ou de captura do app empacotado.

**Branch:** `b3po-brand` · 221 commits sobre `main` (que segue espelho limpo do upstream — decisão F2-A).
**Último commit:** `1da10ec8a9`.

---

## O que você pode abrir e usar hoje

| | |
|---|---|
| **App Windows** | `apps/desktop/release/B3PO-0.0.0-win-x64.msix` (191,4 MB) — **não assinado**; instala em modo de teste |
| **Idioma** | interface em **português** de ponta a ponta, incluindo datas. Restam **2 linhas** em inglês, ambas vindas do backend |
| **Bots** | criar, editar, persona/instruções, mascote, persistência em disco, conversa própria de cada bot |
| **CRM** | página própria com contadores reais, contatos, funil em 7 colunas, filtro e tarefas |
| **Atalhos** | painel de Atalhos de teclado traduzido (107 nomes de ação) |

## O CRM, em concreto

- **Indicadores**: contatos, oportunidades abertas, valor em aberto, ganho, tarefas abertas e **atrasadas** (estas
  em vermelho de perigo). Todos os números saem dos arquivos do seu computador — nada é estimado.
- **Funil**: uma coluna por etapa, com contagem e total. Mover de etapa, exigir motivo ao marcar "Perdido" e remover
  funcionam.
- **Filtro**: busca por oportunidade ou telefone, e recorte por etapa; o contador mostra `1 de 2`.
- **Tarefas**: prazo, prioridade e vínculo opcional com contato; atraso calculado do relógio, não gravado.
- **Contato excluído**: oportunidade ou tarefa que aponta para um contato que não existe mais mostra
  **"contato excluído"** em vez de um telefone solto.

Cada item acima tem captura em `docs/b3po/evidence/` (95 arquivos) feita no app empacotado, com dados semeados no
perfil.

## O que NÃO está pronto, e por quê

1. **Conversas do CRM** — o CRM tem contatos, funil e tarefas, mas **não** tem a caixa de entrada de conversas:
   isso depende do canal oficial do WhatsApp Business (conta + Cloud API). Sem isso, não há de onde puxar mensagem.
2. **iOS** — nenhum artefato: exige Mac + Xcode + certificado. `BLOCKED_BY_EXTERNAL_DEPENDENCY`.
3. **Assinatura** — o MSIX não é assinado (falta certificado/Azure Trusted Signing) e o APK/AAB estão em chave de
   **debug** (o keystore de release é seu e não vai para o Git).
4. **Instalação, atualização e desinstalação** — não foram testadas em Windows nem Android.
5. **43 testes vermelhos** na suíte desktop — nenhum é de marca, tradução ou produto: são symlink/ACL do Windows
   (17), empacotamento/assinatura (23) e 3 arquivos que estouram tempo sob carga paralela (passam sozinhos).
6. **2 linhas em inglês** — descrições servidas pelo schema do backend; o frontend não sobrescreve (testado com
   rebuild duas vezes).
7. **Robô parado** — o mascote é estático por sua decisão ("pode deixar sem movimentos mesmo").

## Como conferir em cinco minutos

```powershell
. ./activate.ps1
python scripts/check                                    # 14 checks, ok
cd apps/desktop; npx vitest run src/i18n src/app/settings src/app/crm
```

E abra o MSIX, vá em **Configurações → CRM** ou clique em **CRM** na sidebar.

## Onde está o detalhe

`docs/b3po/`: `DESKTOP-RELEASE-REPORT.md` (log rodada a rodada, inclusive dos meus erros),
`RELEASE-READINESS.md`, `WHATSAPP-CRM-REPORT.md`, `TEST-RESULTS.md`, `BASELINE-DESKTOP-SUITE.md`,
`PT-CATALOG-DEBT.md`, `EVIDENCE-INDEX.md`, `ARTIFACT-MANIFEST.md`, `guia/`.

## Status

**NOT_READY** — pelos itens 1 a 4 acima, que dependem de você (conta WhatsApp, certificados) ou de ambiente
(macOS). O que não dependia de terceiro está entregue e comprovado.

## O que eu preciso de você (checklist)

Os quatro bloqueios, com o que pedir e como me entregar, estão em
[DESBLOQUEIO-O-QUE-PRECISO.md](DESBLOQUEIO-O-QUE-PRECISO.md). Resumo:

| Item | Desbloqueia | Você precisa |
|---|---|---|
| WhatsApp oficial | **conversas do CRM** | conta Meta Business + WABA + número verificado + token de system user |
| Certificado Windows | distribuir o MSIX | certificado OV/EV ou Azure Trusted Signing |
| Keystore Android | APK de release | keystore gerado por você + senha |
| macOS/Xcode | cliente iOS | Mac (ou CI macOS) + conta Apple |

Se só puder fazer uma: **WhatsApp**. É o que muda o que o produto é; as outras mudam como ele é entregue.
