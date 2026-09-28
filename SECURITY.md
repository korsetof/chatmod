# Security Policy

## Reporting a vulnerability

Please report suspected security vulnerabilities privately to the repository owner rather than opening a public issue.

Do not include passwords, tokens or other secrets in public issues, pull requests or documentation.

## Development rules

- Keep secrets in environment variables.
- Use strong, unique production secrets.
- Do not publish private infrastructure details unnecessarily.
- Review dependencies regularly.
- Run the project's checks before deployment.

If a credential was accidentally committed, rotate it immediately and remove it from the repository history where appropriate.
