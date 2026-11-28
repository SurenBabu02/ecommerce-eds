import { addToCart as addProductToCart } from '../../scripts/cart.js';
import { getWishlist, toggleWishlist } from '../../scripts/account.js';

const SEARCH_PRICE_RANGES = [
  {
    value: '0-50', label: '$0 - $50', min: 0, max: 50,
  },
  {
    value: '50-100', label: '$50 - $100', min: 50, max: 100,
  },
  {
    value: '100-500', label: '$100 - $500', min: 100, max: 500,
  },
  {
    value: '500-plus', label: '$500+', min: 500, max: null,
  },
];

function createElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function reportInvalidBanner(categorySlug, reason) {
  // eslint-disable-next-line no-console
  console.warn(`Skipping authored banner for "${categorySlug}": ${reason}`);
}

function getAuthoredBanners(block) {
  const banners = {};
  [...block.children].forEach((row) => {
    const cells = [...row.children];
    if (cells[0]?.textContent.trim().toLowerCase() !== 'banner') return;
    if (cells.length < 3) {
      reportInvalidBanner('unknown', 'add a category slug and an image cell.');
      return;
    }

    const categorySlug = cells[1].textContent.trim().toLowerCase();
    const image = cells[2].querySelector('img');
    const imagePath = image?.getAttribute('src')?.trim();
    if (!/^[a-z0-9-]+$/.test(categorySlug)) {
      reportInvalidBanner(categorySlug || 'unknown', 'the category slug is invalid.');
      return;
    }
    if (!imagePath) return;
    if (banners[categorySlug]) {
      reportInvalidBanner(categorySlug, 'more than one banner was authored for this category.');
      return;
    }

    let imageUrl;
    try {
      imageUrl = new URL(imagePath, window.location.href);
    } catch {
      reportInvalidBanner(categorySlug, 'the image URL is invalid.');
      return;
    }
    if (!['http:', 'https:'].includes(imageUrl.protocol)) {
      reportInvalidBanner(categorySlug, 'the image URL must use HTTP or HTTPS.');
      return;
    }
    banners[categorySlug] = {
      src: imageUrl.href,
      alt: image.alt.trim(),
    };
  });
  return banners;
}

function createFilterGroup(title, group, options) {
  const fieldset = createElement('fieldset', 'product-listing-filter-group');
  const legend = createElement('legend', '', title);
  fieldset.append(legend);

  options.forEach((option, index) => {
    const item = typeof option === 'string' ? { value: option, label: option } : option;
    const label = createElement('label', 'product-listing-filter-option');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = item.value;
    input.dataset.filterGroup = group;
    input.id = `filter-${group}-${index}`;
    label.htmlFor = input.id;
    label.append(input, document.createTextNode(item.label));
    fieldset.append(label);
  });

  return fieldset;
}

function getSelectedValues(filters, group) {
  return new Set([...filters.querySelectorAll(`input[data-filter-group="${group}"]:checked`)]
    .map((input) => input.value));
}

function addToCart(product, cartStatus) {
  try {
    addProductToCart(product, 1);
    cartStatus.textContent = `${product.name} added to cart.`;
    window.location.assign('/pages/cart');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Unable to add product to cart.', error);
    cartStatus.textContent = `Unable to add ${product.name} to cart.`;
  }
}

