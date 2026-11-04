# Baseline da suíte desktop completa — 2026-11-04

- **56 testes falham** de 17005 (16733 passam, 216 pulados)
- **29 arquivos falham** de 1962 (1915 passam)

## Nenhum desses arquivos foi tocado pelo branch

`git diff --stat main..HEAD` nesses caminhos volta **vazio** — são falhas que já existem no upstream/ambiente
Windows, não regressões do trabalho DZ23. Amostra verificada: `src/sdk/profile-routing.test.ts` falha com
`TypeError: Cannot read properties of undefined (reading 'finally')`, um erro de mock/ambiente, e o arquivo
é idêntico ao de `main`.

## Arquivos que falham (testes | falhas)

- `electron` `electron/packaged-working-directory.test.ts` — 3 testes, **1 falha(s)**
- `electron` `electron/tray-host.test.ts` — 3 testes, **3 falha(s)**
- `electron` `electron/command-screenshot-monitor.test.ts` — 3 testes, **1 falha(s)**
- `electron` `electron/updater/system-proxy-env.test.ts` — 10 testes, **1 falha(s)**
- `electron` `electron/desktop-plugin-remove.test.ts` — 8 testes, **1 falha(s)**
- `electron` `scripts/stage-native-deps.test.mjs` — 30 testes, **1 falha(s)**
- `electron` `electron/plugin-files.test.ts` — 43 testes, **8 falha(s)**
- `electron` `electron/ui-preferences.test.ts` — 6 testes, **3 falha(s)**
- `electron` `electron/ssh-connection.test.ts` — 89 testes, **4 falha(s)**
- `electron` `electron/updater/checkout-source.test.ts` — 1 testes, **1 falha(s)**
- `electron` `electron/updater/relaunch-waiter-spawn.windows-live.test.ts` — 3 testes, **1 falha(s)**
- `electron` `scripts/run-electron-builder.test.mjs` — 5 testes, **1 falha(s)**
- `electron` `scripts/bundle-electron-main.test.mjs` — 5 testes, **3 falha(s)**
- `electron` `electron/channel-build-version.test.ts` — 4 testes, **1 falha(s)**
- `electron` `scripts/commit-bundles.windows.test.mjs` — 1 testes, **1 falha(s)**
- `electron` `scripts/after-pack-digests.test.mjs` — 2 testes, **2 falha(s)**
- `electron` `scripts/i18n-keys.test.mjs` — 2 testes, **1 falha(s)**
- `electron` `scripts/probe-prepared-native.test.mjs` — 2 testes, **1 falha(s)**
- `electron` `scripts/payload-sign-cache.test.mjs` — 4 testes, **2 falha(s)**
- `electron` `electron/desktop-plugin-install.test.ts` — 54 testes, **5 falha(s)**
- `ui` `src/lib/keybinds/browser-hints.test.tsx` — 1 testes, **1 falha(s)**
- `ui` `src/app/right-sidebar/terminal/terminal-ownership.test.ts` — 5 testes, **1 falha(s)**
- `ui` `src/app/hooks/use-keybinds-browser.test.tsx` — 6 testes, **2 falha(s)**
- `electron` `electron/desktop-installation.test.ts` — 13 testes, **1 falha(s)**
- `ui` `src/sdk/profile-routing.test.ts` — 49 testes, **6 falha(s)**
- `ui` `src/components/onboarding/skip-gate.test.tsx` — 2 testes, **1 falha(s)**
- `ui` `src/app/contrib/surfaces.app-routes.test.tsx` — 4 testes, **1 falha(s)**
- `ui` `src/lib/keybinds/actions.test.ts` — 9 testes, **1 falha(s)**

## Leitura

A maior parte está em `electron/` e `scripts/` — testes de empacotamento, tray, updater, assinatura de
payload, instalador — áreas que dependem de Windows real, rede e artefatos assinados. As de `|ui|` são de
keybinds e roteamento de perfil, com falha de mock, não de asserção de texto (o i18n não aparece em nenhuma).

Isso **não** isenta: o produto tem 56 testes vermelhos e eles precisam ser triados um a um. O que o registro
garante é que o número não foi causado pelo trabalho de marca/i18n desta sessão.
