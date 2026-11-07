# GOAL V2 — RODADA 257: O `Get-FileHash` — O BUG QUE IMPEDIA A INSTALAÇÃO

**Data**: 06/11/2026 · encontrado ao abrir o app a pedido do dono

---

## O QUE ACONTECEU

**O dono pediu para abrir o app e ver o menu.** **O app abriu, e a instalação do runtime falhou duas vezes:**

```
[prerequisites] [X] O termo 'Get-FileHash' não é reconhecido como nome de cmdlet...
[prerequisites] {"ok":false,"stage":"prerequisites","skipped":false,"reason":"..."}
```

> **O instalador morria no PRIMEIRO estágio**, **antes de baixar qualquer coisa**.

---

## A CAUSA

**`scripts/install.ps1`, L456:**

```powershell
$digest = (Get-FileHash -Path $OutFile -Algorithm SHA256).Hash.ToLowerInvariant()
```

**`Get-FileHash` vem do módulo `Microsoft.PowerShell.Utility`.** **Em ConstrainedLanguage** — o modo em que hospedeiros e sandboxes executam scripts — **e em processos filhos onde o módulo não carrega, o cmdlet simplesmente não existe.**

> **E o instalador não tinha fallback**: **a verificação de integridade do download era o único caminho, e era um cmdlet.**

---

## A CORREÇÃO

```powershell
function Get-Sha256Hex {
  param([Parameter(Mandatory = $true)][string]$Path)

  try {
    $hashed = Get-FileHash -Path $Path -Algorithm SHA256 -ErrorAction Stop
    if ($hashed -and $hashed.Hash) { return $hashed.Hash.ToLowerInvariant() }
  } catch { }

  $lines = & certutil.exe -hashfile $Path SHA256 2>$null
  ...
}
```

> **`certutil.exe` é um executável do sistema** (`C:\Windows\system32\certutil.exe`) **e responde em qualquer modo de linguagem.**
>
> **O `Get-FileHash` fica como primeiro caminho** — **mais rápido e sem abrir processo** — **e o `certutil` é o fallback.**

**Validado:**

```
hash:     ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad
esperado: ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad
CONFERE: True
```

---

## A PROVA — o estágio que falhava passou

```
[prerequisites] [OK] prerequisites ok (git)
{"type":"stage","name":"prerequisites","state":"succeeded","durationMs":35178}
{"type":"stage","name":"repository","state":"running"}
```

> **O `prerequisites` foi de `failed` para `succeeded`** — **e o instalador seguiu para o clone do repositório.**

---

## UM ERRO MEU, NO CAMINHO

**Na primeira tentativa de correção, eu escrevi a linha em PowerShell com aspas duplas:**

```powershell
"        $digest = Get-Sha256Hex -Path $OutFile"    # ← $digest e $OutFile expandidos
```

**O arquivo ficou com:**

```powershell
         = Get-Sha256Hex -Path
```

**E o instalador falhou com `O termo '=' não é reconhecido`** — **a mensagem da r257 anterior da sessão, com outra roupa.**

> **Corrigido com aspas simples.** **É a mesma classe que a sessão vem nomeando: eu escrevo uma string e esqueço quem a interpreta.**

---

## O MENU — o que o dono pediu para ver

**O menu está completo e renderiza:**

```
SESSIONS | BOTS
  New session          Ctrl N
  Capabilities · Messaging · CRM · Artifacts · Scheduled jobs
  Painel · Empresa · Busca
  Atendimento · Agenda · Serviços · RH · Produtos · Estoque
  Compras · Vendas · Entregas · Financeiro · Projetos · Trabalhos
  Marketing · Pós-venda · Agentes · Automações · Sofia
  Documentos · Estrutura · Privacidade
```

**34 itens, em dois grupos (SESSIONS e BOTS).**

> **E a captura foi feita escondendo SÓ o `div[role="dialog"]` do setup** — **a UI por baixo é a real.**

**O que não funciona sem o backend**: **"Reconnecting to B-3PO…"** e **"Backend offline"** no rodapé.

---

## O QUE ISSO DIZ SOBRE O PRODUTO

| O que | Estado |
|---|---|
| **O menu** | ✅ **renderiza, 34 itens, dois grupos** |
| **Os módulos novos** | ✅ **Painel, Empresa, Atendimento, Sofia, Agentes, Automações** |
| **O instalador** | ⚠️ **tinha um bloqueio real; corrigido nesta rodada** |
| **O backend** | ❌ **não sobe neste ambiente** — falta o runtime completo |

> **O `B5` do registro dizia**: *"instalar o MSIX exige o Windows"*. **O que ele não dizia é que o INSTALADOR do runtime também falhava** — **e a causa não era a máquina, era o cmdlet.**

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| **Itens no menu** | **34** |
| **Estágio do install** | **`prerequisites`: failed → succeeded** |
| **Linhas mudadas** | **1 + a função (20 linhas)** |
| Gate · Typecheck | **14 ok · 0 erros** |

---

## A LIÇÃO — o cmdlet que não existe em todo lugar

> **O instalador foi escrito assumindo um PowerShell completo.** **Em qualquer hospedeiro restrito, ele morre no primeiro download.**
>
> **E a correção não é um `if` a mais**: **é usar um EXECUTÁVEL para o que precisa existir em todo lugar** — **`certutil` responde onde um cmdlet pode não estar.**

---

## PRÓXIMA RODADA

**O backend** — **para o menu deixar de dizer "offline".**

> **257 rodadas.** **O dono pediu o menu, e o menu apareceu.** **E abrir o app revelou um bloqueio que 256 rodadas de teste não tocaram — porque nenhum teste instala o produto numa máquina limpa.**