function createProductCard(product, imagePath, cartStatus) {
  const item = createElement('li', 'product-listing-item');
  const card = createElement('article', 'product-listing-card');
  const detailUrl = `/pages/product-details?productId=${encodeURIComponent(product.id)}`
    + `&categorySlug=${encodeURIComponent(product.categorySlug)}`;
  const productLink = createElement('a', 'product-listing-card-link');
  productLink.href = detailUrl;
  const imageWrapper = createElement('div', 'product-listing-image');
  const image = document.createElement('img');
  image.src = imagePath;
  image.alt = product.name;
  image.loading = 'lazy';
  imageWrapper.append(image);

  const details = createElement('div', 'product-listing-details');
  const name = createElement('h2', 'product-listing-name', product.name);
  const meta = createElement('p', 'product-listing-meta', `${product.brand} | ${product.category}`);
  const price = createElement('p', 'product-listing-price', new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(product.price));
  const addButton = createElement('button', 'product-listing-add-button', 'Add to Cart');
  addButton.type = 'button';
  addButton.addEventListener('click', () => addToCart(product, cartStatus));
  const wishlistButton = createElement('button', 'product-listing-wishlist-button', '♡ Add to Wishlist');
  wishlistButton.type = 'button';
  wishlistButton.setAttribute('aria-pressed', 'false');
  const wishlistStatus = createElement('p', 'product-listing-wishlist-status');
  wishlistStatus.setAttribute('role', 'status');
  wishlistStatus.setAttribute('aria-live', 'polite');
  const updateWishlistButton = (isSaved) => {
    wishlistButton.setAttribute('aria-pressed', String(isSaved));
    wishlistButton.textContent = isSaved ? '♥ Added to Wishlist' : '♡ Add to Wishlist';
  };
  try {
    const isSaved = getWishlist().some(
      (savedProduct) => savedProduct.id === String(product.id),
    );
    updateWishlistButton(isSaved);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Unable to read wishlist.', error);
    wishlistButton.disabled = true;
    wishlistStatus.textContent = 'Wishlist is unavailable right now.';
  }
  wishlistButton.addEventListener('click', () => {
    try {
      const isSaved = toggleWishlist({
        ...product,
        title: product.name,
        image: imagePath,
      });
      updateWishlistButton(isSaved);
      wishlistStatus.textContent = isSaved
        ? `${product.name} saved to your wishlist.`
        : `${product.name} removed from your wishlist.`;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Unable to update wishlist.', error);
      wishlistStatus.textContent = 'Unable to update your wishlist.';
    }
  });
  details.append(name, meta, price);
  productLink.append(imageWrapper, details);
  const actions = createElement('div', 'product-listing-card-actions');
  actions.append(addButton, wishlistButton, wishlistStatus);
  card.append(productLink, actions);
  item.append(card);
  return item;
}

function createPagination(pageCount, currentPage, onPageChange) {
  const pagination = createElement('nav', 'product-listing-pagination');
  pagination.setAttribute('aria-label', 'Product pages');
  if (pageCount <= 1) {
    pagination.hidden = true;
    return pagination;
  }

  const addPageButton = (page, label, disabled = false) => {
    const button = createElement('button', 'product-listing-page-button', label);
    button.type = 'button';
    button.disabled = disabled;
    button.setAttribute('aria-label', label === 'Previous' || label === 'Next' ? label : `Page ${page}`);
    if (page === currentPage) button.setAttribute('aria-current', 'page');
    button.addEventListener('click', () => onPageChange(page));
    pagination.append(button);
  };

  addPageButton(currentPage - 1, 'Previous', currentPage === 1);
  for (let page = 1; page <= pageCount; page += 1) addPageButton(page, String(page));
  addPageButton(currentPage + 1, 'Next', currentPage === pageCount);
  return pagination;
}

function matchesSelectedPrice(product, selectedRanges, priceRanges) {
  if (selectedRanges.size === 0) return true;
  return priceRanges.some((range) => selectedRanges.has(range.value)
    && product.price >= range.min
    && (range.max === null || product.price < range.max));
}

async function fetchSheetPage(sheetUrl, offset) {
  const pageUrl = new URL(sheetUrl);
  pageUrl.searchParams.set('offset', String(offset));
  const response = await fetch(pageUrl);
  if (!response.ok) {
    throw new Error(`Product sheet request failed with status ${response.status}.`);
  }

  const page = await response.json();
  if (!page || typeof page !== 'object' || Array.isArray(page)) {
    throw new Error('The product sheet returned an invalid response.');
  }
  const total = Number(page.total);
  const limit = Number(page.limit);
  const pageOffset = Number(page.offset);
  if (!Array.isArray(page.data)
    || !Number.isSafeInteger(total)
    || total < 0
    || !Number.isSafeInteger(limit)
    || limit < 1
    || pageOffset !== offset
    || page.data.length > limit) {
    throw new Error('The product sheet returned an invalid page.');
  }

  return { data: page.data, total, limit };
}

