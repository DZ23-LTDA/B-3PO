/**
 * The one short form every surface names a version by: `<release>+<distance>`
 * (`0.21.5+1913`), matching `hermes --version` minus its commit. The commit
 * (`.g<sha>`, `.dirty`) is build metadata the expanded version details show in
 * full; in a label it only adds noise. Callers own the `v` prefix, which the
 * localized copy already carries.
 *
 * A build with NO release at all is a bare git stamp (`git.6c85ca0.dirty`). There
 * is no product version to show, so the label says `dev`: printing a hash and a
 * `dirty` suffix in the status bar tells the user nothing true about the product
 * and makes a shipped build look unfinished.
 */
export function shortVersion(version: string): string {
  const apenasCommit = /^git\.[0-9a-f]+(?:\.dirty)?$/i.test(version.trim())

  if (apenasCommit) return 'dev'

  return version.replace(/^v/, '').replace(/(\+\d+)\.g[0-9a-f]+(?:\.dirty)?$/i, '$1')
}
