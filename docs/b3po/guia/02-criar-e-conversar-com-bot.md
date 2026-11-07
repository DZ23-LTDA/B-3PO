# 2 — Criar um bot e conversar

## O que é um bot aqui

Um bot é **um perfil do runtime** com identidade própria: nome, instruções (a "alma"), persona,
mascote e o modelo que ele usa. Cada bot tem **uma conversa canônica** — a mesma conversa aparece no
desktop e, quando a conexão móvel estiver completa, no celular. Não existe histórico paralelo: quem
guarda o transcript é o runtime, uma vez só.

## Criar

1. Na barra lateral, clique em **Novo bot ou grupo** (ou no `+`).
2. Preencha:
   - **Nome** — é o que aparece na lista (ex.: "Revisor de Código").
   - **Descrição** — uma linha sobre o que ele faz; aparece embaixo do nome.
   - **Instruções** — como ele deve trabalhar. Vale escrever o que **não** fazer também.
   - **Mascote** — escolha um dos avatares oficiais. O mascote é identidade visual: ele não executa
     nada, e o app não usa emoji no lugar dele.
3. Se quiser começar de um modelo pronto, use **Começar de um modelo**: há personas de exemplo
   (Revisor de Código, Analista Financeiro, Assistente de Pesquisa, Suporte ao Cliente, Vendas
   WhatsApp, Planejador do Dia). Elas preenchem o formulário — não criam bot falso nem prometem
   integração que não existe.
4. Salve. O bot aparece na lista com o mascote e o estado de atividade.

## Conversar

1. Clique no bot. A conversa abre com o título dele.
2. Escreva na caixa embaixo e pressione **Enter**.
3. Enquanto o bot trabalha você vê o progresso real: ferramenta em uso, aprovação pendente, erro.
   Nada é inventado — se a tela diz "Aguardando aprovação", foi o runtime que pediu.

### Enquanto uma execução está rodando

| Controle | O que faz |
|---|---|
| **Parar** | cancela a execução em andamento; o bot volta a aceitar mensagem |
| **Fila / conduzir** | enfileira uma mensagem nova ou redireciona a execução atual |
| **Enviar** | envia a mensagem quando não há execução ativa |

Depois de **Parar**, o texto que já tinha sido produzido **permanece** na conversa — cancelar não apaga
o que o bot já escreveu, e a sessão continua aberta para você continuar dali.

### Aprovações

Quando o bot vai fazer algo sensível (rodar comando, escrever arquivo, usar uma ferramenta
autorizada), ele **pára e pede aprovação**. A decisão é sua, na tela, sempre no backend — uma
notificação nunca aprova nada sozinha.

## Editar, arquivar e excluir

- **Editar** — nome, descrição, instruções, mascote e modelo do bot.
- **Arquivar** — tira da lista sem apagar o histórico.
- **Excluir** — pede confirmação. A conversa e o histórico do bot vão junto; não há lixeira.

## Idiomas

A interface está disponível em português (Brasil), inglês, espanhol, francês, alemão, italiano, russo,
japonês, chinês e mais. Troque em **Configurações → Idioma**; a troca vale na hora, sem reiniciar.

## O que ainda não existe

- conversar com o bot **pelo celular** de ponta a ponta: as telas e o pareamento existem, a ligação
  com o gateway é o próximo passo (veja [Android](03-android.md));
- equipes de bots com delegação visível na interface: o runtime suporta subagentes, a experiência de
  "equipe" ainda não está pronta para usuário final.
