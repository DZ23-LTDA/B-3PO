# PT-BR-REPORT

## Este documento é um índice

O detalhe está em **`PT-BR-VALIDATION.md`**.

## O que foi medido na janela

| Medida | Valor | Rodada |
|---|---|---|
| `documentElement.lang` | **`pt`** | 228 |
| `document.title` | **`B-3PO`** | 228 |
| Itens de menu em português (app empacotado) | **25 de 25** | 242 |
| Composer | *"Peça uma tarefa ao B-3PO"* | 242 |
| Rodapé | *"Servidor pronto"* | 242 |
| **"Hermes" visível na interface** | **não** | 242 |
| Recusa do backend em português | *"Informe um valor."* | 240 |

## A prova mais forte

O **executável empacotado** — não o app de desenvolvimento — mostra **25 itens de menu, todos em português**, com o
mascote B-3PO e sem nenhuma ocorrência visível de "Hermes" (`docs/b3po/evidencias/instalado-r242.png`).

## O que NÃO foi medido

| Item | Estado |
|---|---|
| **Detector automático de string não traduzida** | **não existe** — o §9 pede um |
| Cobertura dos 8 arquivos de locale | **não medida** por chave |
| Fallback inglês silencioso | **não detectado automaticamente** |
| TUI, mobile, extensões | **não auditados** nesta execução |
| Páginas de erro | **não auditadas** |

## O critério de aceite do §9

> *"Nenhum texto de interface em inglês sem justificativa técnica ou legal documentada."*

**Não posso afirmar que este critério está atendido.** O que posso afirmar: **nas telas que abri** — Home, CRM,
Financeiro, Estoque, Vendas, Compras, Agenda, Empresa, Produtos, e o pacote empacotado — **não encontrei inglês**.

**Classificação: `PARTIAL`.** Medido onde abri; não medido onde não abri.
