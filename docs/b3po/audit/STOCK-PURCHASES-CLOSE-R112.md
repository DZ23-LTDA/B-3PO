# Faixa 101–120 — fechamento (estoque, compras, fornecedores, fiscal)

**Rodada 112 de 256.**

## O que a faixa entregou

| Rodada | Entrega |
|---|---|
| 101 | Compra recebida → conta a pagar (integração que faltava) |
| 102 | Devolução de venda (não existia): estoque volta, recebível estorna |
| 103 | Histórico e comparação de fornecedores (+ CNPJ/CEP) |
| 104 | Contrato de provedor fiscal + sandbox marcado |
| 105 | Documento fiscal persistido, ligado à venda por `ref` |
| 106 | **Fluxo emitir → imprimir verificado na tela** |
| 107 | Tools `fiscal.*` para o agente |
| 108 | **Revertido** — método errado, nada commitado |
| 109 | Faixa de status do emissor + cancelar (verificado) |
| 110 | Justificativa com mínimo real (15 caracteres) |
| 111 | Operador digita a justificativa |
| 112 | **Campo de motivo verificado na tela** |

## As quatro integrações, todas fechadas

| Integração | Estado |
|---|---|
| venda → estoque | ✓ desde antes |
| venda → financeiro (a receber) | ✓ desde antes |
| compra → estoque | ✓ desde antes |
| **compra → financeiro (a pagar)** | **✓ r101** |
| **venda → devolução → estoque + estorno** | **✓ r102** |

## A prova na tela (r112)

```
botoes:  Emitir nota | Imprimir nota | Confirmar | Voltar
campo:   "Justificativa (mínimo 15 caracteres)"
Confirmar: desabilitado
contador:  0/15
erros:     nenhum
```

Captura: `evidencias-r112/cancelar-motivo.png`

A faixa de homologação aparece acima do formulário: *"Emissão em homologação: o documento gerado não tem validade fiscal."*

## O que NÃO foi entregue

| Item | Estado |
|---|---|
| **Emissão fiscal real** | `BLOCKED_BY_EXTERNAL_DEPENDENCY` — falta credencial de um emissor |
| Adapter HTTP de cada emissor | não escrito; `resolverProvedor` devolve `nao_configurado` mesmo com variáveis |
| Cotações de compra | o GOAL pede; não existe |
| Aprovação de compra acima do limite | o GOAL pede; não existe |
| Lotes e validade no estoque | o GOAL pede "quando aplicável"; não existe |

## O que a faixa ensinou

**Uma rodada inteira perdida (r108) e uma recuperada (r109) pela mesma funcionalidade.** A diferença não foi
habilidade: foi método. Inserção por número de linha quebrou o arquivo três vezes; componente em arquivo
próprio com duas inserções de âncora funcionou de primeira.

**Três vezes a tela mostrou o que o teste não mostrava:**

| Rodada | O defeito |
|---|---|
| 106 | o botão podia existir sem o fluxo funcionar |
| 109 | a faixa de homologação não aparecia |
| 112 | o campo de motivo podia não renderizar |

**E uma regra de arquitetura violada e corrigida (r111):** `src/app/**` importando de `electron/**` passou no
typecheck porque o caminho relativo existe. Fronteira de módulo não é checada por tipo.

## Números

| Medida | Valor |
|---|---|
| Commits na faixa | 12 |
| Testes fiscais | **35** |
| Testes de compras/financeiro | **45** |
| Capturas de tela | 3 (r106, r109, r112) |
| Gate | 14 checks, ok |
| Typecheck | 2 projetos, 0 erros |
