# Teleprompter CLI

This is a command-line interface (CLI) tool designed to work with the [Teleprompter](https://github.com/britt/teleprompter) project. It provides a convenient way to interact with the Teleprompter service, allowing you to manage LLM prompts and update them at runtime.

## Overview

The Teleprompter CLI is built to complement the Teleprompter service, which is a system for managing and versioning prompts for large language models (LLMs). This CLI tool enables users to perform various operations on prompts, such as listing, creating, updating, and rolling back versions, all from the command line.

## Features

- List all active prompts
- Create new versions of prompts
- List all versions of a specific prompt
- Rollback to a specific version of a prompt
- Fetch a prompt by ID

## Installation

To install the Teleprompter CLI, follow these steps:

1. Clone this repository
2. Navigate to the project directory
3. Run `npm install` to install dependencies
4. Run `npm link` to make the `tp` command available globally

## Usage

The general syntax for using the Teleprompter CLI is:

```
tp <command> [options]
```

Here are some example commands:

- List all prompts:
  ```
  tp list --url https://your-teleprompter-service-url.com
  ```

- Create a new version of a prompt:
  ```
  tp put myPrompt "This is the new prompt text" --url https://your-teleprompter-service-url.com
  ```

- List all versions of a prompt:
  ```
  tp versions myPrompt --url https://your-teleprompter-service-url.com
  ```

- Rollback to a specific version:
  ```
  tp rollback myPrompt 2 --url https://your-teleprompter-service-url.com
  ```

- Fetch a prompt by ID:
  ```
  tp get myPrompt --url https://your-teleprompter-service-url.com
  ```

## Authentication

The CLI supports authentication with Cloudflare Access for secure communication with the Teleprompter service. For local development, it uses a default token.

## Cloudflare Warp Access Control

Teleprompter uses Cloudflare Warp for access control. The authentication token retrieved from Cloudflare is stored in `$HOME/.teleprompter/token`. If the folder does not exist, it will be created. The token file permissions are set to 0600 to ensure it is private to the owner.

## Note on Authentication

Teleprompter has no authentication system of its own.

## Contributing

Contributions to the Teleprompter CLI are welcome! Please feel free to submit pull requests or create issues for bugs and feature requests.

## License

This project is licensed under the MIT License. The full license text can be found in the [LICENSE](LICENSE) file in the root directory of this repository.

## Related Projects

- [Teleprompter Service](https://github.com/britt/teleprompter): The backend service that this CLI interacts with.
