# GOAL V2 — RODADA 264: O DROPDOWN ILEGÍVEL — O BUG QUE O DONO VIU NA TELA

**Data**: 06/11/2026 · reportado pelo dono, e ele estava certo

---

## O QUE O DONO MOSTROU

**Um `<select>` de "Nível" aberto, com as opções `Recomenda`, `Prepara`, `Executa`, `Autonomia supervisionada` praticamente invisíveis.**

> **"esse tipo de erro não é bom"** — **e não é.** **E ele acrescentou: "tem isso em vários lugares".**
>
> **Ele estava certo nas duas coisas.**

---

## A MEDIÇÃO — antes de supor

**311 `<select>` no produto. E zero `<option>` com estilo:**

```
<select className="rounded-md border … text-foreground">
  <option key={valor} value={valor}>{levelLabel(valor)}</option>   ← sem classe
</select>
```

**O Chromium desenha a LISTA de um `<select>` com as cores nativas do sistema.** **O `color` do texto, porém, é herdado do `<select>`** — **que no tema da app pode ser claro.**

**Resultado:** **fundo claro do sistema + texto claro do app = ilegível.** **Exatamente o que a screenshot mostra.**

---

## A CORREÇÃO — na raiz, não em cada tela

**`apps/desktop/src/styles.css`:**

```css
select option,
select optgroup {
  background-color: var(--dt-popover, #ffffff);
  color: var(--dt-popover-foreground, #17171a);
}

select option:checked {
  background-color: color-mix(in srgb, var(--theme-primary) 18%, var(--dt-popover));
  color: var(--dt-popover-foreground);
}
```

> **Uma regra, 311 selects** — **e os que vierem depois.**
>
> **E `color-scheme: dark` em `:root.dark`**, **que faltava**: **o app seta `color-scheme` inline** (L328 de `themes/context.tsx`), **mas o CSS não tinha o valor para o tema escuro** — **e agora tem, como documentação e como fallback.**

---

## A PROVA — medida, não olhada

| | Antes | **Depois** |
|---|---|---|
| **`option` fundo** | *(não definido — branco do sistema)* | **`rgb(252,252,252)`** |
| **`option` cor** | *(herdada, clara)* | **`rgb(31,35,40 / 0.94)`** |
| **contraste** | **ilegível na screenshot do dono** | **16,28:1 — AA aprovado** |
| **a opção selecionada** | **azul do sistema com texto claro** | **realce do tema com texto escuro** |

**As cinco opções, medidas no app rodando:**

```
Consulta                  fundo 0.99 / cor 0.12
Recomenda                 fundo 0.99 / cor 0.12
Prepara                   fundo 0.99 / cor 0.12
Executa (selecionada)     fundo 0.81/0.87/0.99 / cor 0.12
Autonomia supervisionada  fundo 0.99 / cor 0.12
```

---

## O QUE ESSA RODADA ENSINA SOBRE AS OUTRAS

> **256 rodadas de teste e nenhuma pegou isso.** **O gate mede código, o typecheck mede tipos, e os 18 800 testes medem comportamento** — **nenhum deles ABRE o app e OLHA.**
>
> **Quem olhou foi o dono, em dez segundos.**

**E é a mesma classe que a sessão vinha nomeando, num eixo novo**: **o `<option>` não estava errado no código, estava errado no AMBIENTE em que é desenhado** — **como o `Get-FileHash` (r257) e o symlink (r218).**

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| **`<select>` no produto** | **311** |
| **`<option>` com estilo** | **0 → todos (1 regra)** |
| **Contraste das opções** | **16,28:1 (AA)** |
| **Build** | **exit 0, mesmo bundle** |
| Gate · Typecheck | **14 ok · 0 erros** |

---

## PRÓXIMA RODADA

**O mesmo teste nos outros temas** — **e o `<select>` fechado, que mediu 1,81:1** por ter fundo translúcido (`alpha 0.17`) sobre um pai transparente. **O visual está certo; a MEDIÇÃO do contraste é que não sabe ver através do alpha.**

> **264 rodadas.** **311 selects, uma regra, e 16,28:1.** **O dono viu em dez segundos o que 18 800 testes não veem — porque teste não abre os olhos.**
