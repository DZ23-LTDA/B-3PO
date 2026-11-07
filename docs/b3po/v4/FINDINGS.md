---
tipo: documento-v4
agente: dsh
projeto: c3po-bot
data: 2026-11-07
---

# FINDINGS — defeitos medidos, com a causa

> Cada item aqui foi **medido em runtime ou no código**, não inferido. O que não foi diagnosticado
> está marcado como tal.

---

## A-01 · O modo **Estratégico** e o modo **IA e Agentes** têm o menu **idêntico**

**Medido (r13):** alternando pelo seletor real no app, os grupos renderizados são:

| Modo | Grupos na barra |
|---|---|
| Empresa | VISÃO GERAL · OPERAÇÃO · COMÉRCIO · TRABALHO · CRESCIMENTO · INTELIGÊNCIA · CONFIGURAÇÃO |
| Engenharia | VISÃO GERAL · CONFIGURAÇÃO |
| Automação | VISÃO GERAL · TRABALHO · INTELIGÊNCIA |
| **IA e Agentes** | **VISÃO GERAL · INTELIGÊNCIA** |
| **Estratégico** | **VISÃO GERAL · INTELIGÊNCIA** |
| Administração | VISÃO GERAL · TRABALHO · CONFIGURAÇÃO |

**5 combinações distintas para 6 modos.** Trocar entre IA e Estratégico muda a **cor** e nada mais.

**Causa**: `lib/ambiente.ts` declara os dois com os mesmos grupos:
```ts
automacao: ['Visão geral', 'Inteligência', 'Trabalho'],
ia: ['Visão geral', 'Inteligência'],
estrategico: ['Visão geral', 'Inteligência'],   // ← igual a `ia`
```

**Fix exige decisão**: quais módulos pertencem a "Estratégico"? O produto tem grupos
Comércio/Operação/Trabalho/Crescimento/Inteligência — escolher quais vão para Estratégico é
**política de produto**, não dedução.

---

## A-02 · O modo **Engenharia** não revela nada de engenharia

**Medido (r13):** escolhendo Engenharia, a barra mostra **VISÃO GERAL + CONFIGURAÇÃO**.
`lib/ambiente.ts` pede quatro grupos: `['Visão geral', 'Construção', 'Qualidade', 'Configuração']`.

**Construção e Qualidade renderizam vazios e são filtrados.**

### Causa raiz: **dois registros de módulos**, e a barra lê só um

| Registro | Módulos | Grupos | Consumido por |
|---|---:|---|---|
| **`lib/b3po-modulos.ts`** | **25** | Comércio 8 · Inteligência 4 · Operação 4 · Visão geral 3 · Configuração 2 · Crescimento 2 · Trabalho 2 | **a barra lateral** (`/busca` também) |
| **`lib/engenharia.ts`** | 8 | **Construção 4** · **Qualidade 2** · Visão geral 2 | **só `app/ambiente/index.tsx`** |

**Nenhum módulo do registro da barra está em `Construção` ou `Qualidade`** — os dois grupos existem
só no registro que a barra não lê.

```ts
// lib/engenharia.ts:68+ — módulos reais, com rotas reais
{ grupo: 'Construção', label: 'Projetos',    path: '/projetos' }
{ grupo: 'Construção', label: 'Trabalhos',   path: '/trabalhos' }
{ grupo: 'Construção', label: 'Agentes',     path: '/agents' }
{ grupo: 'Construção', label: 'Automações',  path: '/automacoes' }
{ grupo: 'Qualidade',  label: 'Artefatos',   path: '/artifacts' }
{ grupo: 'Qualidade',  label: 'Capacidades', path: '/capabilities' }
```

**Todos esses paths JÁ são rotas que funcionam.** O problema não é rota — é a barra não conhecer
esses registros.

**Precedente do próprio repo**: o comentário de `lib/ambiente.ts` diz *"não invento grupo para depois
procurar módulo"*. Aqui aconteceu o inverso — o grupo foi declarado e o módulo ficou num segundo
registro.

**Por que não corrigi na r13**: unificar os dois registros toca a barra, `/ambiente`, `/busca` e os
testes de contagem (`b3po-modulos.test.ts` espera 25). É refactor com contrato próprio. **E** duplicar
as 6 entradas em `b3po-modulos.ts` seria exatamente o *"módulos duplicados"* que o objetivo proíbe.

**O caminho certo** é um dos dois:
- **A**: `b3po-modulos.ts` vira a fonte única e ganha os 6 módulos com seu grupo real; `engenharia.ts`
  passa a derivar dele.
- **B**: um módulo pode pertencer a **vários grupos** (`grupos: string[]`), e os dois registros viram
  visões do mesmo dado.

---

## A-03 · A barra lateral não usa `<a>` — `rotas=0`

**Medido (r13):** `document.querySelectorAll('aside, nav a')` → **0 links**. Todos os itens são
`<button>` com navegação por JS.

**Consequência**: não há "abrir em nova aba", não há copiar endereço, e o menu não é uma lista de
links para tecnologia assistiva que navegue por "links da página".

**Não classificado como defeito sem discussão**: numa SPA Electron, `<button>` + router é escolha
legítima. Mas para WCAG, um menu de navegação costuma ser `<a href>`. **Fica como observação**, não
como bug.

---

## A-04 · `sofia.status()` responde `{ error }`

Medido na r2 do V4. A home trata como estado `erro` (correto), mas o endpoint não funciona.

---

## A-05 · `test_feishu_card_action_gateway_authz.py` só quebra na coleta da pasta

Medido na r10: coleta sozinho (17 testes, 0,66 s), importa direto sem erro, e falha com `ValueError`
quando a pasta é coletada. **Vazamento de estado entre módulos de teste** — invisível no CI, que isola
por subprocesso.

---

## O que **não** é defeito, apesar de parecer

| Aparência | Realidade |
|---|---|
| "6 modos, 5 menus" | A-01 é real; os outros 4 modos diferem |
| barra com `rotas=0` | escolha de SPA; A-03 é observação |
| web sem identidade B-3PO | é o dashboard do upstream — `PLATFORM_MATRIX.md` |
| mobile sem os 6 modos | `PLATFORM_MATRIX.md` — decisão do dono |
