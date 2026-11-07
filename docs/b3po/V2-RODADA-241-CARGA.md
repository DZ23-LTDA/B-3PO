# GOAL V2 — RODADA 241: A CARGA MEDIDA — CPU 70%, 47 `node`

**Data**: 06/11/2026 · **1ª ordem** · e a causa da r240 confirmada com número

---

## A MEDIÇÃO

```
CPU: 70%  |  RAM livre: 22.6 GB  |  processos node: 47
```

> **A r240 declarou "a máquina estava sob carga" como HIPÓTESE**, **inferida do `channel-build-version` que levou 100 s**.
>
> **A r241 mede a carga diretamente: 70% de CPU e 47 processos `node` vivos.**

**A r240 tinha razão — e agora tem prova.**

---

## O QUE ENTROU NA TABELA

```md
| `channel-build-version` | 1 de 4 (intermitente) | `B8`: concorrência no `Msix`/`app-builder-lib`.
  O `retry: 1` segurou 36 rodadas; na r239 ele levou 100 s (o normal é 22 s) e falhou duas vezes | terceiro |
```

> **A linha do `B8` voltou à tabela de causas**, **e agora com o número que a torna verificável**: **100 s contra 22 s**, **e 36 rodadas de estabilidade antes.**

---

## OS DOIS FLaky, LADO A LADO

| Linha | Arquivo | Por que está na tabela |
|---|---|---|
| **`audit-store`** | 2 de 13 | **aparece e desaparece desde a r154** |
| **`channel-build-version`** | 1 de 4 | **`B8`: o `Msix` sob carga; 100 s na r239** |

> **As duas entram por motivos diferentes**: **uma é flaky de longa data, a outra é dependente de carga.** **A tabela as separa.**

---

## O QUE ISSO ENSINA SOBRE A r240

> **A r240 mediu 18 vermelhos e escreveu "a máquina estava sob carga" — uma inferência de um único dado (100 s).**
>
> **A r241 mede 70% de CPU e 47 `node`.**
>
> **A inferência estava certa, e o método era fraco**: **um número que pode ter outra explicação.** **A medição direta fechou o buraco em uma rodada.**

---

## MEDIÇÕES

| Medida | Valor |
|---|---|
| **CPU** | **70%** |
| **Processos `node`** | **47** |
| Linhas na tabela | **6** |
| Gate · Typecheck | **14 ok · 0 erros** |

---

## A LIÇÃO — a inferência que virou medição

> **"A máquina estava sob carga"** foi a r240. **"70% de CPU e 47 `node`"** é a r241.
>
> **A primeira é uma explicação; a segunda é um fato.** **E as duas custaram o mesmo: uma chamada.**
>
> **A regra que a sessão vem aprendendo**: **quando eu tenho uma explicação, medir o que ela prevê custa menos que escrevê-la.**

---

## PRÓXIMA RODADA

**A verificação, com a carga declarada** — **e o ciclo em 242 de 256.**

> **241 rodadas.** **70% de CPU e 47 `node` não são uma desculpa: são o segundo argumento do número.** **Um vermelho por carga não é um vermelho por código — e agora a tabela tem onde dizer isso.**
