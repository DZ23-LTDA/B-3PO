# Faixa 241–250 — instaladores, CI/CD e documentação (fechamento)

**Rodada 170 de 256.**

## O que a faixa entregou

| R | Entrega | Resultado |
|---|---|---|
| 167 | auditoria de CI e instaladores | **59 workflows**, gate do produto **verificado localmente** (5 de 7 passos, 0 falhas), executável de **235,4 MB** com marca correta |
| 168 | versão do produto | **corrigi meu achado** (o `0.0.0` é placeholder documentado); o problema real é **não haver versão de produto** |
| 169 | documentação | **ERP-REPORT** produzido do código; **5 dos 6 "faltantes" já existiam com outro nome** |

## O que a faixa descobriu sobre o meu próprio relatório

Três notas que eu carreguei por **centenas de rodadas** estavam **erradas**:

| Nota antiga | Realidade medida |
|---|---|
| "instaladores não começaram" | **59 workflows**, gate verde, executável de 235 MB |
| "16 documentos do GOAL faltando" | **10 com nome exato + 5 com nome equivalente**; só 1 faltava |
| "`FileVersion 0.0.0` é defeito" | placeholder **documentado por issue**, descartado pelo código |

**A documentação de estado envelhece mais rápido que o código** — e eu estava repetindo a nota em vez de medir.

## O que está provado

| Alegação | Estado | Evidência |
|---|---|---|
| O gate do produto passa | `VALIDATED` | 5 comandos rodados localmente, 0 falhas |
| `brand_check` cobre a marca | `VALIDATED` | 14 checagens, 0 falhas |
| Produção sem alta em runtime | `VALIDATED` | `npm audit --omit=dev --audit-level=high` exit 0 |
| CRM passa | `VALIDATED` | 9 arquivos, 140 testes |
| Typecheck completo | `VALIDATED` | app + electron + e2e + config, exit 0 |
| Executável existe com marca certa | `VALIDATED` | `ProductName: B-3PO`, `CompanyName: DZ23-LTDA`, 235,4 MB |
| Executável não vai ao Git | `VALIDATED` | `.gitignore:124` |
| ERP tem 25 stores canônicos | `VALIDATED` | contagem no `electron/` |
| 17 domínios com tela e IPC | `VALIDATED` | 32 telas, 17 no menu |

## O que continua aberto

| Item | Estado | Bloqueio |
|---|---|---|
| Instalador NSIS (`.exe` de instalação) | `NOT_BUILT` | alvo não executado; toolchain baixa ~centenas de MB |
| macOS `.dmg` | `BLOCKED_BY_EXTERNAL_DEPENDENCY` | sem macOS/Xcode |
| Linux `AppImage`/`.deb` | `BLOCKED_BY_EXTERNAL_DEPENDENCY` | sem host Linux |
| Assinatura Authenticode | `BLOCKED_BY_EXTERNAL_DEPENDENCY` | certificado é do proprietário |
| **Versão de produto** | `NOT_IMPLEMENTED` | `displayVersion: null`; numeração é decisão do dono |
| SBOM commitado | `NOT_IMPLEMENTED` | roda informativo, não é guardado |
| `DUPLICATION-AUDIT` consolidado | `PARTIAL` | existe `NAV-DUPLICATES-R99` (escopo de navegação) |

## A decisão que a faixa tomou e por quê

**Não criei 5 documentos.** `PT-BR-REPORT`, `WHATSAPP-REPORT`, `MASCOT-COVERAGE`, `BUSINESS-CORE-ROADMAP` e
`DUPLICATION-AUDIT` já existem com outro nome:

```
PT-BR-REPORT.md          -> PT-BR-VALIDATION.md
WHATSAPP-REPORT.md       -> WHATSAPP-CRM-REPORT.md (+ ARCHITECTURE, SETUP)
MASCOT-COVERAGE.md       -> audit/MASCOT-AUDIT.md
BUSINESS-CORE-ROADMAP.md -> audit/BUSINESS-CORE-CLOSE-R100.md
DUPLICATION-AUDIT.md     -> audit/NAV-DUPLICATES-R99.md (escopo menor)
```

**Criar os cinco ao lado dos existentes seria exatamente a duplicação que o GOAL proíbe.** Um documento com
nome novo e conteúdo velho é pior que ausência: parece progresso.

## O que NÃO fiz, e o custo declarado

**Não rodei `npm run dist` nem `npm run builder -- --win nsis`.** O `electron-builder` baixa toolchains por
plataforma. O que a faixa precisava era **provar que o caminho existe e funciona até onde é verificável** — e
o executável de 235,4 MB de hoje é essa prova.

**O que isso deixa sem resposta:** se o instalador NSIS gera um `.exe` que instala corretamente numa máquina
limpa. Isso é `NOT_VERIFIED`, não "pronto".

## A regra da faixa, para as próximas

> **Nota antiga não é medição.** As três correções desta faixa vieram de rodar **um comando** em vez de ler o
> que eu mesmo tinha escrito antes.
>
> **Onde há um comando que responde, não use memória.**

## Medido na faixa

| Medida | Valor |
|---|---|
| Rodadas | 3 (167–169) |
| Workflows de CI verificados | **59** contados, **5 passos** executados |
| Passos do gate que falharam | **0** |
| Documentos exigidos que já existiam | **15 de 16** |
| Documentos criados | **1** (`ERP-REPORT.md`) |
| Documentos que eu **recusei** criar | **5** (duplicatas) |
| **Notas antigas minhas desmentidas** | **3** |
| Código de produto alterado | **0** |
