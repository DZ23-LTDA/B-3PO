# THIRD-PARTY-PROVENANCE

Registro de toda origem externa usada no B-3PO. **Nenhum código foi copiado** de Hades-Ollama ou
Codync até esta data; eles foram auditados como referência.

## 1. Base do produto

| Origem | Commit fixado | Licença | O que foi usado | Obrigação cumprida |
|---|---|---|---|---|
| NousResearch/hermes-agent | `f4cf411f` (upstream em `main`) | **MIT** | base do runtime, gateway, desktop, plugins | `LICENSE` e `NOTICE` preservados com atribuição |
| DZ23-LTDA/B-3PO (fork) | `b3po-brand` | **MIT** | marca, schema, orquestração, i18n, CRM core | aviso de modificações no `NOTICE` |

## 2. Referências auditadas (sem cópia de código)

| Origem | Commit | Licença | Uso | Código copiado? |
|---|---|---|---|---|
| DZ23-LTDA/hades-ollama | `4b3e2185` | **MIT** (`Copyright (c) Ollama`) | referência de local-first, providers, approvals, filas | **nenhum** |
| leepokai/Codync | `36913495` | **Apache-2.0** + `TRADEMARK.md` | referência de host/client, grupos, notificações | **nenhum** |

### O que foi lido e o que foi decidido

| Capacidade | Decisão | Para onde vai |
|---|---|---|
| Local-first / providers | ADAPTAR | já existe no Hermes; expor no schema v2 |
| Missões, skills, plugins, API local | REJEITAR duplicação | usar cron/skills/gateway existentes |
| Filas/retry/dead-letter | BACKLOG | despacho B-3PO |
| Host/client, pareamento, cursor | REIMPLEMENTAR | contrato próprio (sem relay Codync) |
| Grupos, menções, anti-loop | ADAPTAR/REIMPLEMENTAR | Bot Mode + guarda de rodadas |
| Notificações | REIMPLEMENTAR | serviço B-3PO |
| Codync Cloud / marca / logo / ícone | **REJEITAR** | proibido |

## 3. Assets

| Asset | Origem | Licença | Obrigação |
|---|---|---|---|
| 20 mascotes, robô, wordmark, ícones | arte própria DZ23 | **não** coberta pelo MIT | marcado no `NOTICE` |
| Ícones derivados (ico/icns/appx/favicon) | gerados de `brand/icons` por `scripts/generate_icons.py` | DZ23 | reproduzível pelo script |

Nenhum asset do Hermes, Hades, Ollama, Codync ou C-3PO/Lucasfilm foi usado como marca do produto.

## 4. Dependências

- npm: instaladas do registro público; `npm audit` roda no gate local (4 altas abertas, rastreadas em
  `SECURITY-RELEASE-REPORT.md`).
- Python: pinadas em `uv.lock`; nenhuma dependência de Hades/Codync foi adicionada.

## 5. Regra para port futuro

Antes de qualquer cópia: commit + licença + destino + dependências + risco + testes + entrada nesta
tabela + revisão independente. Código Apache-2.0 entra com cabeçalho de atribuição e marcação de
alterações; código MIT entra preservando o aviso de copyright no arquivo.
