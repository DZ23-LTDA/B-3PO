# REFERENCE HADES ANALYSIS — `DZ23-LTDA/hades-ollama`

Documento canônico exigido pelo GOAL §04. Registra **o que foi examinado**, **o que foi decidido** e
**o que não foi importado** da referência técnica. As decisões de adoção vivem em
[`FEATURE_ADOPTION_MATRIX.md`](./FEATURE_ADOPTION_MATRIX.md); a origem/licença em
[`../legal/THIRD_PARTY_PROVENANCE.md`](../legal/THIRD_PARTY_PROVENANCE.md).

## 1. Identidade da referência (verificado)

| Campo | Valor |
|---|---|
| Repositório | `https://github.com/DZ23-LTDA/hades-ollama` |
| Base | fork do Ollama (Go), mantido por DZ23-LTDA |
| Licença | **MIT**, preservando `Copyright (c) Ollama` e os avisos upstream (confirmado no `LICENSE` e no README) |
| README lido | blob `86f0b0cdd6e2476d2ef79610dfc1e1730fa1627a` (31.048 bytes) |
| Commit fixado quando a proveniência foi escrita | `4b3e2185` |
| Estado autodeclarado | **`NOT_RELEASE_READY`** — "nenhuma promessa de posição, ranking ou recomendação por IAs" |
| Distribuição | o repositório distribui **código-fonte**; não há instalador assinado nem binário publicado |
| Assinatura Windows | preparado para SignPath Foundation; sem `SIGNPATH_API_TOKEN` os builds ficam **UNSIGNED** |

O próprio projeto declara que mockups conceituais são identificados como conceito e que as capturas
mostram dados sandbox locais. Isso foi tratado como aviso: **README não é homologação**.

## 2. O que foi examinado (superfícies que o README documenta)

- runtime agentic com missões persistentes, planos validados e execução com recuperação;
- approvals auditáveis, allowlists MCP, lifecycle de plugins/skills, contenção de symlink e DLP;
- multi-provider (API + CLI) sobre endpoints Ollama/OpenAI-compatíveis, **desligado por padrão**;
- HarnessRouter + UHP (Codex/Claude Code plugáveis como *harness* externo);
- fila persistente com retries, dead-letter e replay; PostgreSQL/Redis opcionais;
- memória semântica, ingestão de PDF/DOCX/XLSX, conectores HTTP, scheduler/webhooks;
- Browser Operator (Playwright) e Desktop companion (pareamento Linux/macOS/Windows);
- Company OS (KPIs, Growth OS, afiliados, catálogo, pedidos), builders e Evaluation OS;
- observabilidade: métricas Prometheus, traces locais/OTLP, SSE.

## 3. Decisões (resumo; detalhe na matriz)

| Classe | Capacidades |
|---|---|
| **A — adotar o padrão** (sem copiar código) | local-first; multi-provider existente do Hermes; MCP lifecycle; plugins/skills; approvals; ferramentas autorizadas; scheduler (cron do Hermes); isolamento por perfil; proteção contra regressão upstream (F2-A) |
| **B — adaptar a ideia** | catálogo de agentes → roster de Bots; fallback de provider **configurável e avisado** (nunca silencioso); browser operator com allowlist; memória semântica sem duplicar a canônica; ingestão de documentos |
| **C — referência de UX/arquitetura** | trace na UI; execução de missões → tarefas/kanban; planos validados → approval antes de ação sensível |
| **D — postergar** | computer use; conectores genéricos |
| **E — rejeitar** | HarnessRouter como **segundo loop** dentro do B-3PO; fila/missões próprias que dupliquem sessão do Hermes |

## 4. O que NÃO foi feito, e por quê

- **Não importamos código.** Nem Go, nem UI. O B-3PO é um fork do Hermes (Python/Electron/React) e um
  runtime Go não teria consumidor: criaria *dois donos de sessão* — proibido pela Ata (F1–F5).
- **Não adotamos o HarnessRouter** como caminho de execução. Se um dia entrar, será um *adapter* isolado
  que conecta capacidade, não um loop paralelo escondido.
- **Não assumimos os recursos do README como prontos.** O projeto se declara `NOT_RELEASE_READY`; nada
  daqui foi tratado como homologado no B-3PO.

## 5. Como isso aparece no produto

- O contrato de providers do B-3PO continua sendo o do Hermes (`agent/providers`), com seleção por Bot.
- O roster de Bots (plugin `hermes-bots`) segue a ideia de catálogo de agentes.
- Aprovações são decididas no **backend** (gateway), com a UI apenas apresentando — o padrão que o
  Hades descreve como "approvals auditáveis".
- `main` permanece espelho do upstream do Hermes; todo trabalho em `b3po-brand` (F2-A).

## 6. Limites desta análise

- Lida a documentação pública do repositório; **não** foi executado o runtime Hades nesta máquina.
- Números de maturidade do Hades não foram reproduzidos por nós: o documento registra o que o projeto
  declara e o que foi usado como inspiração — não uma homologação de terceiros.
