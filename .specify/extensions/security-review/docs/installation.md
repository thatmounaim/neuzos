# Installation Guide

This guide follows the Spec-Kit extension development workflow from the upstream Extension Development Guide. In that workflow, the `specify` CLI installs and manages extensions, and the registered command is then executed from your AI agent as `/speckit.security-review.audit`.

## Prerequisites

Before installing the extension, make sure you have:

- A working Spec-Kit project
- The `specify` CLI available in your shell
- An agent environment that reads registered Spec-Kit slash commands

Verify the CLI is available:

```bash
specify --version
```

## Install from a Release Archive

Use this when you want a pinned version from a tagged release.

```bash
cd /path/to/spec-kit-project

specify extension add security-review --from \
  https://github.com/DyanGalih/spec-kit-security-review/archive/refs/tags/v1.0.0.zip
```

## Install a Local Checkout for Development

Use this when you are iterating on the extension itself.

```bash
git clone https://github.com/DyanGalih/spec-kit-security-review.git

cd /path/to/spec-kit-project
specify extension add --dev /path/to/spec-kit-security-review
```

The `--dev` flag matches the upstream development flow and keeps the extension linked to your working copy.

## Verify Installation

List installed extensions:

```bash
specify extension list
```

Check that the agent command was registered:

```bash
ls .claude/commands/speckit.security-review.audit.*
cat .specify/extensions/.registry
```

## Run the Command

After installation, open your agent session from the same project and run:

```text
/speckit.security-review.audit
```

You can also provide natural-language scoping input:

```text
/speckit.security-review.audit focus on auth, secrets, and dependency risk
/speckit.security-review.audit review only the backend and infra directories
```

## Optional Project Review Template

This repository includes [config-template.yml](../config-template.yml) as an optional team convention. If you want a reusable review brief for your project, copy it into the project root as `speckit-security.yml` and reference it in your command input.

Example:

```bash
cp /path/to/spec-kit-security-review/config-template.yml ./speckit-security.yml
```

Then call the command with that context in mind:

```text
/speckit.security-review.audit use speckit-security.yml as the review brief
```

## Remove the Extension

The upstream guide uses `remove`, not `uninstall`.

```bash
cd /path/to/spec-kit-project
specify extension remove security-review
```

## Troubleshooting

### Extension Does Not Appear in `specify extension list`

Reinstall from the project root:

```bash
cd /path/to/spec-kit-project

specify extension add security-review --from \
  https://github.com/DyanGalih/spec-kit-security-review/archive/refs/tags/v1.0.0.zip
```

### Command Is Not Available in the Agent

Check registration artifacts:

```bash
ls .claude/commands/
cat .specify/extensions/.registry
```

If `speckit.security-review.audit` is missing, remove and reinstall the extension.

### Local Development Changes Are Not Reflected

Re-run the local development install from the Spec-Kit project:

```bash
cd /path/to/spec-kit-project
specify extension add --dev /path/to/spec-kit-security-review
```

### Review Scope Is Too Broad

Pass narrower instructions as command input instead of CLI flags:

```text
/speckit.security-review.audit review only authentication flows
/speckit.security-review.audit focus on OWASP Top 10 and payment processing
```

## Next Steps

1. Run [usage.md](usage.md) for command examples.
2. Review [../examples/example-output.md](../examples/example-output.md) for report structure.
3. If you are developing the extension, use the upstream guide for manifest, command-file, and packaging conventions.
