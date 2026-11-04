# Varredura validada no binário (rodada 68)

## O que o binário mostrou

```
4) estoque antes:   {"CAF":30000}
5) sweep:           {}
6) estoque depois:  {"CAF":30200}
```

E no teste de idempotência, com **duas** varreduras seguidas:

```
saldo final: {"CAF":30200}
```

30000 + 200 — **uma vez**, não duas. A memória de aviso funciona no app real, não só no teste.

## O defeito que só o binário revelou

A primeira execução não disparou nada. O `sweep` devolvia `{}` e o estoque não mudava.

Causa: a tela cria a regra com `actor_id: 'owner'`, mas o dono persistido tem id gerado
(`actor_<timestamp>_<sufixo>`). O despachante resolvia o ator por id literal, não encontrava ninguém, e
a regra falhava com `ator_ausente` **em toda execução**.

Era o pior tipo de defeito: a regra aparece na tela, ativa, com gatilho e ação corretos — e nunca roda.
Nenhum teste unitário pegaria, porque cada peça funcionava isolada.

## A correção

O despachante resolve `'owner'` como alias do dono primário. A tela continua usando um rótulo legível;
o alias existe para que regras já criadas passem a funcionar sem migração.

## O que ainda falta

- Nenhum teste automatizado cobre o alias: ele foi corrigido e validado à mão. Isso é dívida.
- A varredura de `ticket.atrasado` não pôde ser provocada de verdade: o SLA urgente é de 4h e o store
  não aceita `opened_at` arbitrário. O caminho foi exercitado pelo `conta.vencendo`, que usa o mesmo
  executor e a mesma memória.
