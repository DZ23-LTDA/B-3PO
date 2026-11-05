# GOAL V2 — RODADA 91: A TELA DA ORGANIZAÇÃO — OS TRÊS TIPOS DO §12 COMPLETOS

**Data**: 05/11/2026 · **§12** · fechamento

---

## AS SEIS CAMADAS

| Camada | Desde |
|---|---|
| 1. Regra · 2. Store · 3. Canal | r81 · r88 · r89 |
| 4. Preload · 5. Wrapper · **6. Tela** | r90 · **r91** |

**E os 7 registros** — **menu foi de 21 para 22**.

---

## O QUE ESTA TELA **NÃO** É

> **Não é o cadastro.** Nome, CNPJ e endereço vivem em `companies-store`; aqui mora **quem faz o quê**.
>
> A separação é a da r88: **cadastro muda quando a empresa muda; desenho muda quando a operação muda.**

---

## AS DECISÕES DA TELA

### A sugestão é **buscada**, não importada

```ts
useEffect(() => { void (async () => { const s = await sugestaoDoSetor(setor); ... })() }, [setor])
```

> **Se o produto mudar a sugestão, esta tela muda junto — sem precisar de build.**

### O setor desconhecido é **dito**, com o motivo

> *"O produto não conhece este setor — monte a estrutura à mão. **É melhor que uma sugestão inventada.**"*

### "sem função" aparece **ao lado do campo**, não no rodapé

> *"Um departamento sem função é **uma caixa**."* — e o aviso precisa estar **onde a correção acontece**.

### `null` da estrutura **não é erro**

```ts
if (!e) { setAviso('Esta empresa ainda não tem estrutura. Escolha um setor e ajuste a sugestão.'); return }
```

> **Ninguém desenhou ainda** — e a tela leva direto para a sugestão, em vez de mostrar uma falha.

### A sugestão é **copiada para o editor**

> *"A pessoa pode ajustar a sugestão, e **ajustar é o ponto**."*

---

## O §12 — **COMPLETO EM SEIS CAMADAS**

| Tipo | Camadas |
|---|---|
| **Organização permanente** | ✅ **6 de 6** |
| **Projeto** | ✅ **6 de 6** |
| **Trabalho pontual** | ✅ **6 de 6** |

### E os 4 componentes

Organization Builder ✅ · Project Builder ✅ · Agent Factory ✅ · Task Orchestrator ✅

> **O §12 está inteiro: três tipos de trabalho, quatro componentes, seis camadas cada.**

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Linhas da tela | **~260** |
| Registros | **7** |
| Menu | **21 → 22** |
| Regressão (nav + organização) | **61 verdes** |
| Gate | **14 checks, ok** |
| Typecheck | **0 erros** |

---

## PRÓXIMA RODADA

O §12 está completo. O **§13** — *"NAVEGAÇÃO — DECISÃO DE PRODUTO"* — é o próximo: *"1. EMPRESA — criar, administrar e operar negócios. 2. ENGENHARIA E CRIAÇÃO"*.

> **91 rodadas.** O §12 pede três tipos de trabalho. **Os três existem, com seis camadas cada** — e o último deles, a organização, fechou com uma tela que **não inventa**: para o setor que o produto não conhece, ela diz *"monte à mão"*.
