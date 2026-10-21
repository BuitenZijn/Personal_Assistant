# @pa/prettier-config

Shared Prettier configuration for xplorer projects.

## Usage

### In package.json

```json
{
  "prettier": "@pa/prettier-config"
}
```

### In .prettierrc

```json
"@pa/prettier-config"
```

### In prettier.config.js

```js
module.exports = require("@pa/prettier-config");
```

## Configuration

This config includes:

- No semicolons
- Single quotes
- Trailing commas
- 2-space indentation
- 80 character line width
- LF line endings
- Avoid arrow function parentheses when possible

## Ignore Patterns

Use the included ignore patterns by copying from the `ignore` file:

```bash
cp node_modules/@pa/prettier-config/ignore .prettierignore
```

Or manually add the patterns to your `.prettierignore` file.
