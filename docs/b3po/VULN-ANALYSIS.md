# VULN-ANALYSIS — as 4 vulnerabilidades altas (npm audit)

**Data:** 2026-11-03 · **Commit de partida:** `a6a6730f` · **Comando:** `npm audit` na raiz do repositório

## Resumo

| Pacote | Versão encontrada | Faixa vulnerável | Produção? | Correção | Status |
|---|---|---|---|---|---|
| `follow-redirects` | 1.16.1 | `1.16.0 - 1.16.1` | **não** (dev) | 1.16.2 | **MITIGADO** — bloqueado por política |
| `joi` | 18.3.0 | `18.0.0 - 18.3.0` | **não** (dev) | 18.3.1 | **MITIGADO** — bloqueado por política |
| `undici` | 7.30.0 / 6.29.0 | `4.0.0 - 6.29.0 \|\| 7.0.0 - 7.30.0` | **não** (dev) | 6.29.1 / 7.30.1 | **MITIGADO** — bloqueado por política |
| `zod` | 4.6.5 | `<4.6.6` | **não** (dev) | 4.6.7 | **CORRIGIDO** (override → 4.6.7) |

Depois da correção do `zod`: **34 vulnerabilidades (31 moderate, 3 high)** no total.
`npm audit --omit=dev` → **8 moderate, 0 high**: nenhuma alta alcança o pacote distribuído.

## 1. `follow-redirects` — credenciais podem seguir redirecionamento

- **Advisory:** arrays `sensitiveHeaders` de outro realm são descartados e credenciais customizadas podem
  seguir redirects.
- **Caminho:** transitivo (dev). Não entra no bundle do Electron nem no Python.
- **Explorabilidade no B-3PO:** exige que o app faça requisição com credencial customizada seguindo
  redirect cross-realm — caminho de dependência de desenvolvimento.
- **Correção:** 1.16.2. `npm install` recusa com `ETARGET`:
  *"No matching version found for follow-redirects@1.16.2 with a date before 20/10/2026"*.
- **Causa do bloqueio:** `.npmrc` tem `min-release-age=14` (quarentena de 14 dias para pacotes novos) —
  defesa de supply chain deliberada do repositório. A versão corrigida ainda está dentro da janela.
- **Rollback:** trivial (override + lockfile).
- **Decisão:** aguardar a janela (ou decisão explícita do proprietário para allowlist do pacote).

## 2. `joi` — DoS quadrático em `string().email({ multiple: true })`

- **Advisory:** split quadrático em validação de múltiplos e-mails.
- **Caminho:** transitivo (dev).
- **Explorabilidade:** exige input controlado por atacante chegando a um schema `joi` com `multiple: true`.
  Não há superfície de produto que valide e-mails por `joi` no caminho de runtime do B-3PO.
- **Correção:** 18.3.1 — mesma barreira de `min-release-age`.

## 3. `undici` — 13 advisories (DoS, bypass de SRI, TLS, cache poisoning)

- **Caminho:** `node_modules/undici` (7.x, via cadeia de build) e `node-gyp` (6.x) — **dev**.
- **Explorabilidade:** seriam graves em um cliente HTTP de produção. Aqui ficam em ferramentas de build
  (dev), não no app empacotado.
- **Correção:** 6.29.1 / 7.30.1; o `audit fix` sugere `get-windows@10` (major) só porque é o caminho que
  re-resolve a árvore — não é requisito real de correção.
- **Decisão:** mesma barreira de `min-release-age`; reavaliar após a janela.

## 4. `zod` — exaustão de memória em coleções com limite

- **Caminho:** transitivo (dev).
- **Correção aplicada:** `overrides.zod = 4.6.7` (mesmo major 4; 4.6.5 → 4.6.7), `npm install` ok.
- **Verificação:** `npm audit --json` deixou de listar `zod` entre as altas.

## O que NÃO foi feito (e por quê)

- **Não** rodei `npm audit fix --force` (proibido pelo GOAL e destrutivo: troca majors).
- **Não** alterei `min-release-age` para furar a quarentena: é uma decisão de política de supply chain
  do repositório, com efeito em toda a árvore. Fica para decisão explícita do proprietário.
- **Não** removi testes nem reduzi assertions.

## Próximo passo objetivo

1. Reexecutar `npm audit fix` depois de 2026-11-17 (14 dias após a publicação das corrigidas).
2. Se o proprietário autorizar a exceção pontual: adicionar
   `min-release-age-exclude[]=follow-redirects`, `joi`, `undici` **apenas** com revisão do diff de lockfile.
3. Manter `npm audit --omit=dev` no CI como gate (hoje: 0 altas em produção).
