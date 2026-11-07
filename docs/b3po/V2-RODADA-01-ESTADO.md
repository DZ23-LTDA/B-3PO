# GOAL V2 — RODADA 1: PROTEÇÃO E RECONCILIAÇÃO DO ESTADO

**Data**: 05/11/2026 06:42 (America/Sao_Paulo)
**Branch de trabalho**: `b3po-brand`
**Nenhuma alteração de produto foi feita nesta rodada.** Só leitura, verificação e backup.

---

## REGRA ZERO — O AMBIENTE REAL (declarado, não presumido)

### A. PC / Local

| Item | Estado |
|---|---|
| `D:\IA-Workspace\Deepseek\projects\C-3PO BOT` | **existe, acessível** |
| Escrita no diretório | **sim** (testado com arquivo temporário) |
| Processo Electron aberto | **sim** — `B-3PO`, **PID 48576** |
| Build em execução | `apps/desktop/dist/` — 53 MB, 1171 arquivos |

### B. Git / GitHub — **verificado com `git fetch` fresco**

| Item | Valor |
|---|---|
| Branch | **`b3po-brand`** |
| **HEAD local** | **`d5ed44b6aa36a93f6521cf99ed6fad167e07ba41`** |
| **`origin/b3po-brand`** | **`d5ed44b6aa36a93f6521cf99ed6fad167e07ba41`** |
| **Iguais?** | **SIM** |
| Atrás / à frente | **0 / 0** |
| Upstream da branch | `origin/b3po-brand` |
| Remotes | `origin` → `DZ23-LTDA/B-3PO` · **`upstream` → `NousResearch/hermes-agent`** |
| Tags | **0** |
| Worktrees | **1** (`C-3PO BOT`, em `d5ed44b6aa`) |
| Working tree | **LIMPO** — 0 modificados, 0 untracked |
| Stash | **0** |

### `main`

| Item | Valor |
|---|---|
| `main` local | `f4cf411f28f90ab2cb0a8ffd7427a64bde386fbb` |
| `origin/main` | `f4cf411f28f90ab2cb0a8ffd7427a64bde386fbb` |
| **INTACTA?** | **SIM** |

### C. Hermes — runtime

| Item | Estado |
|---|---|
| `hermes` no PATH | **NÃO** |
| `hermes_cli` importável | **SIM**, de `C-3PO BOT\hermes_cli\__init__.py` |
| Python do ambiente de teste | `b3po-testenv\Scripts\python.exe` — **existe** |

**Consequência**: `hermes tools` / `hermes doctor` **não podem ser executados como comando**. O runtime está disponível como **código importável**, não como CLI instalada. Não vou inventar saída de ferramenta que não roda.

### D. Subagentes DZ23

| Item | Estado |
|---|---|
| MCP `dz23` disponível | **sim** |
| Ferramentas reais | `list_models`, `consensus`, `delegate`, `swarm_run`, `routing_explain`, `verify_model` |
| Uso comprovado anterior | r246: `list_models` → 14 targets · `consensus` → 3 respostas |

---

## RECONCILIAÇÃO PC × GITHUB — o ponto que o GOAL mandou não presumir

O GOAL avisou: *"A verificação recebida diz PC=GitHub em c47539484a, mas a referência remota posteriormente avançou a d5ed44b6aa36. Reconciliar novamente; não repetir que estão sincronizados sem verificar o HEAD local atual."*

**Reconciliado agora, com `git fetch origin` antes de comparar:**

```
HEAD local              d5ed44b6aa36a93f6521cf99ed6fad167e07ba41
origin/b3po-brand       d5ed44b6aa36a93f6521cf99ed6fad167e07ba41
                        IDÊNTICOS        (0 commits de diferença)
```

**O PC NÃO está em `c47539484a`** — já está em `d5ed44b6aa`, o commit que o GOAL viu no GitHub. A diferença entre os dois é **um commit de documentação** (`d5ed44b6aa docs(verificacao): TXT com os 13 itens da checklist`), feito depois da verificação anterior.

**Nada por commitar, nada por empurrar.**

---

## O ZIP RECEBIDO — auditado, e NÃO é o produto

