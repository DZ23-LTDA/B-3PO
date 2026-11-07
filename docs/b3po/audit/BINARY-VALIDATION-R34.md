# Validação no binário — empresa, serviços e agenda (rodada 34)

Três telas foram entregues nas rodadas 32–33 sem nunca terem sido abertas no aplicativo. Esta rodada
abre as três no Electron real e registra o que viu.

## Como foi medido

Build de produção, `electron.exe` com `--remote-debugging-port=9223` e `--user-data-dir` temporário
(perfil isolado, não o do proprietário), navegação por hash e `Page.captureScreenshot` via CDP.

## Resultado

| Tela | Renderiza | Evidência |
|---|---|---|
| `/empresa` | **sim** | título "Empresa", campos Nome/Nome fantasia/CNPJ, botão "Cadastrar empresa", bloco de filial com select, estado vazio e a nota de migração |
| `/servicos` | **sim** | título "Serviços", hint, campos Nome/Duração/Preço, botão "Cadastrar serviço", estado vazio |
| `/agenda` | **sim** | título "Agenda", campos Recurso/**Serviço (select)**/Data/Hora, botão "Agendar"; **o campo de duração não existe mais** |

O select "Selecione um serviço" na agenda confirma que a troca de texto livre por catálogo chegou ao
binário, não só ao typecheck.

## Backend exercitado pelo IPC real

```
services.save({ name: 'Corte Validado R34', duration_min: 45, price_cents: '79,90' })
→ { price_cents: 7990, duration_min: 45, id: 'srv_…' }        // "79,90" virou 7990 centavos

scheduling.bookFromCatalog({ service: 'corte validado r34', starts_at: … })
→ ends_at − starts_at = 45 min                                // duração derivada do catálogo
→ service: 'Corte Validado R34'                               // nome canônico, não o texto enviado
```

As duas provas que importam: o preço em pt-BR converteu certo, e o **fim do horário veio do
catálogo** — a tela não enviou `ends_at`.

## Um erro de medição meu

O primeiro relatório dizia que as três rotas mostravam a Home. Era falso: eu capturava
`document.body.innerText.slice(0, 400)`, e os 400 primeiros caracteres são a **sidebar** — a tela
começa depois. Duas vezes nesta série a medição esteve errada e o código certo (a rota `/products` na
rodada 9, e agora). A captura de imagem resolveu em segundos o que o texto truncado mentiu.

## O que esta validação NÃO cobre

- Não cliquei nos botões pela interface; o cadastro foi exercitado pelo IPC. Um erro no `onClick` do
  React não apareceria aqui.
- A lista de compromissos apareceu vazia porque o agendamento foi feito por fora do React, depois da
  montagem — não é defeito, é ordem das operações.
- Nenhuma tela foi testada com dados já existentes populando a lista.

## Defeito visível, não desta rodada

O canto inferior direito mostra `cliente vgit.6c85a0.dirty` — já registrado como pendente de decisão
do proprietário desde antes desta série.
