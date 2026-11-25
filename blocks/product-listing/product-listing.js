function createElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
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
    const savedCart = localStorage.getItem('ecommerce-cart');
    const cart = savedCart ? JSON.parse(savedCart) : {};
    if (!cart || typeof cart !== 'object' || Array.isArray(cart)) {
      throw new Error('Stored cart data must be an object.');
    }

    const quantity = Number(cart[product.id] || 0);
    if (!Number.isSafeInteger(quantity) || quantity < 0) {
      throw new Error(`Invalid stored quantity for ${product.id}.`);
    }

    cart[product.id] = quantity + 1;
    localStorage.setItem('ecommerce-cart', JSON.stringify(cart));
    cartStatus.textContent = `${product.name} added to cart.`;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Unable to add product to cart.', error);
    cartStatus.textContent = `Unable to add ${product.name} to cart.`;
  }
}

function createProductCard(product, imagePath, cartStatus) {
  const item = createElement('li', 'product-listing-item');
  const card = createElement('article', 'product-listing-card');
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
  details.append(name, meta, price, addButton);
  card.append(imageWrapper, details);
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

function sortProducts(products, sortOrder) {
  const sorted = [...products];
  if (sortOrder === 'price-asc') sorted.sort((a, b) => a.price - b.price);
  else if (sortOrder === 'price-desc') sorted.sort((a, b) => b.price - a.price);
  else if (sortOrder === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name));
  else sorted.sort((a, b) => a.featured - b.featured);
  return sorted;
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
  const heroCopy = createElement('div', 'product-listing-hero-copy');
  heroCopy.append(
    createElement('h1', '', category.title),
    createElement('p', '', category.description),
  );
  const heroImage = document.createElement('img');
  heroImage.src = category.heroImage;
  heroImage.alt = '';
  heroImage.loading = 'eager';
  const heroImageWrapper = createElement('div', 'product-listing-hero-image');
  heroImageWrapper.append(heroImage);
  hero.append(heroCopy, heroImageWrapper);

  const layout = createElement('div', 'product-listing-layout');
  const filters = createElement('aside', 'product-listing-filters');
  filters.setAttribute('aria-label', 'Filter products');
  filters.append(createElement('h2', 'product-listing-filters-title', 'Filter By'));
  filters.append(
    createFilterGroup('Category', 'category', category.filterCategories),
    createFilterGroup('Brand', 'brand', category.brands),
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
      (selectedCategories.size === 0 || selectedCategories.has(product.category))
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
      products.append(createProductCard(product, catalogue.productImage, cartStatus));
    });
    if (filtered.length === 0) {
      products.append(createElement('li', 'product-listing-empty', 'No products match these filters.'));
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
  block.replaceChildren(loading);

  try {
    const response = await fetch(new URL('./data/products.json', import.meta.url));
    if (!response.ok) throw new Error(`Product data request failed with status ${response.status}.`);
    const catalogue = await response.json();
    const pathSegments = window.location.pathname.split('/').filter(Boolean);
    const categorySlug = pathSegments[pathSegments.length - 1]?.toLowerCase();
    const category = catalogue.categories[categorySlug];
    if (!category) throw new Error(`No product data is configured for "${categorySlug}".`);
    if (!Array.isArray(category.products) || catalogue.pageSize < 1) {
      throw new Error(`Product data for "${categorySlug}" is invalid.`);
    }

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
