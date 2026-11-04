# O pareamento recusa link inválido — e diz por quê (rodada 154)

A r153 provou que o app renderiza. Ficou `NOT_TESTED` uma coisa ao meu alcance: **o que o app faz quando o
link de pareamento é inválido**. Uma tela que aceita qualquer coisa e mostra "conectando…" para sempre seria
pior que uma que recusa.

## A sequência medida

| Passo | Medição |
|---|---|
| 1. Campo vazio | botão **`disabled`** — `Conectar com este link` não é clicável |
| 2. Digitar `b3po://pair?url=nao-e-uma-url&token=abc` | botão **habilita** |
| 3. Tocar em Conectar | título muda de *"Sem conexão com o computador"* para **"Não foi possível parear"** |
| 4. Mensagem | **"O endereço do computador usa um tipo de conexão que este aplicativo não aceita."** |
| 5. Campo | **mantém o texto digitado** |

`evidencias-r153/android-erro-pareamento.png`

## Por que cada um desses cinco importa

**Botão desabilitado com campo vazio** — o app não oferece uma ação que não pode dar certo. Sem isso, o
usuário toca, nada acontece, e ele conclui que o app travou.

**Erro nomeado, não "erro"** — o texto diz *qual* é o problema (tipo de conexão), não *que* houve problema.
"Falha ao conectar" mandaria o usuário conferir rede, firewall e senha: três coisas que estão certas.

**O campo preservado** — corrigir um link colado errado exige editar, não redigitar. Limpar o campo é o
reflexo comum e o mais irritante.

**O título troca** — o cabeçalho do cartão deixa de afirmar "sem conexão" (que ainda é verdade, mas já não é
a notícia) e passa a dizer o que o usuário acabou de tentar fazer e falhou. O estado mais recente ganha.

**Não trava e não finge** — não há spinner eterno nem "conectado" mentiroso.

## O que continua NÃO testado

**Um pareamento bem-sucedido.** Isso exigiria o Desktop aberto gerando link e o emulador alcançando o host;
o link que o app espera (`b3po://pair?url=…&token=…`) é produzido pelo desktop, e eu testaria o caminho
inteiro de pareamento — que é justamente a superfície de segurança da conexão remota. Testar isso de
qualquer jeito, com um token fabricado, provaria menos que nada.

**Veredito:** `PARTIAL` no item "pareamento" — o ramo de erro está `VALIDATED`; o ramo de sucesso continua
`NOT_TESTED`.

## Medido

| Medida | Valor |
|---|---|
| Estados de tela exercitados | 2 (inicial, erro de link) |
| Botão desabilitado sem entrada | **provado** |
| Erro específico e acionável | **provado** |
| Campo preservado após erro | **provado** |
| Pareamento bem-sucedido | **não testado** |
| Telas mobile capturadas no projeto | **2** (r153, r154) |
