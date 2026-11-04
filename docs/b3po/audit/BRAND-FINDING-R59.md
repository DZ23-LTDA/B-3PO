# Rebranding do nome do produto (rodada 59)

## O que foi corrigido

`appName` era `'Hermes'` em en/de/es/fr/zh. **`pt.ts` não tinha a chave** — o português caía no
fallback inglês e mostrava a marca de origem. `ar_boot.ts` já estava com `'B-3PO Desktop'`, o que
mostra que a correção tinha sido feita em um lugar e não nos outros.

Agora: `appName: 'B-3PO'` em de, en, es, fr, pt (adicionado) e zh. `ja.ts` e `ru.ts` não têm a chave.

## Correção de rota: onde eu errei na rodada 58

Na rodada 58 registrei o achado "HERMESHERMES no rodapé" como **marca visível na interface**. Isso foi
baseado em `textContent`, não em imagem.

Olhando a captura, o rodapé mostra apenas **"Servidor pronto"**. O texto `HERMESHERMESTerminal` existe
no DOM mas **não está visível** — provavelmente um elemento oculto por CSS, do shell antigo.

Ou seja: **o defeito que eu classifiquei como visível provavelmente nunca esteve na tela**. É
exatamente o erro que cometi três vezes nesta série (medir `textContent` em vez de olhar a imagem), e
eu o repeti ao abrir o achado.

A correção do `appName` continua válida — é marca de produto em dado que alimenta metadados,
instaladores e a tela de atualização —, mas ela **não** pode ser vendida como "removi o HERMES do
rodapé", porque não foi isso que aconteceu.

## Regra que fica

`textContent` prova que o texto **existe**, não que **aparece**. Para reivindicar defeito visível, a
evidência tem de ser a captura. Quando as duas discordarem, a imagem está certa.

## Pendente de verdade

O rodapé ainda mostra `cliente vgit.6c85ca0.dirty` no canto direito: hash de git e sufixo `dirty`, que
é informação de desenvolvimento. Esse sim está **visível na imagem** e continua aberto.
