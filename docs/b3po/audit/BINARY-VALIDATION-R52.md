# Pós-venda ligado ao faturamento — validado no binário (rodada 52)

## Medido no app real

```
ponte aftersales:  true
faturamento:       {"erro":null,"id":"sale_1793796423665_3y86l6"}
acompanhamentos:   satisfacao  due_at +2 dias    ref venda:sale_...:satisfacao
                   recompra    due_at +30 dias   ref venda:sale_...:recompra
pela ponte:        total 2 · indicadores { pendentes: 2, atrasados: 0, semAcompanhamento: 0 }
```

O arquivo foi lido **do disco**, não da resposta do servidor: a prova de que os acompanhamentos
existem não depende de quem os criou confirmar.

## Dois defeitos encontrados — e ambos eram meus

### 1. O store não estava montado

`deps.afterSales` seria `undefined` em produção: o domínio existia, os testes passavam, e no app real
nada era criado. Corrigido montando `AfterSalesStore` no `erp-ipc` e passando-o ao `registerSalesIpc`.

### 2. Perfil novo não tinha dono — TUDO era `sem_permissao`

A primeira execução devolveu `sem_permissao` ao faturar. Causa: `primaryOwner()` devolve `null` num
perfil vazio, e nenhuma camada criava o primeiro dono.

**Sem dono, toda ação de escrita é negada** — o produto é inutilizável na primeira abertura, e o
sintoma ("não tenho permissão") aponta para o lugar errado.

Corrigido: o `actorOf` compartilhado do `erp-ipc` chama `ensureOwner()` antes de resolver. O primeiro
dono é local e criado sozinho — não é escalada de privilégio, é o estado inicial que a interface
pressupõe.

Isso também explica por que `/agentes` funcionou na rodada 49: ali eu já havia chamado
`ensureOwner()` naquele canal. O problema era mais amplo do que a tela que eu estava testando — e eu
só descobri ao exercitar **outro** domínio.

## O que não cobre

- Não há tela de pós-venda: os canais existem (`list`, `indicators`, `create`, `setStatus`) e o
  preload os expõe, mas a interface é a próxima rodada.
- `semAcompanhamento` só é confiável quando `sales.list()` devolve todas as vendas do tenant; isso foi
  exercitado com uma venda.
