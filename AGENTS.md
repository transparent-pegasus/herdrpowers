# Agents Guide

This repository IS the herdrpowers plugin. The payload lives at the repo root: `skills/` (16 skills), `commands/` (6 workflows), `docs/` (framework docs). Plugin manifests: `.claude-plugin/`, `.codex-plugin/`, `.cursor-plugin/`, `.agents/plugins/marketplace.json`.

When editing pack behavior, edit the payload directories directly. The pack's invariants (no in-process subagents in the payload, roles instead of tool names, structural review independence), its Apache-2.0 licensing and `NOTICE` duties, and the changelog and validation protocol are listed in `CLAUDE.md` — they apply to any agent working on this repo.
