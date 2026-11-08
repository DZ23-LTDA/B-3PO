# GOAL V2 — RODADA 187: O BUG #3 — O `python3` RESOLVIDO, E A CAUSA QUE ELE REVELOU

**Data**: 06/11/2026 · **4ª ordem** · `checkout-source`

---

## A MENSAGEM, LIDA ATÉ O FIM

```
Error: Command failed: python3 -c from pathlib import Path; from hermes_cli.update_channel import …
Python não foi encontrado; executar sem argumentos para instalar do Microsoft Store
```

> **`python3` no Windows é o stub da Microsoft Store** — **existe no PATH, imprime isso e sai com 9009**.

---

## O QUE JÁ EXISTIA — e este arquivo não usava

**`electron/updater/python-for-tests.ts`**, desde a **r14**:

```ts
// No Windows, `python3` é o **stub da Microsoft Store** …
//   1. `HERMES_PYTHON` — o ambiente de teste do projeto, quando definido
//   2. `python`        — o nome correto no Windows moderno
//   3. `python3`       — o nome correto no Linux/macOS
```

**E o comentário do próprio arquivo diz que a r14 consertou isto em `checkout-legacy.test.ts`:**

> *"O `checkout-legacy.test.ts` montava o probe assim: `python: process.env.HERMES_PYTHON || 'python3'`"*

> **E o `checkout-source.test.ts` tinha a linha IDÊNTICA.**
>
> **A r14 consertou um arquivo e deixou o outro** — **porque o conserto foi local, não compartilhado**. **O helper existe; o que faltou foi alguém aplicá-lo onde a linha se repetia.**

---

## O QUE FIZ

```ts
const python: null | string = resolverPython()
```

> **Resolve por EXECUÇÃO** (`-c "import sys"`), não por nome — **porque o stub existe no PATH e só a execução prova**.

---

## O QUE MUDOU — e o que **não** mudou

| | Antes | **Depois** |
|---|---|---|
| Interpretador | **`python3`** (stub) | **`python`** (real) ✅ |
| Erro | *"Python não foi encontrado"* | **`ModuleNotFoundError` em `hermes_cli.config`** |
| Teste | ❌ | **❌ ainda vermelho** |

**A mensagem mudou, e ela agora é útil:**

```
File …/checkout/hermes_cli/update_channel.py, line 306, in _write_channel_record
  from hermes_cli.config import get_config_path
```

> **O `hermes_cli` existe na raiz** (verifiquei: `update_channel.py` e `config.py` presentes) **e funciona com o venv do projeto**:
>
> ```
> PYTHONPATH=<raiz> python -c "from hermes_cli.config import get_config_path"  →  ok
> ```
>
> **O `python` do PATH não tem as dependências do `hermes_cli`** — **e o `resolverPython` valida só `import sys`, não as dependências do projeto**.

---

## A CAUSA REAL, e é a terceira camada

| Camada | O que é | Estado |
|---|---|---|
| **1** | `python3` é o stub | ✅ **resolvido na r187** |
| **2** | o `python` do PATH não tem as deps | ⚠️ **por isso `HERMES_PYTHON` existe** |
| **3** | **o `resolverPython` não valida as deps** | ❌ **a limitação do helper** |

> **A solução correta não é no teste: é o helper validar o que o teste precisa** — **ou o `npm test` exportar `HERMES_PYTHON`**.
>
> **E isso é uma decisão sobre o ambiente de teste**, não sobre o código do produto.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Camadas identificadas | **3** |
| Resolvidas | **1** |
| **Bugs da 4ª ordem corrigidos** | **2 de 6** (r184, r186) |
| **O #3** | ⚠️ **meio-resolvido — a mensagem agora aponta a causa certa** |
| Gate · Typecheck | **14 ok · 0 erros** |

---

## A LIÇÃO — o conserto local que não se espalha

> **A r14 escreveu um helper e o comentário dele documenta exatamente este bug.** **E a linha que ele conserta continuou existindo em outro arquivo.**
>
> **Um conserto que não é aplicado aos irmãos não é um conserto: é um caso especial.**
>
> **E o sintoma disso é o que eu vi**: **dois arquivos com a mesma linha, um verde e um vermelho** — **e o verde tinha o helper importado.**

---

## PRÓXIMA RODADA

**O `HERMES_PYTHON`** — fazer o `npm test` exportá-lo, ou o helper validar as deps — e **com isso os três arquivos que dependem de Python param de falhar pelo mesmo motivo**.

> **187 rodadas.** **O bug #3 não era um: eram três camadas**, e **a primeira era um conserto que a r14 fez em um arquivo e não nos irmãos**. **A mensagem certa é o primeiro passo — ela agora aponta para a segunda camada.**
