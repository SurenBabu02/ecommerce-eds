# Ecommerce EDS storefront

A mobile-first commerce storefront built with Edge Delivery Services and Document Authoring.

## Commerce home page authoring

The page content is managed in Document Authoring. Build the home page from these authored sections:

1. A `hero` block with a background image, headline, short supporting copy, and primary link.
2. A `cards` block with four rows, each containing one image and a short category name. This shape is automatically decorated as a category grid; the `categories` variation can also be added explicitly.
3. A `cards products` block with product image, name, price, and a primary action per card.
4. An optional `hero promotion` block for a campaign banner.

The `/nav` document supplies the brand and navigation links (for example, Shop, Deals, About, and Help). Header search, account, and cart controls are added by the header block; account and cart pages can be authored at `/account` and `/cart`.

## Environments
- Preview: https://main--ecommerce-eds--SurenBabu02.aem.page/
- Live: https://main--ecommerce-eds--SurenBabu02.aem.live/

## Documentation

Before using the aem-boilerplate, we recommend you to go through the documentation on https://www.aem.live/docs/ and more specifically:
1. [Developer Tutorial](https://www.aem.live/developer/tutorial)
2. [The Anatomy of a Project](https://www.aem.live/developer/anatomy-of-a-project)
3. [Web Performance](https://www.aem.live/developer/keeping-it-100)
4. [Markup, Sections, Blocks, and Auto Blocking](https://www.aem.live/developer/markup-sections-blocks)

## Installation

```sh
npm i
```

## Linting

```sh
npm run lint
```

## Local development

1. Create a new repository based on the `aem-boilerplate` template
1. Add the [AEM Code Sync GitHub App](https://github.com/apps/aem-code-sync) to the repository
1. Install the [AEM CLI](https://github.com/adobe/helix-cli): `npm install -g @adobe/aem-cli`
1. Start AEM Proxy: `aem up` (opens your browser at `http://localhost:3000`)
1. Open the `ecommerce-eds` directory in your favorite IDE and start coding :)
