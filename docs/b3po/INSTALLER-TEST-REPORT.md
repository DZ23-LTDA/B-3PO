# INSTALLER-TEST-REPORT — instalação limpa e origem do código

**Data:** 2026-11-03 · **Branch:** `b3po-brand` · **Ambiente:** Windows 11, PowerShell 7, Git Bash

## 1. O que foi testado

| # | Teste | Tipo | Resultado |
|---|---|---|---|
| 1 | `install.ps1 -PrintSource` (padrão) | comportamental, real | **ok** — `B-3PO` / `DZ23-LTDA/B-3PO` / `b3po-brand` / `upstream_mode=false` |
| 2 | `install.ps1 -PrintSource -Upstream` | comportamental | **ok** — `NousResearch/hermes-agent` / `main` / `upstream_mode=true` |
| 3 | `install.ps1` + `HERMES_REPO_URL`/`HERMES_INSTALL_BRANCH` | comportamental | **ok** — fork e branch do operador |
| 4 | `install.sh --print-source` | comportamental (Git Bash) | **ok** — `B-3PO` / `B-3PO.git` / `b3po-brand` |
| 5 | `install.sh --print-source --upstream` | comportamental | **ok** — upstream + `main` |
| 6 | `bootstrap-runner` stamp sem branch | unitário (vitest) | **ok** — segue `b3po-brand` |
| 7 | `bootstrap-runner` commit imutável | unitário | **ok** — mantém o pin |

Saída real do teste 1:

```json
{"product":"B-3PO","repo_url":"https://github.com/DZ23-LTDA/B-3PO.git","branch":"b3po-brand","commit":"","upstream_mode":false}
```

Saída real do teste 4:

```json
{"product":"B-3PO","repo_url":"https://github.com/DZ23-LTDA/B-3PO.git","branch":"b3po-brand","commit":"","upstream_mode":false}
```

## 2. Instalação limpa real (bootstrap por etapa)

Executada em `HERMES_HOME` novo, com `HERMES_REPO_URL` apontando para o repositório do produto:

| Etapa | Resultado | Observação |
|---|---|---|
| prerequisites | ok (26 s) | git 2.53.0+3 |
| repository | ok (43 s) | checkout do commit `6b25838e` (produto) |
| venv | ok (1 s) | |
| python-deps | ok (62 s) | exercita a correção de MAX_PATH |
| config | ok (1 s) | |
| products | ok (72 s) | `hermes` instalado |
| setup / gateway | requer input do usuário | gateway subido por comando |
| complete | ok | `pinned 6b25838e11` |

## 3. Limites deste relatório

- **Não** houve instalação limpa disparada pelo clique do app nesta rodada (a resolução de origem é a
  mesma, provada por `-PrintSource` e pelo bootstrap manual).
- O teste 4 depende de Git Bash; em runner Linux o mesmo teste roda com `bash` nativo.
- Nenhum secret foi usado: os testes limpam `HERMES_REPO_URL`/`HERMES_INSTALL_BRANCH`/`HERMES_INSTALL_UPSTREAM`
  do ambiente herdado e não tocam em rede.

## 4. Como reproduzir

```bash
# PowerShell
pwsh -NoProfile -File scripts/install.ps1 -PrintSource
pwsh -NoProfile -File scripts/install.ps1 -PrintSource -Upstream

# Git Bash / Linux
bash scripts/install.sh --print-source
bash scripts/install.sh --print-source --upstream

# Suítes
python -m pytest tests/scripts/install/test_product_source.py -q
npx vitest run apps/desktop/electron/bootstrap-product-source.test.ts
```
