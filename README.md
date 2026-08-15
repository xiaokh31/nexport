# Overseas warehouse corporate website

This repository is being prepared as a new corporate website for an overseas warehousing and cross-border fulfillment company. The company identity, address, contact details, operating data, and final brand assets have not been confirmed and remain placeholders.

The project is currently in the planning stage. No implementation from the new development plan has been performed yet.

## Planning documents

Start with [`docs/README.md`](docs/README.md), then follow the documents in order:

1. [`01-project-brief.md`](docs/01-project-brief.md)
2. [`02-current-state-audit.md`](docs/02-current-state-audit.md)
3. [`03-product-design-spec.md`](docs/03-product-design-spec.md)
4. [`04-technical-execution-plan.md`](docs/04-technical-execution-plan.md)
5. [`05-agent-backlog.md`](docs/05-agent-backlog.md)

The implementation must retain login, registration, the user center, quote management, notifications, role management, and article publishing. It must remove the scan reconciliation module, the China-to-Canada shipping solution, demo authentication, fake 2FA, and CAPTCHA fail-open behavior.

## Technology baseline

- Next.js App Router, React, and TypeScript
- Prisma and PostgreSQL
- NextAuth
- Tailwind CSS and Radix UI primitives
- pnpm

Setup instructions and the definitive environment-variable list will be added by the development tasks after dependency and runtime cleanup.

## Administrator bootstrap

After creating and verifying the intended administrator account, promote that existing user with the configured `DATABASE_URL`:

```bash
pnpm admin:promote --email administrator@example.invalid
```

The command is idempotent, requires a verified email, and never creates or embeds a password. Run it separately for each environment that needs its first administrator.

## License

This project remains licensed under the [GNU Affero General Public License v3.0](LICENSE).
