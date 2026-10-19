# Plugin scanner reproduction and findings

The centralized scan for [awesome-ai-plugins PR #795](https://github.com/hashgraph-online/awesome-ai-plugins/pull/795)
scored commit `cf82b3b6517a3ef9aaed931008bcc33c6ae053a5` at 77/100 with
14 findings. The same result was reproduced locally with `plugin-scanner 3.0.123`.

After the changes below, the repository scan and the separate Claude and
Codex scans each score **95/100**. Seven findings remain: two lockfile findings
and five informational presentation findings, all documented below.

## Reproduce

The [scanner workflow](workflows/plugin-security-scan.yml) uses the catalog's
[SHA-pinned action](https://github.com/hashgraph-online/ai-plugin-scanner-action/tree/caba2e96aa8ad2feb6cf6fca52442b52e22e779f)
(`v1.2.635`, bundling `plugin-scanner 3.0.123`). It runs on pushes and pull
requests with only `contents: read`, without persisted checkout credentials,
live probing, repository policy overrides, or automatic comments. A score of
at least 80 passes; finding severities remain advisory, matching the catalog.

Run the same scanner locally with [uv](https://docs.astral.sh/uv/):

```bash
uvx --from plugin-scanner==3.0.123 plugin-scanner scan . --format json --output /tmp/herdrpowers-scan.json --min-score 80 --fail-on-severity none
```

The repository scan detects both supported scanner ecosystems. To reproduce
their findings separately:

```bash
uvx --from plugin-scanner==3.0.123 plugin-scanner scan . --ecosystem claude --min-score 80 --fail-on-severity none
uvx --from plugin-scanner==3.0.123 plugin-scanner scan . --ecosystem codex --min-score 80 --fail-on-severity none
```

## Rule dispositions

Shared repository checks appear once per detected ecosystem, accounting for
the duplicate lockfile, security policy, and Dependabot findings.

| Rule | Resolution |
|---|---|
| `MARKETPLACE_SOURCE_INVALID` | Fixed `.agents/plugins/marketplace.json` to use `source: local` and `path: ./`, pointing at the plugin in the repository root. |
| `MARKETPLACE_UNSAFE_SOURCE` | The same fix supplies the missing in-repository path. The [official marketplace format](https://developers.openai.com/plugins/build/plugins#marketplace-metadata) resolves it relative to the marketplace root. |
| `SECURITY_MD_MISSING` | Added `SECURITY.md` with supported versions and a reporting process. |
| `DEPENDABOT_MISSING` | Added weekly GitHub Actions updates for both pinned actions. |
| `CODEXIGNORE_MISSING` | Added `.codexignore` for local state, coordination files, and environment files. |
| `DEPENDENCY_LOCKFILE_MISSING` | Accepted for both ecosystems: `package.json` contains OpenCode discovery metadata and no dependencies, dev dependencies, optional dependencies, or peer dependencies. The entry point imports only Node built-ins, so there is no dependency graph to lock. Add a lockfile when a dependency is introduced. |
| `PLUGIN_JSON_INTERFACE_ASSET_PRIVACYPOLICYURL` | Accepted: `privacyPolicyURL` is absent, not a malformed URL. The plugin does not provide a hosted service or a separate privacy-policy page. |
| `PLUGIN_JSON_INTERFACE_ASSET_TERMSOFSERVICEURL` | Accepted: `termsOfServiceURL` is absent. Distribution terms are in `LICENSE` and `NOTICE`. |
| `PLUGIN_JSON_INTERFACE_ASSET_COMPOSERICON` | Accepted: `composerIcon` is absent; no icon path is declared. |
| `PLUGIN_JSON_INTERFACE_ASSET_LOGO` | Accepted: `logo` is absent; no logo path is declared. |
| `PLUGIN_JSON_INTERFACE_ASSET_SCREENSHOTS` | Accepted: `screenshots` is absent; no screenshot paths are declared. |

In version 3.0.123, the scanner's `check_interface_assets` checks every listed
presentation field whenever an `interface` object exists, including absent
fields. These five informational findings therefore describe omitted metadata.
No findings are suppressed, and no scanner baseline or policy override is used.

The default scan does not install the optional Cisco skill scanner. Passing
this check establishes the catalog's static baseline, not a complete audit of
skill behavior or agent permissions.
