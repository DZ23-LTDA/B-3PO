# §17 — BUSINESS CORE E PRIMEIRO VERTICAL, MEDIDO

**Rodada 102 do GOAL V2** · a 7ª ordem: *"expandir os negócios progressivamente"*

---

## O QUE O §17 PEDE

> *"expandir domínios **somente com necessidade comprovada**"* (§17:764)

**A pergunta desta rodada não é "o que construir" — é "onde há necessidade comprovada".**

---

## OS 9 DOMÍNIOS — todos existem

| Domínio | Store | Canal |
|---|---|---|
| **produto/catálogo** | `catalog-store` | `catalog-ipc` |
| **estoque** | `inventory-store` | `inventory-ipc` |
| **compras** | `purchases-store` | `purchases-ipc` |
| **vendas** | `sales-store` | `sales-ipc` |
| **financeiro** | `finance-store` | `finance-ipc` |
| **crm** | `crm-contacts-store` | `crm-contacts-ipc` |
| **logística** | `delivery-store` | `delivery-ipc` |
| **atendimento** | `service-desk-store` | `service-desk-ipc` |
| **agenda** | `scheduling-store` | `scheduling-ipc` |

**9 de 9.** A r55 mediu **8 de 9** e logística era a ausente — ela foi fechada nas r56–r60.

---

## OS 3 FLUXOS PROVADOS

| Fluxo | Teste | Linhas | O que atravessa |
|---|---|---|---|
| **Compras** | `purchases-fluxo-completo` | 296 | estoque, compra, recebimento, financeiro, logística |
| **Venda** | `sales-fluxo-completo` | 308 | estoque, venda, reserva, financeiro, entrega |
| **Orquestração** | `sofia-fluxo-completo` | 159 | plano, grafo, delegação, runtime |

> **O §17 pede fluxo ponta a ponta comprovado. Há três.**

---

## ONDE ESTÁ A NECESSIDADE COMPROVADA

### O 4º fluxo que **não** existe: atendimento → serviço → agenda

| Peça | Existe |
|---|---|
| ticket de suporte | ✅ `service-desk-store` |
| serviço prestado | ✅ `servicos` |
| agenda | ✅ `scheduling-store` |
| **a ligação entre os três** | ⚠️ **`scheduling-service-link.ts` existe — e não há fluxo testado** |

> **O vertical do gás é uma operação de entrega, e a entrega falha.** Quando o cliente liga reclamando, hoje:
> **o ticket abre, o serviço existe, a agenda existe — e nada garante que os três falem do mesmo problema.**

**É a mesma forma que a r45 encontrou em Compras e a r61 em Vendas**: as peças existem, **a ligação não está provada**.

---

## O QUE **NÃO** É NECESSIDADE COMPROVADA

| Ideia | Por que não agora |
|---|---|
| **marketplace** | §16: bloqueado por credencial (r54) |
| **WhatsApp Cloud** | §16: bloqueado por credencial |
| **gateway de pagamento** | §16: bloqueado por credencial |
| **Modo Engenharia** (§13:452) | é **um produto dentro do produto** — não é "expandir o negócio", é **construir uma segunda metade** |
| **novos domínios** | o §17 diz *"somente com necessidade comprovada"*, e **os 9 que o vertical precisa existem** |

> **Expandir não é adicionar domínio. É ligar os que existem até o fluxo inteiro passar.**

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Domínios do §17 | **9 de 9** |
| Fluxos provados | **3** |
| Ligações medidas e não provadas | **1** (atendimento↔serviço↔agenda) |
| Bloqueados por credencial | **3** (§16) |
| Código escrito nesta rodada | **0** |

---

## PRÓXIMA RODADA

**O 4º fluxo** — `atendimento-fluxo-completo.test.ts`: um ticket que abre, vira serviço, entra na agenda e fecha com satisfação.

> **102 rodadas.** A 7ª ordem diz *"expandir progressivamente"* — e a medição mostra que **expandir, aqui, não é criar o 10º domínio**: é **provar que o 4º fluxo atravessa os três que já existem**. O §17 foi explícito: *"somente com necessidade comprovada"*.
