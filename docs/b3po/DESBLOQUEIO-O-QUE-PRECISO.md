# O que eu preciso de você para desbloquear o resto

Três dependências externas travam as partes mais importantes do produto. Nenhuma delas é código que eu possa
escrever: todas exigem uma conta, um certificado ou um arquivo que só o proprietário pode obter. Este documento diz
**exatamente o que pedir, onde colocar e como eu vou provar que funcionou**.

Enquanto elas não existirem, eu continuo entregando correções pontuais — mas o produto não muda de patamar.

---

## 1. WhatsApp oficial — desbloqueia as CONVERSAS do CRM

> **Correção importante (rodada 168).** Eu havia escrito aqui que o canal precisava ser construído e que as
> variáveis se chamavam `B3PO_WHATSAPP_*`. **Estava errado.** O repositório já traz o adapter oficial da Cloud API
> em `plugins/platforms/whatsapp_cloud/adapter.py`, com webhook, HMAC e formatação. O que falta é credencial e a
> lista de conversas do lado do CRM.

**O que já existe (código real, não plano):**

- `plugins/platforms/whatsapp_cloud/adapter.py` — Meta WhatsApp Business Platform (Graph API + webhook aiohttp);
- webhook em `:8090`, caminho `/whatsapp/webhook`, versão de API `v20.0` (todos configuráveis);
- validação de assinatura `X-Hub-Signature-256` quando `APP_SECRET` está setado;
- checagem de `WABA_ID` no inbound, quando configurado.

**O que falta:** as credenciais (você) e a **lista de conversas no CRM** (eu — hoje o CRM tem contatos, funil e
tarefas; não tem tela de conversa, e o store correspondente também não existe).

### Variáveis — nomes reais do código

```dotenv
WHATSAPP_CLOUD_PHONE_NUMBER_ID=...
WHATSAPP_CLOUD_ACCESS_TOKEN=...
WHATSAPP_CLOUD_APP_ID=...            # opcional
WHATSAPP_CLOUD_APP_SECRET=...        # opcional, mas liga a validação HMAC
WHATSAPP_CLOUD_WABA_ID=...           # opcional; quando setado, o webhook exige que bata
WHATSAPP_CLOUD_VERIFY_TOKEN=...      # você inventa; usado no GET de verificação
WHATSAPP_CLOUD_WEBHOOK_HOST=...      # opcional
WHATSAPP_CLOUD_WEBHOOK_PORT=8090     # padrão
WHATSAPP_CLOUD_WEBHOOK_PATH=/whatsapp/webhook
WHATSAPP_CLOUD_API_VERSION=v20.0
```

O arquivo é `%USERPROFILE%\.hermes\.env` (segredos só ali, nunca no Git). Me diga apenas "está no .env".

### O que você precisa obter (Meta, gratuito no começo)

1. **Conta no Meta Business** e um **app** em `developers.facebook.com` do tipo *Business*.
2. **WhatsApp Business Account (WABA)** com um **número verificado** — chip dedicado, não o seu pessoal, porque o
   número fica preso à API.
3. Do painel: `phone_number_id`, `waba_id`, e um **token permanente de system user** com
   `whatsapp_business_messaging` e `whatsapp_business_management` (o token do painel dura 24h e serve só para teste).
4. Para uso real, um **domínio seu com HTTPS** apontando para o webhook. Para o primeiro teste eu subo um túnel local.

**O que continua proibido:** sessão de WhatsApp Web / Baileys como arquitetura de produção. Existe um bridge
não-oficial no repo (upstream), e ele continua sendo o que o GOAL manda **não** usar como base do produto.

### Como vou provar

1. `GET` no webhook com o `VERIFY_TOKEN` → a Meta valida o endpoint.
2. Mensagem **do seu celular** para o número da API aparece na lista de conversas.
3. Resposta pela interface chega no celular.
4. Conversa vinculada ao contato e à oportunidade no funil.

### Ordem de execução do meu lado

1. store + IPC + cliente tipado de **conversas** (mesmo padrão de contatos/pipeline/tarefas);
2. lista e leitura de conversa no `/crm`;
3. ligar o webhook do adapter ao store, com deduplicação por `message_id`;
4. só então automações.

Os itens 1 e 2 **não dependem de você** — são os próximos que eu ataco.

## 2. Certificado Windows — desbloqueia a distribuição

**O que está travado:** o MSIX sai **não assinado**. O Windows mostra "editor desconhecido" e o SmartScreen bloqueia.
Serve para você testar; não serve para entregar a cliente.

**Opções, da mais barata à mais séria:**

| Opção | Custo aprox. | Observação |
|---|---|---|
| Azure Trusted Signing | baixo, por uso | exige conta Azure verificada; assina no CI |
| Certificado OV (code signing) | ~US$ 200–400/ano | aceito, mas ainda depende de reputação para o SmartScreen |
| Certificado EV em token físico | ~US$ 400–600/ano | melhor para SmartScreen; exige mídia física |

**O que eu preciso:** o certificado instalado na máquina (ou as credenciais do Azure Trusted Signing no `.env` como
`AZURE_SIGN_*` — os nomes eu confiro no runner antes de usar). Depois eu reconfiguro o `electron-builder`, assino,
verifico a assinatura com `signtool verify` e atualizo o manifesto.

---

## 3. Keystore Android de release — desbloqueia o APK de distribuição

**O que está travado:** APK/AAB são gerados em **chave de debug**. Não servem para Play Store nem para atualizar
instalações reais.

**O que eu preciso:** um keystore de release. Eu **não** gero para você — se eu gerar e perder, você perde a
capacidade de atualizar o app na loja para sempre.

Quem precisa fazer (uma vez, e guardar com backup):

```powershell
keytool -genkeypair -v -keystore b3po-release.keystore -alias b3po `
  -keyalg RSA -keysize 4096 -validity 10000
```

Depois me diga apenas onde o arquivo está e como a senha chega (variável de ambiente, nunca no repositório). O
keystore **nunca** entra no Git — isso já está no `.gitignore` e no checklist de release.

---

## 4. iOS — o único bloqueio que não tem solução nesta máquina

**O que está travado:** não existe cliente iOS. Nenhum artefato.

**Por quê:** compilar e assinar iOS exige **macOS + Xcode**, e o contrato de desenvolvedor Apple (US$ 99/ano) para
instalar em aparelho. Nenhum dos dois existe aqui, e nenhuma alternativa técnica contorna isso — não é uma limitação
de esforço, é de plataforma.

**Alternativas reais, se iOS importar:**

- um Mac (mesmo usado) ou um serviço de CI macOS (MacStadium, GitHub Actions macOS runner);
- nesse caso eu escrevo o cliente e o build roda lá;
- até então, o iOS fica **BLOCKED_BY_EXTERNAL_DEPENDENCY**, e o app Android cobre o celular.

---

## O que NÃO está nesta lista (porque eu resolvo)

- interface, tradução, estados vazios/erro/carregando;
- CRM: contatos, funil, filtros, tarefas, indicadores;
- bugs de comportamento que eu encontro e reproduzo;
- documentação, testes, artefatos locais, hashes.

## Prioridade, se você só puder fazer uma coisa

**O item 1** (WhatsApp). É o que transforma o CRM de "caderno de contatos bonito" em ferramenta de trabalho, e é o
único bloqueio que muda o que o produto *é*. Certificado e keystore só mudam como ele é *entregue*.
