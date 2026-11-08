# O pacote instalado abre — e é B-3PO (rodada 242)

## O que a r241 deixou

A r241 provou que o instalador **existe** e tem a marca nos metadados, mas registrou honestamente: *"instalar o MSIX e
abrir: **não testado** — verifiquei os metadados, não executei o pacote"*.

## A prova

Executei o binário empacotado:

```
apps/desktop/release/win-unpacked/B-3PO.exe  --remote-debugging-port=9370
```

**Abriu.** Screenshot em `docs/b3po/evidencias/instalado-r242.png`.

## O que a janela mostra

| Item | Observado |
|---|---|
| **Mascote** | robô B-3PO grande, centralizado |
| **Logo** | **"B-3PO BOT PLATFORM"** |
| **Sidebar** | CONVERSAS · BOTS · Nova conversa · Capacidades · Mensageria · CRM · Artefatos · Tarefas agendadas · Painel · Atendimento · Agenda · Produtos · Estoque · Compras · Vendas · Financeiro · Serviços · RH · Marketing · Pós-venda · Agentes · Automações · Documentos · Privacidade · Empresa |
| **Composer** | "Peça uma tarefa ao B-3PO" |
| **Rodapé** | "Servidor pronto" · "Imprimir" |
| **Modelo** | Qwen3.5:4B · Med |
| **"Hermes" visível** | **não** |

**Tudo em português.** 25 itens de menu, todos traduzidos.

## O que isso prova, e o que não prova

### Prova

- O **binário empacotado executa** — não é só um arquivo com metadados certos.
- O **renderer carrega do bundle embutido** (`app.asar`), não de um servidor de dev.
- A **marca e o idioma sobrevivem ao empacotamento** — o rebranding não depende do ambiente de desenvolvimento.
- O **mascote está no pacote** (a imagem aparece).

### Não prova

| Item | Estado |
|---|---|
| **Instalação via MSIX** (duplo clique no `.msix`) | **não testado** — executei o `win-unpacked`, não instalei o MSIX |
| **Assinatura** | **não tem** — o MSIX é não assinado; o Windows vai avisar |
| **Atualização** (feeds, canais) | **não testado** |
| **Desinstalação** | **não testado** |
| macOS / Linux | **não construído** |

## A diferença entre "empacotado" e "instalado"

Testei **`win-unpacked/B-3PO.exe`** — o diretório que o electron-builder produz **antes** de empacotar no MSIX.
Isso prova que **o app funciona quando empacotado**, não que **o MSIX instala**.

O MSIX (`B3PO-1.0.0-win-x64.msix`, ~191 MB) foi gerado na r241 e **não foi executado**.

**A distinção importa**: "abre empacotado" e "instala e abre" são duas afirmações, e eu só tenho a primeira.

## Medido

| Medida | Valor |
|---|---|
| Executável | `B-3PO.exe` 235,4 MB |
| Abriu | **sim** |
| Itens de menu em português | **25** |
| Mascote visível | **sim** |
| "Hermes" na UI | **não** |
| Título / idioma | **B-3PO / pt** (medidos na r228) |
