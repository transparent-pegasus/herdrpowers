# Herdr guidance

This pack's `herdr` skill is an original bootstrap that reads the operating
guide embedded in the installed Herdr binary with `herdr --skill`. It requires
`HERDR_ENV=1` before loading the guide.

Herdr must be installed separately and support `--skill`. The bootstrap needs
no network access, repository clone, or separately installed Herdr skill.
The pack does not bundle Herdr's skill, README, or other upstream files.

See the [official skill documentation](https://herdr.dev/docs/agent-skill/)
for the CLI-provided guide.
