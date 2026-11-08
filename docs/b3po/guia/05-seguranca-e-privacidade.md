# 5 — Segurança e privacidade

## Princípio: local-first

O B-3PO roda na sua máquina. Sessões, transcrições, memória, configurações e chaves de provider ficam
no seu disco. O que sai da máquina é só o que você mesmo configura:

| Sai da máquina | Quando |
|---|---|
| sua mensagem e o contexto do turno | para o provedor de modelo que **você** escolheu |
| nenhuma telemetria | não coletamos telemetria de uso |
| nada para a DZ23 | não há servidor nosso no meio do caminho |

Se você usa Ollama local, **nem a mensagem sai**: o modelo roda no seu computador.

## Onde ficam as chaves

As chaves de API ficam no arquivo de configuração do perfil, no seu disco. Elas não aparecem na
interface depois de salvas, não vão para log e não são enviadas em URL. Uma chave exposta em log é
tratada como incidente, não como detalhe.

## Aprovação e autorização

- Toda ferramenta sensível pede aprovação; a decisão é validada no **backend**, nunca só na tela.
- Um bot **não herda** permissão maior do que a sua.
- Delegação entre agentes tem limite de profundidade, concorrência e tempo — não existe laço infinito.
- Notificação (push, e-mail, qualquer aviso) **não é autorização**.

## Celular

- O pareamento exige TLS para qualquer computador que não seja a própria máquina; endereço sem
  criptografia para a rede é recusado com mensagem explícita.
- O token de pareamento viaja no handshake da conexão, não na URL (URL vaza em histórico, log de proxy
  e relatório de crash).
- **Pendente**: guardar o token no cofre do sistema (Keychain/Keystore). Enquanto isso não fecha, o
  aparelho não deve ser tratado como confiável.

## O que você deve fazer

1. Confira o SHA-256 dos instaladores antes de abrir (está no `ARTIFACT-MANIFEST.md`).
2. Não desative o SmartScreen nem o antivírus para "resolver" o aviso de app não assinado.
3. Use TLS (`https`/`wss`) se for acessar o computador de outro lugar que não ele mesmo.
4. Faça backup da pasta do perfil antes de atualizar — é lá que está tudo.
5. Revogue chaves de provider que você não usa mais.

## Limite honesto

O B-3PO **não** tem hoje: assinatura de código comercial, publicação em loja, nem certificação
independente. Os relatórios de segurança do projeto (`SECURITY-GAP-REPORT.md`,
`VULN-ANALYSIS.md`) listam o que foi auditado e o que segue aberto — leia antes de usar com dados
sensíveis de terceiros.
