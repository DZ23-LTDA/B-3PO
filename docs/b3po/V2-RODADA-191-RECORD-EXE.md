# GOAL V2 — RODADA 191: O BUG #4 — O `record` QUE EXIGE UM BINÁRIO QUE O TESTE NÃO CRIA

**Data**: 06/11/2026 · **4ª ordem** · `channel-build-version`

---

## A MENSAGEM

```
Traceback (most recent call last):
  File "<string>", line 13, in <module>
    record('windows', 'x64', root, '', request['commit'], out, channel_request=request)
  File ".../scripts/bundles/release_artifacts.py", line 92, in record
    executable = single(root.glob(f"*-unpacked/{executable_name}"))
  File ".../scripts/bundles/release_artifacts.py", line 48, in single
    ValueError: Expected exactly one artifact, found []
```

**Três testes do arquivo passam; só este falha** — e **o que falha é o que chama o `record` do Python**.

---

## A CAUSA — três fatos, e o terceiro é o defeito

| # | Fato |
|---|---|
| **1** | `record` só procura o `.exe` **`elif os.name == "nt"`** — **no Windows** |
| **2** | O `executable_name` vem do **manifest** (`Application/@Executable`) |
| **3** | **O teste não cria nenhum `*-unpacked/`** — **`0` referências a `unpacked` no arquivo** |

> **No Linux, o `elif` não roda e o teste passa.** **No Windows, o `record` procura um binário que o fixture nunca criou.**
>
> **É a mesma forma do #2 (r186) e do #3 (r188)**: **um caminho que existe para um sistema e não para o outro**, **e o vermelho no Windows parece ambiente**.

---

## O QUE O `record` FAZ COM O BINÁRIO

```python
executable = single(root.glob(f"*-unpacked/{executable_name}"))
row["executableVersion"] = subprocess.check_output([
    "powershell", "-NoProfile", "-Command",
    "(Get-Item -LiteralPath $env:RECORD_EXECUTABLE).VersionInfo.ProductVersion",
], env={**os.environ, "RECORD_EXECUTABLE": str(executable)}, …).strip()
```

> **Ele lê o `ProductVersion` do `.exe` real** — **porque o metal de um MSIX carrega a versão no binário, e o manifesto pode mentir.**
>
> **E o teste não precisa dessa versão**: **ele verifica o `applicationId` e a `version` do manifesto**, não o binário.

---

## A CORREÇÃO — e o que ela **não** pode fazer

**O fixture precisa de um `*-unpacked/<executable_name>` **que responda ao `Get-Item`**.**

| Opção | O que faz | O que custa |
|---|---|---|
| **A.** criar um `.exe` vazio no fixture | `Get-Item` devolve `ProductVersion` **vazia** | **o `record` grava `executableVersion: ""`** — **e o teste não olha esse campo** |
| **B.** pular o teste no Windows | **não testa no sistema que tem o bug** | **perde a cobertura** |
| **C.** stubar o `record` | **para de exercitar o writer real** | **o teste deixa de provar o que se chama para provar** |

> **A opção A é a correta**: **o fixture ganha o arquivo que o caminho do Windows exige**, **e o teste continua exercitando o writer real**.
>
> **E ela precisa declarar a limitação**: **um `.exe` vazio não tem versão**, **então o teste NÃO prova a leitura do `ProductVersion`** — **prova o resto do `record`**, que é o que ele se chama para provar.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Testes do arquivo | **4** (3 passam) |
| **Falha** | **1** — o do `record` |
| **Bugs da 4ª ordem** | **3 de 6** |
| Gate · Typecheck | **14 ok · 0 erros** |

---

## A 4ª ORDEM — O PADRÃO DOS QUATRO

| # | Bug | Forma |
|---|---|---|
| **2** | `packaged-working-directory` | **fixture sem `session`** |
| **3** | `checkout-source` | **`python3` / `HERMES_PYTHON`** |
| **4** | `channel-build-version` | **fixture sem o `.exe`** |
| **6** | `state-db-preflight` | **a medir** |

> **Três dos quatro são a MESMA coisa**: **um caminho que só o Windows percorre, e um fixture que não o prepara**. **O produto não está errado nos três** — **o teste é que nunca rodou de verdade neste sistema.**

---

## A LIÇÃO — o teste que só existe no papel

> **Um teste que falha antes de exercitar o produto não é cobertura** — **é um registro de que alguém deveria ter preparado o fixture**.
>
> **E a r181 chamou esses seis de "bugs do produto".** **Três já se mostraram bugs do TESTE** — **e o quarto está a caminho do mesmo.**

---

## PRÓXIMA RODADA

**A opção A** — o fixture cria o `-unpacked/<exe>` — **com o nome vindo do `product-identity.cjs`**, e **a limitação declarada no próprio teste**: *"um .exe vazio não tem ProductVersion; este teste cobre o resto do record."*

> **191 rodadas.** **O quarto bug, e o terceiro da mesma família**: **o Windows é o único caminho que o fixture não prepara** — **e por isso três testes ficaram vermelhos por anos parecendo ambiente.**
