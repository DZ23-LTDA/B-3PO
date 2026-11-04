# O que eu preciso de você para desbloquear o resto

Três dependências externas travam as partes mais importantes do produto. Nenhuma delas é código que eu possa
escrever: todas exigem uma conta, um certificado ou um arquivo que só o proprietário pode obter. Este documento diz
**exatamente o que pedir, onde colocar e como eu vou provar que funcionou**.

Enquanto elas não existirem, eu continuo entregando correções pontuais — mas o produto não muda de patamar.

---

## 1. WhatsApp oficial — desbloqueia as CONVERSAS do CRM

**O que está travado:** o CRM tem contatos, funil, tarefas e indicadores funcionando com dados locais. O que **não**
existe é a caixa de entrada de conversas, porque não há de onde puxar mensagem.

**O que não vou fazer:** automação não oficial do WhatsApp Web (QR de sessão pessoal), scraping ou engenharia reversa.
Isso viola os termos do WhatsApp e cai no primeiro banimento — e o GOAL proíbe explicitamente como arquitetura de
produção.

### O que você precisa obter (Meta, gratuito no começo)

1. **Conta no Meta Business** e um **app** em `developers.facebook.com` do tipo *Business*.
2. **WhatsApp Business Account (WABA)** com um **número de telefone** verificado. Um número fixo ou um chip novo
   dedicado — não o seu pessoal, porque o número fica vinculado à API.
3. Do painel, quatro valores:

| Valor | Onde achar |
|---|---|
| `phone_number_id` | WhatsApp → API Setup → "From" |
| `waba_id` | WhatsApp → API Setup (ID da conta) |
| **token permanente** | Business Settings → System Users → gerar token com `whatsapp_business_messaging` e `whatsapp_business_management` |
| `verify_token` | **você inventa** — uma string qualquer, usada uma vez para registrar o webhook |

> O token temporário do painel dura 24h e serve só para teste. Para o produto funcionar de verdade, gere o token de
> **system user**.

4. Um **endereço público para o webhook**. Para testar, eu consigo subir um túnel local e registrar — mas para uso
   real precisa de um domínio seu com HTTPS.

### Como me entregar

Não cole o token em chat, issue ou commit. Coloque em:

```
%USERPROFILE%\.hermes\.env          ← secrets ficam só aqui, nunca no Git
```

```dotenv
B3PO_WHATSAPP_PHONE_NUMBER_ID=...
B3PO_WHATSAPP_WABA_ID=...
B3PO_WHATSAPP_TOKEN=...
B3PO_WHATSAPP_VERIFY_TOKEN=...
```

E me diga apenas: "está no .env". Eu leio o arquivo, nunca imprimo o valor.

### Como vou provar que funciona

1. `GET` no webhook com o `verify_token` — a Meta valida o endpoint.
2. Enviar uma mensagem **do seu celular para o número da API** e mostrar ela aparecendo na inbox.
3. Responder pela inbox e confirmar que chega no celular.
4. Mostrar a conversa vinculada ao contato e a oportunidade no funil.

Só depois disso a inbox e as automações saem de ⬜ para ✅ em `guia/08-o-que-funciona-hoje.md`.

---

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