async function fetchAllSheetProducts(sheetUrl, assetBaseUrl) {
  const products = [];
  let offset = 0;
  let total;

  do {
    // Product sheet offsets depend on the previous response length.
    // eslint-disable-next-line no-await-in-loop
    const page = await fetchSheetPage(sheetUrl, offset);
    if (total !== undefined && page.total !== total) {
      throw new Error('The product sheet changed while its pages were being loaded.');
    }
    total = page.total;
    if (page.data.length === 0 && products.length < total) {
      throw new Error('The product sheet returned no rows before its reported total.');
    }
    products.push(...page.data);
    offset += page.data.length;
  } while (products.length < total);

  if (products.length !== total) {
    throw new Error('The product sheet row count does not match its reported total.');
  }

  const populatedRows = products.map((row, index) => ({ row, index }))
    .filter(({ row, index }) => {
      if (!row || typeof row !== 'object' || Array.isArray(row)) {
        throw new Error(`Product sheet row ${index + 1} is invalid.`);
      }
      return Object.values(row).some((value) => (
        value !== null && value !== undefined && String(value).trim() !== ''
      ));
    });

  const ids = new Set();
  return populatedRows.map(({ row, index }) => {
    const id = String(row.id || '').trim();
    const categorySlug = String(row.categorySlug || '').trim().toLowerCase();
    const name = String(row.title || '').trim();
    const brand = String(row.brand || '').trim();
    const category = String(row.category || '').trim();
    const price = Number(String(row.price || '').replace(/,/g, ''));
    const featured = row.featured === undefined || row.featured === ''
      ? index + 1
      : Number(row.featured);
    const imagePath = String(row.image || '').trim();

    if (!id || !categorySlug || !name || !brand || !category
      || !Number.isFinite(price) || price < 0 || !Number.isFinite(featured)) {
      throw new Error(`Product sheet row ${index + 1} is missing valid product fields.`);
    }
    if (ids.has(id)) throw new Error(`Duplicate product ID "${id}" in product sheet.`);
    ids.add(id);

    return {
      id,
      categorySlug,
      name,
      description: String(row.description || '').trim(),
      brand,
      category,
      price,
      featured,
      image: imagePath ? new URL(imagePath, assetBaseUrl).href : '',
    };
  });
}

function sortProducts(products, sortOrder) {
  const sorted = [...products];
  if (sortOrder === 'price-asc') sorted.sort((a, b) => a.price - b.price);
  else if (sortOrder === 'price-desc') sorted.sort((a, b) => b.price - a.price);
  else if (sortOrder === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name));
  else sorted.sort((a, b) => a.featured - b.featured);
  return sorted;
}

function findProducts(products, searchTerm) {
  const query = searchTerm.toLowerCase();
  return products.filter((product) => [
    product.name,
    product.brand,
    product.category,
    product.categorySlug,
    product.description,
  ].join(' ').toLowerCase().includes(query));
}

function buildSortControl() {
  const label = createElement('label', 'product-listing-sort-label', 'Sort by');
  const select = createElement('select', 'product-listing-sort');
  select.setAttribute('aria-label', 'Sort products');
  [
    ['featured', 'Featured'],
    ['price-asc', 'Price: Low to High'],
    ['price-desc', 'Price: High to Low'],
    ['name', 'Name: A to Z'],
  ].forEach(([value, text]) => {
    const option = createElement('option', '', text);
    option.value = value;
    select.append(option);
  });
  label.append(select);
  return { label, select };
}

