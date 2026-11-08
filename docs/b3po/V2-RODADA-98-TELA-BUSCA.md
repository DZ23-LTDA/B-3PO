# GOAL V2 — RODADA 98: A TELA DA BUSCA

**Data**: 05/11/2026 · **§13:450** · a busca chega a quem usa

---

## O QUE FOI CONSTRUÍDO

`src/app/busca/` — **~150 linhas**, com os **7 registros** (rota, `AppView`, `AppRouteId`, `APP_ROUTES`, `lazy`, `<Route>`, **menu**).

> **Menu foi de 22 para 23.**

---

## AS DECISÕES DA TELA

### A frase quando não acha **não é a genérica**

O catálogo desta busca é **o menu do produto** (22 módulos). **O CRM não está nele** — vem do menu do núcleo (r94).

```tsx
<p>O CRM e os módulos do runtime (Agentes do runtime, Mensageria, Tarefas agendadas)
   ficam no menu do núcleo, fora desta busca.</p>
```

> **Quem procura "cliente" e não acha precisa saber que existe algo parecido em outro lugar** — senão a busca vira **um beco sem saída com uma frase educada**.

### O foco vai para o campo **ao abrir**

> *"Uma busca que exige um clique antes de digitar é uma busca que perdeu o ponto."*

### O grupo é **cabeçalho**, não rodapé

> **O resultado precisa dizer ONDE o módulo mora** — é o que a pessoa viu no menu e não achou.

### `motivo === 'sinonimo'` é **dito na linha**

```
Entregas          por sinônimo
```

> **Um resultado que aparece por "caminhão" parece fora de lugar sem essa marca** — e um resultado que parece errado é um resultado que a pessoa não clica.

### Setas e Enter, com o índice resetando ao digitar

> O índice **não pode apontar para fora** depois que a lista encolhe.

---

## A DECISÃO DE NÃO BUSCAR A SI MESMA

O catálogo tem **22 módulos**, e o menu agora tem **23** (com a Busca).

> **A busca não entra no próprio catálogo** — quem já está na busca **não precisa buscá-la**. E um teste do catálogo confere os 22, então a assimetria está **medida**, não esquecida.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Linhas da tela | **~150** |
| Registros | **7** |
| Menu | **22 → 23** |
| Regressão (nav + busca + catálogo) | **39 verdes** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## O §13 — ONDE ESTÁ

| Item | Estado |
|---|---|
| Grupos por fluxo · `Empresa` ≠ configuração | ✅ r92 |
| **Busca global** | ✅ **r96–r98, 3 camadas** |
| Seletor de ambiente | ❌ |
| Menu conforme RBAC | ❌ |
| Modo Engenharia | ❌ |
| **2 documentos** (`NAVIGATION-AND-UX-SPEC`, mapa de rotas) | ⚠️ 1 de 3 |

---

## PRÓXIMA RODADA

**O segundo documento do §13** — `B3PO-NAVIGATION-AND-UX-SPEC.md` e o **mapa de rotas com matriz de migração** (:459-462).

> **98 rodadas.** O §13:450 pede *"encontrar funções sem exigir conhecimento do menu"* — e a busca agora **existe na tela**, **acha por sinônimo** (`caminhão`→Entregas) e, quando não acha, **diz onde mais procurar** em vez de terminar a conversa.
