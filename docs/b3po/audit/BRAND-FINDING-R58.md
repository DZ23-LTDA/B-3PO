# Achado de rebranding — rodada 58

## A barra de status mostra "HERMES" duas vezes

Na captura do painel (`evidencias-r58/painel-01.png`), o rodapé renderiza:

```
HERMESHERMES   Terminal   Servidor pronto   lmpra   Inteligente   cliente vgit.6c85ca0.dirty
```

Duas ocorrências de **HERMES** em texto visível, sem separador entre elas — não é um rótulo de
runtime interno nem atribuição legal: é marca aparecendo na interface.

## Por que isto importa

O GOAL classifica referências a Hermes em seis tipos e só permite as visíveis quando técnicas ou
legais. Um rodapé de produto com o nome da marca de origem **duas vezes** é exatamente o que o
rebranding existe para corrigir, e o dono já pediu: *"o usuário deve perceber B-3PO como produto"*.

## Onde investigar

Componentes da barra de status do desktop (`src/app/**` ou o shell), procurando por texto fixo
`HERMES` em maiúsculas. A repetição sugere duas fontes distintas — provavelmente um rótulo do
aplicativo e um do servidor local — que precisam virar **B-3PO** e algo como "servidor local", sem
duplicar a marca.

## Também registrado aqui

O mesmo rodapé mostra `cliente vgit.6c85ca0.dirty` — versão com hash de git e sufixo `dirty`, que é
informação de desenvolvimento, não de produto. Já estava registrado antes desta série como defeito
visível aguardando decisão do proprietário.

## Estado

Não corrigido nesta rodada: o escopo era o painel. Fica registrado para a fase de rebranding
(rodadas 41–55 do mapa, das quais o rebranding visível ainda não foi tratado em profundidade).