function buildPage(category, catalogue) {
  const page = createElement('div', 'product-listing-page');
  const breadcrumb = createElement('nav', 'product-listing-breadcrumb');
  breadcrumb.setAttribute('aria-label', 'Breadcrumb');
  const breadcrumbList = createElement('ol');
  const homeItem = createElement('li');
  const homeLink = createElement('a', '', 'Home');
  homeLink.href = '/';
  const categoryItem = createElement('li', '', category.title);
  categoryItem.setAttribute('aria-current', 'page');
  homeItem.append(homeLink);
  breadcrumbList.append(homeItem, categoryItem);
  breadcrumb.append(breadcrumbList);

  const hero = createElement('header', 'product-listing-hero');
  const banner = category.banner || (category.heroImage
    ? { src: category.heroImage, alt: '' }
    : null);
  if (banner?.src) {
    const heroImage = document.createElement('img');
    heroImage.src = banner.src;
    heroImage.alt = banner.alt || `${category.title} banner`;
    heroImage.loading = 'eager';
    const heroImageWrapper = createElement('div', 'product-listing-hero-image');
    heroImageWrapper.append(heroImage);
    hero.append(heroImageWrapper);
  } else {
    hero.classList.add('product-listing-hero-no-image');
    const heroCopy = createElement('div', 'product-listing-hero-copy');
    heroCopy.append(
      createElement('h1', '', category.title),
      createElement('p', '', category.description),
    );
    hero.append(heroCopy);
  }

  const layout = createElement('div', 'product-listing-layout');
  const filters = createElement('aside', 'product-listing-filters');
  filters.setAttribute('aria-label', 'Filter products');
  filters.append(createElement('h2', 'product-listing-filters-title', 'Filter By'));
  const filterCategories = category.searchTerm
    ? [...new Set(category.products.map((product) => product.categorySlug))]
      .map((slug) => ({
        value: slug,
        label: catalogue.categories[slug]?.title || slug,
      }))
    : [...new Set(category.products.map((product) => product.category))];
  const brands = [...new Set(category.products.map((product) => product.brand))];
  filters.append(
    createFilterGroup('Category', 'category', filterCategories),
    createFilterGroup('Brand', 'brand', brands),
    createFilterGroup('Price Range', 'price', category.priceRanges),
  );

  const results = createElement('section', 'product-listing-results');
  results.setAttribute('aria-label', `${category.title} products`);
  const toolbar = createElement('div', 'product-listing-toolbar');
  const resultCount = createElement('p', 'product-listing-result-count');
  const sortControl = buildSortControl();
  toolbar.append(resultCount, sortControl.label);
  const cartStatus = createElement('p', 'product-listing-cart-status');
  cartStatus.setAttribute('role', 'status');
  cartStatus.setAttribute('aria-live', 'polite');
  const products = createElement('ul', 'product-listing-products');
  const paginationWrapper = createElement('div', 'product-listing-pagination-wrapper');
  results.append(toolbar, cartStatus, products, paginationWrapper);
  layout.append(filters, results);
  page.append(breadcrumb, hero, layout);

  let currentPage = 1;
  const render = () => {
    const selectedCategories = getSelectedValues(filters, 'category');
    const selectedBrands = getSelectedValues(filters, 'brand');
    const selectedPrices = getSelectedValues(filters, 'price');
    const filtered = category.products.filter((product) => (
      (selectedCategories.size === 0
        || selectedCategories.has(category.searchTerm ? product.categorySlug : product.category))
      && (selectedBrands.size === 0 || selectedBrands.has(product.brand))
      && matchesSelectedPrice(product, selectedPrices, category.priceRanges)
    ));
    const sorted = sortProducts(filtered, sortControl.select.value);
    const pageCount = Math.ceil(sorted.length / catalogue.pageSize);
    currentPage = Math.max(1, Math.min(currentPage, pageCount || 1));
    const start = (currentPage - 1) * catalogue.pageSize;
    const visibleProducts = sorted.slice(start, start + catalogue.pageSize);

    resultCount.textContent = `${filtered.length} products`;
    products.replaceChildren();
    visibleProducts.forEach((product) => {
      products.append(createProductCard(
        product,
        product.image || catalogue.productImage,
        cartStatus,
      ));
    });
    if (filtered.length === 0) {
      const emptyMessage = category.searchTerm
        ? `No products found for "${category.searchTerm}".`
        : 'No products match these filters.';
      products.append(createElement('li', 'product-listing-empty', emptyMessage));
    }
    paginationWrapper.replaceChildren(createPagination(pageCount, currentPage, (nextPage) => {
      currentPage = nextPage;
      render();
    }));
  };

  filters.addEventListener('change', () => {
    currentPage = 1;
    render();
  });
  sortControl.select.addEventListener('change', () => {
    currentPage = 1;
    render();
  });
  render();
  return page;
}

