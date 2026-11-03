# INSTALLER-PROVENANCE — de onde vem o código instalado

**Data:** 2026-11-03 · **Branch:** `b3po-brand`
**Regra:** quem instala o B-3PO recebe o B-3PO. O upstream Hermes é origem **técnica documentada**,
alcançável apenas por modo explícito.

## 1. Padrões por instalador (antes → depois)

| Instalador | Antes | Depois |
|---|---|---|
| `scripts/install.ps1` (`$RepoUrl`) | `https://github.com/NousResearch/hermes-agent.git` | **`https://github.com/DZ23-LTDA/B-3PO.git`** |
| `scripts/install.ps1` (`$Branch`) | `main` | **`b3po-brand`** |
| `scripts/install.sh` (`REPO_URL`) | `https://github.com/NousResearch/hermes-agent.git` | **`https://github.com/DZ23-LTDA/B-3PO.git`** |
| `scripts/install.sh` (`BRANCH`) | `main` | **`b3po-brand`** |
| `apps/desktop/electron/bootstrap-runner.ts` (`FALLBACK_BRANCH`) | `main` | **`b3po-brand`** |
| Banner | "Hermes Agent Installer" | "B-3PO Installer" |
| Conclusão | "Hermes Agent install complete" | "B-3PO install complete" |

## 2. Precedência (identidade como dado)

Cada instalador resolve a origem nesta ordem, e só nesta:

1. **Override explícito** — `HERMES_REPO_URL` (+ `HERMES_INSTALL_BRANCH`) ou `-Branch`/`--branch`;
2. **Modo upstream explícito** — `-Upstream` / `--upstream` / `HERMES_INSTALL_UPSTREAM=1`
   → `NousResearch/hermes-agent` + `main`;
3. **Produto** — `DZ23-LTDA/B-3PO` + `b3po-brand`.

Não existe caminho em que o produto caia no upstream sem alguém pedir.

## 3. Contrato de consulta (sem efeito colateral)

Os dois instaladores expõem a resolução real sem instalar nada:

```powershell
pwsh -File scripts/install.ps1 -PrintSource
# {"product":"B-3PO","repo_url":"https://github.com/DZ23-LTDA/B-3PO.git","branch":"b3po-brand","commit":"","upstream_mode":false}

pwsh -File scripts/install.ps1 -PrintSource -Upstream
# {"product":"B-3PO","repo_url":"https://github.com/NousResearch/hermes-agent.git","branch":"main","commit":"","upstream_mode":true}
```

```bash
bash scripts/install.sh --print-source
bash scripts/install.sh --print-source --upstream
```

## 4. Registro de versão instalada

- `-Commit` / `--commit` fixa o SHA; sem ele, a branch de produto é seguida.
- O instalador grava o commit no install stamp; `complete` imprime
  `B-3PO install complete (pinned <sha>)`.
- O desktop reusa esse stamp (`installRefForStamp`) e, sem branch no stamp, segue `b3po-brand`.

## 5. Upstream como origem técnica

O Hermes continua sendo o único runtime e a base legal (MIT). O modo upstream existe para
desenvolvimento e diagnóstico:

```bash
bash scripts/install.sh --upstream          # Hermes puro, sem marca B-3PO
HERMES_INSTALL_UPSTREAM=1 ./scripts/install.ps1
```

Nesse modo o produto instalado **não** é o B-3PO — e o `product` reportado continua `B-3PO` apenas
porque o script é do B-3PO; `upstream_mode: true` é o sinal de que a árvore é upstream.

## 6. Testes que impedem regressão

| Teste | O que prova |
|---|---|
| `tests/scripts/install/test_product_source.py` (5) | executa a resolução real dos dois instaladores: produto por padrão, upstream só explícito, overrides respeitados |
| `apps/desktop/electron/bootstrap-product-source.test.ts` (4) | stamp sem branch segue `b3po-brand`; commit imutável continua fixado |

Qualquer volta do padrão para `NousResearch/hermes-agent` falha esses testes.

## 7. Pendências

| Item | Status |
|---|---|
| Instalação limpa completa pelo app (clique) usando o novo padrão | **PARCIAL** — validado por `-PrintSource` + bootstrap manual por etapa |
| `install.cmd` (wrapper) | documenta o fluxo; não tem URL própria |
| Assinatura do MSIX/instalador | **BLOCKED** (certificado) |
