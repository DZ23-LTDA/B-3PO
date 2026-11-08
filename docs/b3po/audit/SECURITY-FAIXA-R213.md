# Segurança: auditoria da faixa 211–213 (rodada 213)

## O que foi medido nesta faixa

| Rodada | Objeto | Resultado |
|---|---|---|
| 211 | **Isolamento multitenant** | **24 de 24** stores filtram; **0 violações**; invariante virou teste |
| 212 | **LGPD** | acesso e eliminação completos com tela; **retenção** inexistente → criada |
| 213 | **npm audit** (lacuna S3) | medido pela primeira vez |

## S3 — `npm audit`, medido

A lacuna S3 do `SECURITY-GAP-REPORT.md` dizia: *"não foi executado nesta rodada"*. Foi agora.

### Todas as dependências

| Severidade | Quantidade |
|---|---|
| crítica | **0** |
| alta | **3** |
| média | **12** |
| baixa | 0 |
| **total** | **15** |

Os 3 altos são **`follow-redirects`** e **`joi`** — ambos **`devDependencies`** (cadeia do `electron-builder`).

### Somente produção (`--omit=dev`) — a superfície que vai no app

| Severidade | Quantidade |
|---|---|
| crítica | **0** |
| **alta** | **0** |
| média | **6** |

Os 6 médios: `cacache`, `glob`, `make-fetch-happen`, `minimatch`, `node-gyp`, `get-windows` — **cadeia do `node-gyp` via `get-windows`**, usado na resolução de pastas do sistema.

**Nenhuma vulnerabilidade alta ou crítica chega ao aplicativo empacotado.**

Isso **não é** "está tudo bem": é a diferença entre **risco de build** (a máquina que empacota) e **risco de produto** (a máquina do usuário). **As 3 altas afetam quem compila, não quem usa.**

## Path traversal — o que a auditoria encontrou

`fs-ipc.ts` expõe `reveal`, `rename`, `writeText`, `trash` e **aceita caminho absoluto em qualquer lugar do disco**:

> *"IT DOES NOT CONFINE THE PATH TO A ROOT. `resolveRequestedPathForIpc` rejects NUL and Windows device paths,
> and `..` is resolved rather than refused — so an absolute path anywhere on disk is accepted. The renderer is
> this app's own code (contextIsolation, no nodeIntegration), so the threat model is **'renderer XSS means
> arbitrary file write'**."*

**Isso é uma decisão, não um esquecimento** — e está fixada por `hardening-traversal.test.ts`, que **afirma
explicitamente** que `../` e caminho absoluto são **aceitos**, e que *"não existe noção de 'dentro do permitido'"*.

Confinar a uma raiz quebraria criar projeto em qualquer pasta — **é decisão de produto**.

### Onde a proteção existe, e é a que importa

O **SDK de plugins** roda código de terceiro e **é confinado**:

```ts
const protectedRoots = async () => realRoots([...deps.protectedRoots(), deps.userDataDir(), ...systemRoots()])
```

Protegido por `plugin-files-hardening.test.ts`, com quatro contratos:

- recusa renomear pasta-chave para que os arquivos percam a regra
- **recusa toda operação** sob raiz protegida
- uma leitura em voo não desfaz uma revogação feita no meio
- trata identificador como `constructor` como chave comum, não como protótipo

**A superfície ampla é do código do próprio app. A superfície de terceiro é confinada.** Essa é a separação certa.

## O que continua aberto

| Item | Estado |
|---|---|
| Confinar `fs:*` a raízes permitidas | **DECISÃO DE PRODUTO**, não check faltando |
| Teste de isolamento com 2 tenants reais | **BLOCKED_BY_PRODUCT_DECISION** (uma instalação = uma empresa) |
| Retenção: prazos definidos | **DECISÃO DO DONO** |
| Retenção: canal e tela | **NOT_IMPLEMENTED** |
| SBOM e assinatura de dependências (S6) | **NOT_IMPLEMENTED** |
| Teste de penetração | **nunca executado** — este relatório é leitura de código e medição, não pentest |

## A frase que resume a faixa

> **Três rodadas, três medições, zero vulnerabilidades exploráveis encontradas** — e **zero** afirmações sem número.

## Medido

| Medida | Valor |
|---|---|
| Stores auditados (r211) | 27 — 24 corretos, 3 justificados |
| `npm audit` total | 15 (0 crítica, 3 alta, 12 média) |
| `npm audit --omit=dev` | **6 (0 alta, 0 crítica)** |
| Testes de hardening de plugins | 4 contratos |
| Testes novos nesta faixa | 5 (r211) + 14 (r212) = **19** |
