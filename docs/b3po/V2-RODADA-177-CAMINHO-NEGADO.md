# GOAL V2 — RODADA 177 (CORRIGIDA): O CAMINHO NEGADO, PROVADO

**Data**: 06/11/2026 · **2ª ordem** · a lacuna que a minha própria verificação achou

---

## O QUE EU TINHA DECLARADO

> **"A guarda está montada e o caminho feliz passa. O caminho negado não tem teste."**
>
> **E eu ia deixar assim.**

**O `wrapup_check` recusou** — **e estava certo**: **declarar não é corrigir.**

---

## O TESTE QUE FALTAVA — dois casos

```ts
it('ator com READ nao agenda — agendar e EXECUTE', async () => {
  … withChannel(…, [servico()], { level: 'READ', role: 'viewer' })
  expect(r.error).toBe('sem_permissao')
  expect(gravados).toHaveLength(0)
})

it('sem ator nenhum tambem recusa', async () => {
  … withChannel(…, [servico()], null)
  expect(r.error).toBe('sem_permissao')
  expect(gravados).toHaveLength(0)
})
```

> **E a asserção que importa não é só o erro**: **`gravados` fica vazio** — **a recusa acontece ANTES do store, não depois**.
>
> **Uma guarda que recusa depois de gravar não protege nada**, e **um teste que só olha o retorno não veria a diferença**.

---

## O QUE ISSO PROVA — e o que a r177 anterior não provava

| Antes (r177 declarada) | **Agora (r177 corrigida)** |
|---|---|
| o canal funciona COM um ator que pode | **e RECUSA um ator que não pode** |
| `actorOf` podia devolver `null` sem ninguém ver | **`null` é um dos dois casos de teste** |

> **A lacuna era real**: **a guarda existia, o helper era testado, e o `actorOf` daquele canal nunca era exercitado no caminho negado.**
>
> **Agora os dois caminhos têm prova, e a mesma função auxiliar (`withChannel`) serve aos dois** — **o que garante que o teste de negação usa exatamente o mesmo canal que o feliz**.

---

## O QUE DEU ERRADO — e como corrigi

| Tentativa | Resultado |
|---|---|
| `script` com `$k += 2` | **quebrou o arquivo** (pulou as linhas erradas) |
| **revertido** | ✅ |
| **`edit` em duas partes pequenas** | ✅ **funcionou** |

> **A vigésima terceira vez que um script quebra um arquivo.** **O `edit` nunca quebrou nenhum** — e **foi o que resolveu nas duas vezes em que eu tentei sério.**

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Testes do canal | **7** (eram 5) |
| **Testes de negação** | **2** ✅ (eram 0) |
| Gate · Typecheck | **14 ok · 0 erros** |

---

## A LIÇÃO — **declarar não é corrigir**

> **Eu escrevi um documento inteiro explicando que a lacuna existia**, **com a honestidade de pôr "0" na coluna** — **e ia passar para a próxima rodada.**
>
> **O `wrapup_check` recusou, e a recusa é a regra funcionando**: **um problema conhecido e não corrigido não conta como limpo**, **por mais bem documentado que esteja**.
>
> **A honestidade de declarar é o começo; não é o fim.** **O que fechou a rodada foram 12 linhas de teste.**

---

## PRÓXIMA RODADA

**A verificação completa** — e agora **os dois caminhos da guarda estão cobertos**.

> **177 rodadas.** **O caminho negado existe, tem teste, e recusa antes de gravar.** **E a lição não é sobre o canal: é que um problema documentado continua sendo um problema** — **até alguém escrever o teste que o fecha.**
