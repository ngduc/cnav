Project name: cnav (Commit Navigator)

This CLI will be published to npm registry so user can install or use it using "npx cnav"

Technology:
- always use "pnpm" to install dependencies
- use typescript and a good CLI framework, git library, LLM
- write unit tests to cover use cases

It can have the features below:
- cnav last: review the last commit
- cnav last 2: review the last 2 commits
- cnav last 7d: review last 7 days commits
- cnav changelog: update CHANGELOG file with latest changes from the last date in CHANGELOG
- cnav --review last 1: code review for the last commit

This tool uses LLM to understand about the project, using information it collects below:
- current project information, descriptions, tech stacks, package.json, pyproject.toml, requirements.txt, etc.
- tree representation of your directories and files
- git diff of the commits that user are interested in
- collect 'git diff' of the last 7 days for code review

Use cases:
- new user who wants to learn about the project in general
- document project's architectural patterns and design decisions, good for new team members or project handovers
- user who wants to understand recent changes
- developers: this tool can do code review on recent changes
- auto generate and update CHANGELOG (customizable: daily/weekly changes, default to 'weekly')
- security: pre-release audits, identify complex vulnerability patterns, catch potential issues or attacks
- for architects: give architectural change recommendations, identify pros vs. cons, compare tech choices
