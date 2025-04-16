# Contributing to Commit Navigator

Thank you for your interest in contributing to Commit Navigator! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

This project adheres to a Code of Conduct that all contributors are expected to follow. By participating, you are expected to uphold this code.

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue with the following information:
- Clear description of the bug
- Steps to reproduce
- Expected behavior
- Screenshots (if applicable)
- Environment information (OS, Node.js version, etc.)

### Suggesting Features

For feature suggestions:
- Check existing issues to avoid duplicates
- Create a new issue with a clear description of the proposed feature
- Explain why this feature would be useful to users

### Pull Requests

1. Fork the repository
2. Create a new branch for your changes
3. Make your changes
4. Run the tests and linting
5. Commit your changes with clear, descriptive messages
6. Push to your fork and submit a pull request

Please include:
- A clear description of what your PR does
- Any relevant issue numbers (e.g., "Fixes #123")
- Tests for new features or bug fixes

## Development Setup

1. Clone the repository
   ```
   git clone https://github.com/yourusername/cnav.git
   cd cnav
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Build the project
   ```
   npm run build
   ```

4. Create a local symlink to test globally
   ```
   npm link
   ```

5. Run tests
   ```
   npm test
   ```

## Style Guidelines

- Follow existing code style
- Use TypeScript features appropriately
- Document public APIs
- Write meaningful commit messages

## License

By contributing, you agree that your contributions will be licensed under the project's MIT License.