`C:\Users\lmpra\Downloads\B-3PO-main.zip` — 96,8 MB, **23.333 entradas**, criado 05/11 06:17.

| Caminho do produto | Existe no ZIP? |
|---|---|
| `apps/desktop/electron/erp-ipc.ts` | **NÃO** |
| `apps/desktop/src/plugins/b3po-nav/plugin.tsx` | **NÃO** |
| `docs/b3po/VERIFICACAO-RECEBIDA-256.txt` | **NÃO** |
| `apps/desktop/release` | **NÃO** |
| `crm/src` | **NÃO** |
| `brand/avatars` | **NÃO** |

**Raiz única: `B-3PO-main/`.** Nenhum caminho do produto B-3PO aparece.

**Conclusão**: é o **upstream Hermes baixado como ZIP da branch `main`**, não o produto `b3po-brand`. **Não serve como backup nem como fonte canônica** — exatamente o que o GOAL alertou.

---

## BACKUP VERIFICÁVEL — criado nesta rodada

```
D:\IA-Workspace\Deepseek\projects\C-3PO BOT-backups\
  B-3PO-b3po-brand_2026-11-05_0642.bundle      1158,8 MB
```

**Verificado com `git bundle verify`** — 7 refs:

```
d5ed44b6aa...  refs/heads/b3po-brand
f4cf411f28...  refs/heads/main
f4cf411f28...  refs/remotes/origin/HEAD
d5ed44b6aa...  refs/remotes/origin/b3po-brand
f4cf411f28...  refs/remotes/origin/main
```

**Como restaurar** (não executado — é só recuperação):

```
git clone B-3PO-b3po-brand_2026-11-05_0642.bundle B-3PO-restaurado
```

**Por que bundle e não ZIP**: o bundle é **verificável** (`git bundle verify` prova que os objetos estão íntegros e lista as refs), restaurável por inteiro, e não depende de o diretório de trabalho estar limpo.

---

## INVENTÁRIO DE ARTEFATOS (ignorados pelo Git)

| Caminho | Tamanho | Arquivos |
|---|---|---|
| `node_modules/` | 1060 MB | 84.504 |
| `apps/desktop/release/` | **1055 MB** | 2.476 |
| `apps/desktop/node_modules/` | 165 MB | 3.911 |
| `apps/desktop/dist/` | 53 MB | 1.171 |
| `.hermes/` | ~0 MB | 2 |

### O estado do instalador — com uma inconsistência

```
apps/desktop/release/
  win-unpacked/                          B-3PO.exe  → ProductVersion 1.0.0.0   (correto)
  win-unpacked.bak/                      backup de build antigo
  B3PO-0.0.0-win-x64.msix                191,4 MB   ← NOME COM VERSÃO ANTIGA
  builder-debug.yml
```

**O `.exe` está em `1.0.0.0`. O `.msix` ficou com o nome `0.0.0`** — é o artefato gerado **antes** da correção de versão da r241 e **nunca regenerado**.

**Isso não é defeito de produto** — é sujeira de build. Mas **não deve ser entregue a um auditor** com esse nome.

---

## O QUE FOI PRESERVADO

- **Nenhum `reset --hard`, `clean -fd`, `rebase` ou `force push`.**
- **Nenhum `checkout`** — a árvore estava limpa e continua limpa.
- **Nenhuma alteração local perdida** (não havia nenhuma).
- **`main` intocada** em `f4cf411f28`.

## O QUE **NÃO** FOI FEITO NESTA RODADA

| Item | Por quê |
|---|---|
| Corrigir as 25 lacunas de IPC | é a **fase 2** |
| Investigar o CRM órfão | é a **fase 3** |
| Regenerar o MSIX | não é proteção de estado; é build |
| Rodar a suíte completa | não pedido nesta rodada; o gate roda na fase de correção |

## PRÓXIMA RODADA (fase 1, continuação)

1. Ler `AGENTS.md` e docs operacionais aplicáveis (§3 item 1) — **ainda não lido nesta rodada**.
2. Auditar o modelo de dados JSON por domínio (§1): limites, concorrência, backup, recuperação, consistência.
3. Iniciar a **fase 2**: listar os **40 canais IPC** e classificar os **25 sem guard**.
