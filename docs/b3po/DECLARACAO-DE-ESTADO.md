# B-3PO — DECLARAÇÃO DE ESTADO

**Data**: 06/11/2026 · **branch**: `b3po-brand` · **HEAD**: `462c4a7868` · **versão**: 1.0.0

---

## UX_READY — declarado

**Os 10 gates de aceite da missão estão atendidos e provados.** Não por leitura: por medição.

| Gate | Como está provado |
|---|---|
| **G1** seletor de ambientes | 6 opções no `<select>` da barra; trocar muda a barra de verdade (14 itens → 12) |
| **G2** sidebar contextual | **7 seções** em Empresa, **3** em Administração — sem lista plana |
| **G3** RBAC nas rotas | `nav-rbac` filtra por `read`, **depois** do ambiente; `permission-guard` é a única porta |
| **G4** persistência | **E2E**: troca → reload → mesmo seletor **e** mesma barra |
| **G5** Sofia com contexto | monta → limitado por RBAC → mostrado → **viaja em todo `prompt.submit`** → **nota no turno** |
| **G6** home e onboarding | **6 cartões**, 1 aceso; a tela de provedor oferece "escolho depois" |
| **G7** pt-BR | 5 rotas varridas, **zero** string em inglês |
| **G8** testes executados | 31 falhas separadas: **7 flaky + 1 corrigido + 12 reais + 0 de UX** |
| **G9** app real em resoluções | **7 combinações** (incl. zoom 125 %/150 %), **0 cortados** |
| **G10** pacote | ícones (`.ico`/`.png`/`.icns`), `1.0.0`, `B-3PO`, este documento |

---

## RELEASE_READY — **não** declarado, e por quê

**Quatro coisas dependem de terceiros, e nenhuma delas é código:**

| Bloqueio | O que falta | Consequência hoje |
|---|---|---|
| **Credencial de provedor** | chave de um provedor de modelo | **"Servidor inferência indisponível"** — a Sofia não responde |
| **Authenticode** | certificado de assinatura Windows (`AZURE_SIGN_*` ausente) | o MSIX existe, mas não é assinado |
| **Conta Google Play** | conta de desenvolvedor | o **APK já está assinado** (`CN=B-3PO, O=DZ23-LTDA`, v2+v3), mas não publicado |
| **`.p12` + provisioning profile** | **a chave privada** do certificado Apple | o **iOS compila no CI** (`macos-15`), mas não gera IPA instalável |

> **`distribution.cer` é o certificado PÚBLICO.** **A chave privada (`.p12`) é o que assina** — e ela **não pode estar no repositório**. Um `.cer` sozinho não gera IPA.

**Chamar isso de RELEASE_READY seria a única coisa que a missão proíbe em toda a sua extensão.**

---

## O QUE O USUÁRIO PODE FAZER HOJE

**Instalar, abrir, ver a home com os 6 ambientes, escolher um, navegar por seções, abrir cada módulo, ler os dropdowns, usar em qualquer resolução e zoom, em português.** Tudo medido, com captura.

---

## OS QUINZE COMMITS

```
c3a96bde61  seis ambientes, e a sidebar deixa de ser uma lista plana
d035689f31  a sidebar tinha overflow-hidden e cortava os itens do fim
014b911650  o seletor de ambiente na barra — G1 e G4
8b18bb1f93  a home do B-3PO com os seis cartoes — G6
38daccbc3f  o zoom cortava os cartoes — G7, G8 e G9 medidos
5253ccf43c  o contexto do ambiente, do projeto e do ator — G5
1e4d2c2914  o botao de ambiente so conhecia dois, e o pacote de entrega
c075302fe9  a peca do envio do contexto, e a fronteira exata do G5
4bccb95923  o contexto do produto chega ao turno como NOTA — G5 backend
80fcadcdfb  o fio: todo prompt.submit — G5 FECHADO
f69c1785c5  31 falhas viram 7 + 1 + 12 — G8 FECHADO
59c08c7b30  os numeros do ENTREGA-FINAL estavam desmentidos
ac0f110ef6  a variavel --ui-border nunca existiu, em dezenas de componentes
6725b4b104  foco visivel onde o produto o matou
462c4a7868  o E2E da persistencia — G4 de ponta a ponta
```

**`main` intacta. Zero mudanças pendentes. Sincronizado com `origin/b3po-brand`.**

---

## OS SEIS BUGS QUE O PROCESSO ENCONTROU

**Quatro de classe, e nenhum apareceu lendo código:**

| Bug | Como apareceu |
|---|---|
| **`<option>` ilegível em 311 `<select>`** | **o dono mostrou a tela** — 311 selects, **zero** options com estilo |
| **itens do fim da barra inacessíveis** | **o dono reportou** — `scrollHeight === clientHeight`, sem scroll |
| **`--ui-border` nunca definido** | **revisão sistemática** — usado em dezenas de componentes, declarado em nenhum CSS |
| **foco visível removido globalmente** | **revisão de a11y** — o produto mata o `outline`; a missão pede o contrário |

**E dois que eu criei, e a medição pegou:**

| Bug | O que aconteceu |
|---|---|
| **a barra ficou vazia** | `menuDoAtor(null)` devolve `[]` — e o `subscribe` do nanostores chamou na montagem |
| **`alternarAmbiente` só conhecia 2** | quem estava em `ia` caía em `empresa`; 3 ambientes inalcançáveis pelo botão |

---

## A LIÇÃO QUE VALE MAIS QUE A ENTREGA

> **Três vezes um teste meu mediu o lugar errado**: o *body* inteiro em vez da sidebar; o `role="group"` do composer em vez do da home; e o `style.zoom` que não é o zoom do navegador.
>
> **Uma medição que não reproduz o fenômeno não é uma medição.**

> **Cinco vezes as crases do PowerShell comeram `$` e `` ` ``.** A regra que ficou não é "lembrar": é **não passar por string de shell quando o texto tem `$`, `` ` `` ou `\`.**

> **E dois documentos apodreceram no intervalo de uma rodada** — os números do `ENTREGA-FINAL` e a tabela de gates. **Um documento que afirma números apodrece; um que afirma causas, não.**

**Nada foi declarado pronto sem prova. Os 12 testes que falham sempre estão nomeados com o bloqueio que os causa, e nenhum foi removido para obter verde.**
