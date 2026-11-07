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

## A-02 · O modo **Engenharia** não revelava nada de engenharia — **CORRIGIDO na r14**

**Medido antes (r13):** escolhendo Engenharia, a barra mostrava **VISÃO GERAL + CONFIGURAÇÃO** (66
itens). `lib/ambiente.ts` pedia `Construção` e `Qualidade`, e os dois grupos nunca tinham módulo.

### Causa raiz: um módulo, um grupo — e o modo precisava do segundo pertencimento

Os módulos **já existiam na barra**, mas sob outros grupos:

| Módulo | Path | Grupo de casa | Grupo que Engenharia pedia |
|---|---|---|---|
| Projetos | `/projetos` | **Trabalho** | Construção |
| Trabalhos | `/trabalhos` | **Trabalho** | Construção |
| Agentes | `/agentes` | **Inteligência** | Construção |
| Automações | `/automacoes` | **Inteligência** | Construção |

**Duplicar a entrada** resolveria — e seria exatamente o *"módulo duplicado"* que a diretriz proíbe.
O que faltava era o conceito de **pertencimento múltiplo**.

### A correção: `tambemEm`

```ts
// plugins/b3po-nav/plugin.tsx
interface ItemDeMenu {
  grupo: string
  /** Outros grupos a que este módulo também pertence. */
  tambemEm?: readonly string[]
}

// lib/ambiente.ts — o filtro passa a considerar os dois
const pertence = (m) => grupos.has(m.grupo) || (m.tambemEm ?? []).some(g => grupos.has(g))
```

E `engenharia` **soma** os grupos reais aos conceituais:

```ts
engenharia: ['Visão geral', 'Construção', 'Qualidade', 'Trabalho', 'Inteligência', 'Configuração']
```

`Construção` e `Qualidade` **ficam** (são o destino dos módulos de engenharia que ainda não existem
— `/repos`, builds, testes); `Trabalho` e `Inteligência` entram (onde os que existem moram). Um grupo
sem módulo é filtrado, então os conceituais não viram botão morto.

### Medido depois

| Modo | Grupos | Itens |
|---|---|---:|
| Engenharia **antes** | VISÃO GERAL · CONFIGURAÇÃO | 66 |
| **Engenharia depois** | VISÃO GERAL · **TRABALHO** · **INTELIGÊNCIA** · CONFIGURAÇÃO | **105** |

`axe` 0 · 52 testes da área passam.

### O teste que travava a declaração antiga

`ambiente.test.ts` exigia `Construção` **na lista** — e passava mesmo com Engenharia vazia, porque o
fixture tinha um `/repos` de grupo `Construção` que a barra real não tem.

**Reescrito**: agora prova `Construção` **e** `Qualidade` **e** `Trabalho` **e** `Inteligência`
presentes, e que o menu continua com menos de 8 grupos. **Cobre a declaração e o comportamento.**

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
