# O erro aparece na tela: PROVADO (rodada 240)

## A pergunta que a r239 deixou aberta

A r239 leu o código e concluiu que **15 de 15 telas tratam falha** — mas escreveu explicitamente: *"isso NÃO prova
que o usuário vê a falha"*.

## A prova

Electron real, `/finance`, clique em **"Lançar"** com o formulário vazio:

```json
{
  "disabled": false,
  "ariaDisabled": null,
  "mudou": true,
  "linhas_novas": ["Informe um valor."],
  "temMsgErro": false
}
```

**A tela mostrou "Informe um valor."** — uma linha nova no DOM, resultado de recusa do backend.

**O botão não estava desabilitado** (`disabled: false`): o usuário pode clicar, a ação é recusada, e a recusa é
**dita em português, no lugar onde ele olha**.

## Meu detector de erros falhou pela TERCEIRA vez

Olhe o JSON acima: `temMsgErro: false` — **e a mensagem estava lá**.

Meu regex era `/falh|erro|inv[aá]lid|obrigat|preench|necess[aá]ri|permiss/i`. **"Informe" não está na lista.**

| Rodada | O que procurei | O que existia | Resultado |
|---|---|---|---|
| 230 | (aria-hidden) | `aria-hidden="true"` | falso positivo |
| 239 | `setErro\|setError\|toast\|...` | `setFailure` | "9 telas sem erro" — falso |
| 239 | `set(...failure\|error\|...)` | `setErro` | "2 sem falha" — falso |
| **240** | **`falh\|erro\|inválid\|obrigat\|...`** | **"Informe um valor."** | **"NAO" — falso** |

**Quatro vezes, quatro listas, quatro palavras faltando.**

## O que o padrão revela

**Não é descuido — é o método errado.** Uma lista de palavras-chave **nunca** cobre a linguagem que uma pessoa
escreveu. O produto fala português natural: *"Informe um valor."*, *"A conversa precisa de um título"*, *"Consentimento
não registrado"*. **Nenhuma dessas frases contém "erro".**

**O detector só funciona quando olha a DIFERENÇA do DOM**, não o vocabulário:

```js
const antes = document.body.innerText
salvar.click()
await dormir(2500)
const novas = document.body.innerText.split('\n').filter(l => l.trim() && !antes.includes(l))
```

**Isso não precisa saber que palavra é.** Vê **o que apareceu** — que é exatamente o que o usuário vê.

## Medido

| Item | Antes (código) | Agora (janela) |
|---|---|---|
| Tela mostra recusa | *"state existe"* | **"Informe um valor."** |
| Botão desabilita para esconder o erro | — | **não** (`disabled: false`) |
| Recusa em português | — | **sim** |
| Vezes que meu detector de erro falhou | — | **4** |

## O que continua sem medição

| Item | Estado |
|---|---|
| Recusa por **permissão** (`sem_permissao`) na tela | **não testada** — testei validação, não autorização |
| Estado `offline` | **0 de 15 telas** |
| Outras 14 telas | **só `finance` foi provada na janela** |

## Fecho da faixa 226–240

| R | Entrega |
|---|---|
| 226 | suite classificada: 4760 verdes, 40 bloqueados por ambiente |
| 227 | performance: **UI 931 ms**, IPC p50 **0,3 ms**, 19 MB lazy |
| 228–233 | acessibilidade: **6 telas medidas**, 3 correções, 1 decisão de design descoberta |
| 234–238 | concorrência: **21 stores serializados**, 12 testes, 8 provados vermelhos |
| 239 | estados de UI: **15 de 15 tratam falha**, 0 offline |
| **240** | **a recusa aparece na tela — "Informe um valor."** |

**A faixa começou com "os testes passam" e termina com quatro afirmações que agora têm número** — inclusive a única
que faltava: **o usuário vê quando o sistema recusa.**
