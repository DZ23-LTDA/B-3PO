# Tela fiscal: cancelar e status — tentado, revertido (rodada 108)

## O que eu tentei

Duas coisas na tela de vendas:

1. **Faixa de status do emissor** — o operador precisa saber, **antes de clicar**, que está em homologação.
2. **Botão "Cancelar nota"** — o canal existe desde a r105; falta o botão.

## O que aconteceu

Editei `src/app/sales/index.tsx` com uma série de inserções por número de linha. Três erros em sequência:

| Tentativa | Erro | Efeito |
|---|---|---|
| 1 | `$novo.RemoveAt()` num array de tamanho fixo | o bloco foi **duplicado** em vez de substituído |
| 2 | o `<div>` do banner abriu e fechou antes da `<table>` | *"JSX expressions must have one parent element"* |
| 3 | o `</>` de fechamento ficou no lugar errado | *"Declaration or statement expected"* na última linha |

Cada correção ajeitava um erro e revelava o seguinte. Quando percebi que estava na quarta iteração sem saber o estado final do arquivo, **reverti**.

## Por que reverter foi a decisão certa

O arquivo estava quebrado e eu não tinha mais confiança no que estava lá dentro. Continuar inserindo linha por linha num arquivo que eu já não conseguia ler inteiro é como a r83: código que compila, passa no typecheck e destrói dados.

**Revertido com `git checkout`.** Verificado depois:

```
typecheck: 2 projetos, 0 erros
gate:      14 checks, ok
git:       0 arquivos sujos, HEAD em 74aacb0001
```

## O que fica registrado

**Nada foi perdido do que já estava pronto.** A tela de vendas continua com "Emitir nota" e "Imprimir nota" funcionando — verificado na captura da r106.

Falta (agora com o método certo):

1. **Status do emissor** — um bloco no topo da tela, fora da tabela. O `fiscalStatus()` do cliente já existe e devolve `{ homologado, id, nome, faltando }`.
2. **Cancelar nota** — `cancelarNota(saleId, motivo)` já existe no cliente. O botão deve aparecer quando `notas.some(n => n.ref === 'venda:'+id && n.status === 'autorizado')`, independente de ter `url_danfe` (cancelar não depende de imprimir).

## O método que falhou, e o que usar

Inserção por **número de linha** com `RemoveAt` num array fixo. O certo:

- inserir por **âncora única de texto** (o que funcionou nas r96–107);
- quando o bloco tem várias linhas de JSX, **ler o arquivo inteiro e reescrever o trecho completo** — não empilhar inserções parciais;
- conferir a **estrutura** (abre/fecha de fragmento e `<div>`) antes de rodar o typecheck, não depois.

## Estado

| | |
|---|---|
| HEAD | `74aacb0001` (intacto) |
| typecheck | 2 projetos, ok |
| gate | 14 checks, ok |
| tela de vendas | emitir + imprimir funcionando (r106) |
| cancelar pela tela | **pendente** |
| status do emissor | **pendente** |
