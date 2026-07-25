---
name: update-docs
description: "Use when code, config, prompt, schema, or task changes require updating Markdown files directly under docs/, such as architecture, structure, config-sync, theories, adopted-theories, or todo documents."
---

# Update Docs

## Overview

Keep root-level Markdown docs under `docs/` aligned with the current codebase and config.

Use `ROOT_DOCS.md` in this directory as the contract for what each root doc should contain.

## Scope

- Edit only files matching `docs/*.md`
- Do not edit files inside `docs/*/`
- Leave generated or output directories alone, including planning directories, generated content directories, and other paths explicitly marked as outputs by the initialized repository.

## Workflow

1. Identify which root docs are affected by the change.
2. Check `ROOT_DOCS.md` to confirm each affected doc's role and boundaries.
3. Check the current source of truth in code, config, prompts, schemas, or git history.
4. Update only the sections that changed.
5. Keep terminology, tone, and structure consistent with the existing file.
6. Keep diffs minimal. Prefer surgical edits over rewrites.
7. If a doc conflicts with the source of truth, fix the doc.
