# 7 — Backup, atualização e limpeza

## Backup

Tudo o que importa está na pasta do perfil Hermes:

| O que | Onde |
|---|---|
| configurações, chaves de provider | `config.yaml` e `.env` do perfil |
| conversas e transcrições | banco de sessões do perfil |
| memória e skills do bot | subpastas do perfil |
| identidade dos bots (nome, mascote, instruções) | configuração do perfil |

Backup seguro = **fechar o B-3PO** e copiar a pasta do perfil inteira. Copiar com o app aberto pode
pegar o banco no meio de uma escrita.

Recomendação prática: um backup por semana e sempre antes de atualizar.

## Atualizar

1. Feche o B-3PO.
2. Faça o backup acima.
3. Substitua o aplicativo pela versão nova (portátil: troque a pasta; MSIX: instale por cima).
4. Abra e confira se seus bots continuam na lista.

Se a versão nova não abrir, volte o backup e use a versão anterior — as configurações são lidas da
pasta do perfil, então voltar é só restaurar a pasta.

## Limpar dados

- **Apagar uma conversa**: pela própria interface, na conversa do bot.
- **Apagar um bot**: excluir o bot remove a conversa e o histórico dele (não há lixeira).
- **Apagar tudo**: feche o app e apague a pasta do perfil. Isso remove configurações, conversas,
  memória e chaves — sem volta.

## O que NÃO fazer

- Não edite os arquivos do banco de sessões à mão.
- Não copie a pasta de perfil de outra pessoa por cima da sua "para ver como fica".
- Não versione a pasta do perfil em repositório público: ela contém chaves de provider.
