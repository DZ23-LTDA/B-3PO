# §19 — `npm audit`, MEDIDO

**Data**: 05/11/2026 · **Rodada 73**

---

## O NÚMERO

| Alvo | Total | Crítico | Alto | Moderado |
|---|---|---|---|---|
| **raiz** | **24** | **0** | **3** | 21 |
| **apps/desktop** | **15** | **0** | **3** | 12 |

> **Zero críticas.** E as 3 altas são as mesmas nos dois alvos — o workspace herda as do app.

---

## AS 3 ALTAS — e onde elas realmente estão

| Pacote | Vulnerabilidade | De onde vem |
|---|---|---|
| **follow-redirects** | credenciais customizadas seguem redirect (`GHSA-mrwp-f3q8-3g9p`) | `wait-on` → `axios` |
| **joi** | tempo quadrático em `email({multiple:true})`, DoS (`GHSA-4528-x5fx-h6hg`) | `wait-on` |
| **undici** | DoS por memória no parser de EventSource (`GHSA-4qv8-2p9j-2685`) | `@electron/rebuild` → `node-gyp` |

### **As três são `devDependencies`**

```
wait-on             9.5.1   devDependency
@electron/rebuild   4.2.1   devDependency
electron           44.9.3   devDependency (empacotado no runtime)
```

> **`wait-on`** espera o servidor de dev subir; **`@electron/rebuild`** recompila módulos nativos.
>
> **Nenhum dos dois entra no app empacotado.** Uma vulnerabilidade em `wait-on` é uma vulnerabilidade **na máquina de quem builda**, não no produto que o cliente instala.

---

## AS 12 MODERADAS — e o padrão

| Grupo | Pacotes |
|---|---|
| **empacotadores** | `electron-builder`, `app-builder-lib`, `dmg-builder`, `electron-builder-squirrel-windows` |
| **utilitários do builder** | `@electron/asar`, `@electron/universal`, `get-windows`, `node-gyp` |
| **cadeia do npm** | `cacache`, `glob`, `make-fetch-happen`, `minimatch` |

> **Todas são da cadeia de build e publicação.** Nenhuma é do código que roda no aplicativo.

**E o padrão é o mesmo**: `glob` e `minimatch` aparecem em **quase todo `npm audit` de qualquer projeto Node** — são vulnerabilidades de **DoS por padrão de `glob` malicioso**, e o input vem de **quem builda**, não de quem usa o produto.

---

## POR QUE **NÃO** CORRIGI

`npm audit fix` **mudaria `wait-on` e `@electron/rebuild`** — e esses dois **são o caminho de build do app**.

> **Uma atualização de `electron-builder` que quebra o `dist:win:msix` é um dano maior que uma DoS em `wait-on`** — e o único jeito de saber seria **empacotar um MSIX** (que a r15 mediu estar desatualizado).
>
> **Atualizar dependência de build sem empacotar depois é trocar um risco medido por um risco não medido.**

**O que fica registrado**: são **corrigíveis**, e a correção **exige o ciclo de empacotamento** — que é uma tarefa própria.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Comando | `npm audit --json` (raiz e `apps/desktop`) |
| Vulnerabilidades | **24 / 15** |
| **Críticas** | **0** |
| **Altas em runtime de produção** | **0** |
| Altas em ferramentas de build | **3** |
| Corrigíveis | **3 de 3** |
| Corrigidas nesta rodada | **0** — de propósito |

---

## O §19 — ONDE ESTÁ

| Item | Estado |
|---|---|
| níveis · RBAC · tenant · Sofia · não-promoção | ✅ |
| ações sensíveis | ✅ r66 |
| replay de webhook | ✅ r68 + r69 |
| rate limiting (3 canais de dinheiro) | ✅ r70–r72 |
| **dependências** | ✅ **r73 — medido, 0 críticas, 0 em runtime** |
| **XSS no renderer** | ❌ **o único aberto** |

> **Da lista do §19, sobrou um item** — e ele é o mais difícil: auditar **todo ponto de HTML não escapado** no renderer.

---

## PRÓXIMA RODADA

**XSS no renderer** — o último item do §19: onde o produto renderiza HTML vindo de fora.

> **73 rodadas.** As dependências estão medidas: **0 críticas**, e as 3 altas estão **na máquina de quem builda, não no produto que o cliente instala** — e essa distinção é o resultado da auditoria.
