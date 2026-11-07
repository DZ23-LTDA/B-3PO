# GOAL V2 — RODADA 13: O DEFEITO DE 41 s — MEDIDO, E A CORREÇÃO RECUSADA

**Data**: 05/11/2026 · **Item 4 da ordem — inicialização do Desktop**
**Resultado: o código foi revertido ao estado original. Nenhuma mudança de produto.**

---

## O QUE EU IA FAZER

A r248 documentou que a recuperação de lock podia esperar **~41 s** antes de recusar, e a r250 classificou isso como o **único defeito de produto** entre as 40 falhas de teste.

**O plano**: reduzir o timeout do `powershell.exe` de 15 s para 2 s **só no caminho do lock** — o updater continuaria com 15 s, porque lá a leitura é rara.

**O raciocínio parecia sólido**: o lock poll a cada 25 ms; esperar 15 s por leitura é desproporcional.

---

## O QUE OS TESTES MOSTRARAM

### Primeiro, medi os cenários curtos

| Cenário | Tempo medido |
|---|---|
| Lock com pid morto | **< 3 s** |
| Lock vazio | **< 5 s** |
| Sem lock | **< 2 s** |

**Nenhum chega perto de 41 s.** O custo **não está** no loop de 40 tentativas nem no `waitForRepair` de 25 ms — está no **spawn do PowerShell**.

### Depois, o teste que já existia

Com o timeout reduzido para 2 s, rodei a suíte de instalação. Um teste falhou:

```
× reclaiming a dead repair lock never deletes a lock a peer created meanwhile    42494ms
```

**42.494 milissegundos.** **Esse é o "41 s"** — e agora sei **exatamente qual cenário o produz**: *"reclamar um lock morto nunca apaga um lock que um par criou nesse meio-tempo"*.

---

## POR QUE A CORREÇÃO ERA PERIGOSA

`identityStateSync` decide a sorte do lock assim:

```ts
const actual = recordedCt === null ? null : env.createTime(pid)

if (recordedCt === null || actual === null) {
  return env.nowS - startedAt <= V1_MAX_AGE_S ? 'unknown' : 'dead'
}

return Math.abs(recordedCt - actual) <= CREATE_TIME_TOLERANCE_S ? 'match' : 'dead'
```

**Se o PowerShell não responde em 2 s, `actual` vira `null`, e o lock de um processo VIVO passa a ser julgado `'dead'`.** O próximo passo do código é **reclamar** esse lock — ou seja, **roubá-lo de quem está usando**.

**Foi exatamente o que o teste detectou**: o lock do par foi apagado.

> **A r248 estava certa ao não corrigir.** *"Mexer em recuperação de lock sem medir pode travar o launch para sempre"* — e a medição confirmou: **o timeout de 15 s não é folga, é o preço de não roubar lock vivo.**

---

## A DECISÃO

**Revogada a mudança.** `update-marker.ts` e `desktop-installation.ts` voltaram ao estado original. Árvore limpa.

### O que fica no lugar

**A medição.** A partir de agora, os três cenários curtos têm número: **< 3 s · < 5 s · < 2 s**. O pior caso está localizado no spawn, não no loop.

### O que **não** fica

**Nenhuma correção.** O defeito continua. E agora há uma razão medida para ele existir.

---

## A DIREÇÃO CORRETA (não implementada, registrada)

Reduzir o timeout **não é** o caminho. O caminho é **não spawnar PowerShell no caminho quente**:

1. **`GetProcessTimes` nativo** — o Electron já usa para o próprio pid (`ownCreateTime`). Um binding nativo para um pid arbitrário eliminaria o spawn inteiro.
2. **`process.kill(pid, 0)` já responde "vivo"; faltaria só "é o mesmo processo"** — e isso pode vir de um `wmic` em lote, uma vez por pid, com cache de longa duração.
3. **Trocar identidade por tempo de criação por um token de instância** — um UUID gravado no lock pelo dono; quem não bate o token é outro processo. **Não precisa de spawn nenhum.**

A opção 3 é a mais promissora e a mais invasiva: muda o formato do lock, e portanto exige migração dos locks existentes.

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| Cenários medidos | **3** |
| Tempo do pior caso confirmado | **42.494 ms** |
| Teste que detectou o roubo de lock | `desktop-installation.test.ts` — **já existia** |
| Linhas de produto alteradas | **0** (revertido) |
| Typecheck | **0 erros** |
| Árvore | **limpa** |

---

## A LIÇÃO

> **O teste que já existia pegou a correção.** Não porque ele mede tempo — porque ele mede **a consequência**: *"nunca apaga um lock que um par criou nesse meio-tempo"*.
>
> Eu ia "otimizar" 41 s e teria introduzido **roubo de lock entre dois processos do B-3PO**. O sintoma seria intermitente e caro: duas instâncias abertas, uma delas perdendo a instalação.
>
> **Quando o número parece absurdo, a primeira hipótese deve ser que ele está comprando alguma coisa.** 15 s de paciência compram a garantia de não roubar um lock vivo.

---

## PRÓXIMA RODADA

Item 4 continua, mas pelo lado **não destrutivo**: **a atualização** (não a inicialização). O `appinstaller-checker` e o caminho de update têm menos risco de consequência permanente que o lock — e o GOAL V2 pede **"corrigir os problemas de inicialização e atualização"**, não só a inicialização.
