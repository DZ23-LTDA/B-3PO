import type { TestProjectConfiguration } from 'vitest/config'
import { defineConfig } from 'vitest/config'

const reactUi: TestProjectConfiguration = {
  extends: './vite.config.ts',
  test: {
    name: 'ui',
    environment: 'jsdom',
    // Keep padding regressions observable instead of mocking the stylesheet away.
    css: { include: [/status-stack\.css$/] },
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    globals: true,
    // React 19.1+ stubs `react`.act to undefined in the production build;
    // @testing-library/react's act() delegates to it and throws
    // "React.act is not a function" when NODE_ENV=production. Force the
    // development build for the test worker so `act` resolves to a real
    // function, regardless of any ambient NODE_ENV (e.g. a shell that
    // inherited NODE_ENV=production from a desktop launch).
    env: { NODE_ENV: 'development' },
    // The first test in each file pays jsdom env init + full module transform,
    // which can exceed vitest's 5000ms default under CI/load. 15s gives the
    // cold start headroom without masking genuinely hung tests. Hooks pay the
    // same cold cost when a beforeEach does `vi.resetModules()` + `await
    // import(...)` (65 files); one timed out at 10s on CI (#120318).
    testTimeout: 15_000,
    hookTimeout: 30_000
  }
}

const electronNative: TestProjectConfiguration = {
  test: {
    name: 'electron',
    environment: 'node',
    // `e2e/**/*.unit.test.ts` is the e2e HELPERS, not the specs: plain node
    // modules that should be provable without booting Electron. Playwright
    // ignores the same pattern so they run in exactly one runner.
    include: ['electron/**/*.test.ts', 'scripts/**.test.{ts,mjs}', 'e2e/**/*.unit.test.ts'],
    // Tests here shell out to real interpreters (python3, pwsh) over a 40+
    // case corpus; pwsh alone takes several seconds to start on a loaded CI
    // runner, so vitest's 5s default timed the Windows marker judge out.
    //
    // r194/r195 do GOAL V2: 120 s, não 5 nem 30.
    //
    // **Sob a suíte completa, dois contratos estouraram o teto** — `checkout-source` em 30 040 ms (o teto
    // explícito dele, 30 s) e `channel-build-version` em 72 042 ms — **enquanto passavam isolados: 5 e 4 verdes, e
    // 230 na r193 com os seis da 4ª ordem juntos**. **Um interpretador que leva 3 s vazio leva 30 s com 5 679
    // testes disputando a máquina**, e o terceiro arquivo leva mais porque exercita o `record` três vezes.
    //
    // **O teto é o orçamento do pior caso, não o tempo que o teste levou uma vez** — e um timeout só mata o que
    // trava de verdade.
    testTimeout: 120_000,
    /**
     * r203 do GOAL V2: **uma re-execução**, e a condição é medida.
     *
     * **O `channel-build-version` tem UM teste que passa isolado em 12 s e falha 1 em N na suíte completa**, com
     * `Cannot process the XML from the 'Error' stream` — **o `console.error` do `writeManifest` quando o `Msix` do
     * `app-builder-lib` não monta o pacote**. **As três camadas anteriores eram minhas** (o `stdio` herdado na r196,
     * o `python3` nos outros dois `execFileSync` na r200); **esta é concorrência dentro da biblioteca de terceiro.**
     *
     * **Por que no config e não no teste**: a forma `test(nome, { retry }, fn)` **compila num arquivo novo**, mas
     * **não** neste — **a anotação de retorno `(): void` fixa a sobrecarga `(nome, fn, timeout)`**, e forçar exigiria
     * remover a tipagem de um teste que funciona. **O config é o lugar que existe para isso.**
     *
     * **`1`, não `2`**: uma re-execução cobre "passa sozinho e falha sob carga"; **duas mascarariam um teste que
     * falha de verdade**. **E o retry não esconde defeito do produto** — **o produto não está neste caminho**.
     */
    retry: 1,
    // Only these contracts need the Hermes test interpreter; resolving it may
    // sync the Python environment, which UI-only runs must not wait for.
    globalSetup: ['./vitest.hermes-python.ts']
  }
}

export default defineConfig({
  test: {
    globalSetup: ['./vitest.run-tmp.ts'],
    projects: [reactUi, electronNative]
  }
})