export default async function decorate(block) {
  const loading = createElement('p', 'product-listing-loading', 'Loading products...');
  loading.setAttribute('role', 'status');

  try {
    const authoredBanners = getAuthoredBanners(block);
    const sourceLink = [...block.querySelectorAll('a[href]')]
      .find((link) => new URL(link.href).pathname.toLowerCase().endsWith('.json'));
    const linkedSheetUrl = sourceLink ? new URL(sourceLink.href) : null;
    const isHttpSheetUrl = linkedSheetUrl && ['http:', 'https:'].includes(linkedSheetUrl.protocol);
    const sheetUrl = isHttpSheetUrl
      ? new URL(`${linkedSheetUrl.pathname}${linkedSheetUrl.search}`, window.location.origin)
      : null;
    const assetBaseUrl = isHttpSheetUrl ? new URL('/', linkedSheetUrl) : null;
    block.replaceChildren(loading);

    if (!sheetUrl || !assetBaseUrl) {
      throw new Error('Add a published DA product sheet JSON link to the product-listing block.');
    }

    const [catalogueResponse, sheetProducts] = await Promise.all([
      fetch(new URL('./data/products.json', import.meta.url)),
      fetchAllSheetProducts(sheetUrl, assetBaseUrl),
    ]);
    if (!catalogueResponse.ok) {
      throw new Error(`Product listing configuration request failed with status ${catalogueResponse.status}.`);
    }
    const catalogue = await catalogueResponse.json();
    Object.keys(authoredBanners).forEach((slug) => {
      if (!catalogue.categories?.[slug]) {
        reportInvalidBanner(slug, 'no product listing configuration exists for this category.');
        delete authoredBanners[slug];
      }
    });
    const params = new URLSearchParams(window.location.search);
    const searchTerm = (params.get('search') || '').trim();
    if (searchTerm) {
      if (!Number.isSafeInteger(catalogue.pageSize) || catalogue.pageSize < 1
        || !catalogue.categories || typeof catalogue.categories !== 'object') {
        throw new Error('Product listing configuration is invalid.');
      }

      const products = findProducts(sheetProducts, searchTerm);
      const category = {
        title: 'Search results',
        description: `${products.length} products matching "${searchTerm}".`,
        products,
        priceRanges: SEARCH_PRICE_RANGES,
        searchTerm,
      };
      document.title = `Search results for ${searchTerm} | FlipKart`;
      block.replaceChildren(buildPage(category, catalogue));
      return;
    }

    const categorySlug = (
      params.get('categorySlug')
      || params.get('categories')
      || params.get('category')
      || 'footwear'
    ).trim().toLowerCase();
    const categoryConfig = catalogue.categories[categorySlug];
    if (!categoryConfig) throw new Error(`No product listing configuration exists for "${categorySlug}".`);
    if (!Number.isSafeInteger(catalogue.pageSize) || catalogue.pageSize < 1
      || !Array.isArray(categoryConfig.priceRanges)) {
      throw new Error(`Product listing configuration for "${categorySlug}" is invalid.`);
    }
    const products = sheetProducts.filter((product) => product.categorySlug === categorySlug);
    if (products.length === 0) throw new Error(`The product sheet has no products for "${categorySlug}".`);
    const category = {
      ...categoryConfig,
      banner: authoredBanners[categorySlug],
      products,
    };

    document.title = `${category.title} | FlipKart`;
    block.replaceChildren(buildPage(category, catalogue));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Unable to load the category product listing.', error);
    const message = createElement('p', 'product-listing-error', 'Products could not be loaded. Please try again later.');
    message.setAttribute('role', 'alert');
    block.replaceChildren(message);
  }
}
