# Painel de cotação: layout refeito e o bug de unidade (rodada 196)

## O que a r195 deixou aberto

A captura da r195 mostrou o painel **funcionando mas feio**: campos empilhados, sem rótulo, "Adicionar item" como
texto solto. E ainda: os valores não chegavam como esperado, causa não determinada.

Esta rodada fechou as duas coisas.

## 1. O layout

**Causa**: o `<Input>` do design system ocupa a linha inteira dentro de um `flex-wrap`, e os campos não tinham
`<label>` — nada dizia o que cada caixa era.

**Correção**: o padrão da seção vizinha desta mesma tela — `grid` com colunas responsivas, cada campo num
`<label>` com o rótulo **acima**. Campos nativos com a mesma classe dos vizinhos, não o componente genérico.

> Reescrever com o padrão da casa é melhor que inventar um.

**Antes** (r195) → **Depois** (r196)

```
[10,50]                        Quantidade a comprar  Fornecedor           Custo unitário  Quantidade  Prazo (dias)
[Distribuidora Alfa ▼]         [10]                  [Distribuidora Alfa] [         ]     [        ]  [        ]
[10]                           Adicionar item   Comparar fornecedores
[Quantidade]
[20]
Adicionar item
```

## 2. O bug de unidade — o valor estava 1000× maior

A captura da r195 mostrava **"Melhor oferta: Distribuidora Alfa · 105000.00"** para uma compra de **R$ 105,00**.

**Causa**: `escolherCotacao` calcula `preco_total_cents = preco_unit_cents * quantidade` e **supõe unidades**.
O painel passava **milésimos** (`mili("10")` = 10_000), então o total saía 1000× maior.

**Duas coisas erradas ao mesmo tempo:**
1. o módulo não declarava a unidade
2. o painel convertia para milésimos sem que ninguém tivesse pedido

**Correção nos dois lados:**

| Onde | O que mudou |
|---|---|
| `purchase-quotation.ts` | documenta explicitamente: quantidade em **UNIDADES**, e diz que a r195 fotografou R$ 105.000,00 para R$ 105,00 |
| `cotacao-panel.tsx` | `Math.floor(mili(x) / 1000)` — converte milésimos para unidades **antes** de chamar |

**E dois testes novos que fixam o contrato:**

```
preco total e em CENTAVOS de unidades, nao de milesimos    1050 * 10 = 10_500
quantidade em milesimos NAO e aceita como unidades         10_000 pedidos nao sao atendidos por 10 disponiveis
```

## O que a captura final prova

```
"tem_rotulos_visiveis": true
"rotulos": ["Quantidade a comprar","Fornecedor","Custo unitário","Quantidade","Prazo (dias)"]
"campos_por_rotulo": { "prazo": true, "preco": true, "qtd": true, "fornecedor": true, "volume": true }
"total_linhas": 2
"melhor_oferta_visivel": true
"economia_visivel": true
```

E o texto final, lido da tela:

> **"Melhor oferta: Distribuidora Alfa · 105.00"**
> **"Atacado Beta: economiza 15.00 em relacao a proxima"**

**Os números estão certos**: 10 × R$ 10,50 = R$ 105,00; contra 10 × R$ 12,00 = R$ 120,00; economia R$ 15,00.

## O que ainda está errado — e eu não vou esconder

| Item | Estado |
|---|---|
| Formatação de moeda | **`105.00` em vez de `R$ 105,00`** — ponto em vez de vírgula, sem símbolo |
| Layout em telas estreitas | não testado |
| Um humano usando | **não** |

A formatação usa `toFixed(2)`, que é o formato do JavaScript, não o do Brasil. A tela tem um `priceLabel`
para isso e o painel não o usa. **É a próxima correção óbvia.**

## Por que a captura valeu mais que os testes

**138 testes passavam** com o valor 1000× errado na tela. Nenhum deles olhava o **texto renderizado**.

| O que o teste provava | O que ele não provava |
|---|---|
| o componente renderiza | o que ele **diz** |
| a comparação escolhe o menor total | que o total exibido é o certo |
| os botões existem | que clicar neles produz o resultado prometido |

## Medido

| Medida | Valor |
|---|---|
| Defeitos de produto achados pela captura (r195 + r196) | **2** |
| Defeitos corrigidos | **2** |
| Testes novos de contrato de unidade | **2** |
| Verdes em compras + i18n + cotação | **138** |
| Rótulos visíveis no painel | **5** (eram 0) |
| Valor exibido antes / depois | `105000.00` → **`105.00`** |
