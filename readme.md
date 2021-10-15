### Structure

```
/scripts            - Typescript code for extension
/img                - Image assets for extension and description

details.md          - Description to be shown in marketplace
vss-extension.json  - Extension manifest
```

### Version History

- **2.0.131**: Batch update

### Usage

1. Clone the repository
2. `npm install` to install required local dependencies
3. Add `"baseUri": "https://localhost:3000"` to `configs/dev.json`
4. Follow instructions to publish a dev version and install on your own organization

#### npm run

- `clean` for deleting build artifacts
- `build:dev` for building a dev version VSIX
- `build` for building a prod version VSIX
- `debug` for launching local webpack dev server

