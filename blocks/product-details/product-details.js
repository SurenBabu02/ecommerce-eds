import { addToCart as addProductToCart } from '../../scripts/cart.js';
import { getWishlist, toggleWishlist } from '../../scripts/account.js';

const DEFAULT_PRODUCT_SHEET = '/pages/categories/footwear.json';
const PRODUCT_PLACEHOLDER = '/blocks/product-listing/images/product-placeholder.svg';
const FOOTWEAR_SIZES = ['3', '4', '5', '6', '7', '8', '9', '10', '11'];
const CLOTHING_SIZES = ['XS', 'S', 'M', 'L', 'XL'];
let sizeSelectorId = 0;

function createElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function getProductSheet(sheetHref) {
  const linkedSheetUrl = sheetHref
    ? new URL(sheetHref)
    : new URL(DEFAULT_PRODUCT_SHEET, window.location.origin);
  if (!['http:', 'https:'].includes(linkedSheetUrl.protocol)) {
    throw new Error('The product sheet link must use HTTP or HTTPS.');
  }

  return {
    sheetUrl: new URL(`${linkedSheetUrl.pathname}${linkedSheetUrl.search}`, window.location.origin),
    assetBaseUrl: new URL('/', linkedSheetUrl),
  };
}

async function fetchProductRows(sheetUrl) {
  const rows = [];
  let offset = 0;
  let total;

  do {
    const pageUrl = new URL(sheetUrl);
    pageUrl.searchParams.set('offset', String(offset));
    // Product sheet offsets depend on the previous response length.
    // eslint-disable-next-line no-await-in-loop
    const response = await fetch(pageUrl);
    if (!response.ok) {
      throw new Error(`Product sheet request failed with status ${response.status}.`);
    }

    // eslint-disable-next-line no-await-in-loop
    const page = await response.json();
    const pageTotal = Number(page?.total);
    const limit = Number(page?.limit);
    const pageOffset = Number(page?.offset);
    if (!page || typeof page !== 'object' || Array.isArray(page)
      || !Array.isArray(page.data)
      || !Number.isSafeInteger(pageTotal)
      || pageTotal < 0
      || !Number.isSafeInteger(limit)
      || limit < 1
      || pageOffset !== offset
      || page.data.length > limit) {
      throw new Error('The product sheet returned an invalid page.');
    }
    if (total !== undefined && pageTotal !== total) {
      throw new Error('The product sheet changed while its pages were being loaded.');
    }
    total = pageTotal;
    if (page.data.length === 0 && rows.length < total) {
      throw new Error('The product sheet returned no rows before its reported total.');
    }

    rows.push(...page.data);
    offset += page.data.length;
  } while (rows.length < total);

  if (rows.length !== total) {
    throw new Error('The product sheet row count does not match its reported total.');
  }

  return rows.filter((row, index) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      throw new Error(`Product sheet row ${index + 1} is invalid.`);
    }
    return Object.values(row).some((value) => (
      value !== null && value !== undefined && String(value).trim() !== ''
    ));
  });
}

function getProductImages(product, assetBaseUrl) {
  const imageFields = Object.entries(product)
    .filter(([field]) => /^image\d*$/i.test(field))
    .sort(([fieldA], [fieldB]) => {
      const orderA = Number(fieldA.match(/\d+$/)?.[0] || 1);
      const orderB = Number(fieldB.match(/\d+$/)?.[0] || 1);
      return orderA - orderB;
    });
  const images = [...new Set(imageFields
    .map(([, value]) => String(value || '').trim())
    .filter(Boolean)
    .map((imagePath) => new URL(imagePath, assetBaseUrl).href))];
  return images.length ? images : [PRODUCT_PLACEHOLDER];
}

function getProductImage(product, assetBaseUrl) {
  return getProductImages(product, assetBaseUrl)[0];
}

function setProductImage(image, imageUrl, alt) {
  const placeholderUrl = new URL(PRODUCT_PLACEHOLDER, window.location.origin).href;
  image.alt = alt;
  image.addEventListener('error', () => {
    if (image.src !== placeholderUrl) image.src = placeholderUrl;
  }, { once: true });
  image.src = imageUrl;
}

function formatPrice(price) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(price));
}

function getProductSizeOptions(product) {
  const category = String(product.category || '').trim().toLowerCase();
  const categorySlug = String(product.categorySlug || '').trim().toLowerCase();
  if (categorySlug === 'footwear' || /\b(shoes?|sneakers?|trainers?)\b/.test(category)) {
    return FOOTWEAR_SIZES;
  }
  if (categorySlug === 'fashion' && /\b(clothing|apparel)\b/.test(category)) {
    return CLOTHING_SIZES;
  }
  return null;
}

function createSizeSelector(product, sizes, onSelect) {
  sizeSelectorId += 1;
  const fieldset = createElement('fieldset', 'pdp-size-selector');
  const legend = createElement('legend', '', 'SELECT SIZE');
  const chartButton = createElement('button', 'pdp-size-chart-button', 'SIZE CHART ›');
  chartButton.type = 'button';
  chartButton.setAttribute('aria-haspopup', 'dialog');
  legend.append(chartButton);
  fieldset.append(legend);

  const options = createElement('div', 'pdp-size-options');
  sizes.forEach((size, index) => {
    const optionId = `pdp-size-${sizeSelectorId}-${index}`;
    const label = createElement('label', 'pdp-size-option');
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = `pdp-size-${sizeSelectorId}`;
    input.id = optionId;
    input.value = size;
    const value = createElement('span', '', size);
    label.htmlFor = optionId;
    label.append(input, value);
    input.addEventListener('change', () => onSelect(size));
    options.append(label);
  });
  fieldset.append(options);

  const dialog = document.createElement('dialog');
  dialog.className = 'pdp-size-chart';
  dialog.setAttribute('aria-labelledby', `pdp-size-chart-title-${sizeSelectorId}`);
  const chartHeading = createElement('h2', '', 'Available Sizes');
  chartHeading.id = `pdp-size-chart-title-${sizeSelectorId}`;
  const chartDescription = createElement(
    'p',
    '',
    `Available sizes for ${String(product.category || 'this product').toLowerCase()}.`,
  );
  const sizeList = createElement('ul', 'pdp-size-chart-list');
  sizes.forEach((size) => sizeList.append(createElement('li', '', size)));
  const closeButton = createElement('button', 'pdp-size-chart-close', 'Close');
  closeButton.type = 'button';
  closeButton.addEventListener('click', () => dialog.close());
  dialog.append(chartHeading, chartDescription, sizeList, closeButton);
  chartButton.addEventListener('click', () => dialog.showModal());

  return { fieldset, dialog };
}

function addToCart(product, quantity, status, size = '') {
  try {
    addProductToCart({ ...product, size }, quantity);
    status.textContent = `${product.title}${size ? ` (size ${size})` : ''} added to cart.`;
    window.location.assign('/pages/cart');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Unable to add product to cart.', error);
    status.textContent = `Unable to add ${product.title} to cart.`;
  }
}

function createProductLink(product, imageUrl) {
  const link = createElement('a', 'related-card-link');
  const url = new URL('/pages/product-details', window.location.origin);
  url.searchParams.set('productId', product.id);
  link.href = `${url.pathname}${url.search}`;

  const image = document.createElement('img');
  setProductImage(image, imageUrl, product.title);
  image.loading = 'lazy';
  link.append(
    image,
    createElement('h3', 'related-card-title', product.title),
    createElement('p', 'related-card-price', formatPrice(product.price)),
  );
  return link;
}

function updateBreadcrumb(block, product) {
  const breadcrumb = block.closest('main')?.querySelector('.breadcrumb > div > div');
  if (!breadcrumb) return;

  const homeLink = createElement('a', '', 'Home');
  homeLink.href = '/';
  const categorySlug = String(product.categorySlug || '').trim().toLowerCase();
  const categoryLabel = categorySlug
    ? `${categorySlug[0].toUpperCase()}${categorySlug.slice(1)}`
    : String(product.category || 'Products');
  const categoryLink = createElement('a', '', categoryLabel);
  const categoryUrl = new URL('/pages/products', window.location.origin);
  if (categorySlug) categoryUrl.searchParams.set('categorySlug', categorySlug);
  categoryLink.href = `${categoryUrl.pathname}${categoryUrl.search}`;

  breadcrumb.replaceChildren(
    homeLink,
    document.createTextNode(' › '),
    categoryLink,
    document.createTextNode(' › '),
    document.createTextNode(String(product.title || 'Product')),
  );
}

function createProductPage(block, product, relatedProducts, assetBaseUrl) {
  const title = String(product.title || 'Product');
  const imageUrls = getProductImages(product, assetBaseUrl);
  const cartStatus = createElement('p', 'pdp-cart-status');
  cartStatus.setAttribute('role', 'status');
  cartStatus.setAttribute('aria-live', 'polite');

  const container = createElement('div', 'pdp-container');
  const gallery = createElement('div', 'pdp-gallery');
  const mainImage = document.createElement('img');
  setProductImage(mainImage, imageUrls[0], title);
  mainImage.loading = 'eager';
  const mainImageWrapper = createElement('div', 'pdp-main-image');
  mainImageWrapper.append(mainImage);

  const thumbnails = createElement('div', 'pdp-thumbnails');
  thumbnails.setAttribute('role', 'group');
  thumbnails.setAttribute('aria-label', `Images of ${title}`);
  imageUrls.forEach((imageUrl, index) => {
    const thumbnail = createElement('button', 'pdp-thumbnail');
    thumbnail.type = 'button';
    thumbnail.setAttribute('aria-label', `Show image ${index + 1} of ${title}`);
    thumbnail.setAttribute('aria-pressed', String(index === 0));
    const thumbnailImage = document.createElement('img');
    setProductImage(thumbnailImage, imageUrl, '');
    thumbnail.append(thumbnailImage);
    thumbnails.append(thumbnail);
    thumbnail.addEventListener('click', () => {
      mainImage.src = imageUrl;
      mainImage.alt = `${title} image ${index + 1}`;
      thumbnails.querySelectorAll('.pdp-thumbnail').forEach((button, buttonIndex) => {
        button.setAttribute('aria-pressed', String(buttonIndex === index));
      });
    });
  });
  gallery.append(mainImageWrapper, thumbnails);

  const info = createElement('div', 'pdp-info');
  info.append(
    createElement('p', 'pdp-brand', String(product.brand || '')),
    createElement('h1', 'pdp-title', title),
  );
  const rating = createElement('div', 'pdp-rating');
  rating.setAttribute('aria-label', 'Rated 5 out of 5 stars');
  rating.append(
    createElement('span', 'pdp-stars', '★★★★★'),
    createElement('span', 'pdp-review-count', '(120 reviews)'),
  );
  info.append(
    rating,
    createElement('p', 'pdp-price', formatPrice(product.price)),
    createElement('p', 'pdp-description', product.description || 'Product description is not available.'),
  );

  const quantityLabel = createElement('label', 'pdp-quantity-label', 'Quantity');
  const quantityInput = document.createElement('input');
  quantityInput.type = 'number';
  quantityInput.id = 'pdp-quantity';
  quantityInput.min = '1';
  quantityInput.step = '1';
  quantityInput.value = '1';
  quantityInput.setAttribute('aria-label', 'Quantity');
  quantityLabel.htmlFor = quantityInput.id;
  const quantityControls = createElement('div', 'pdp-quantity-controls');
  const decrement = createElement('button', 'pdp-quantity-button', '-');
  decrement.type = 'button';
  decrement.setAttribute('aria-label', 'Decrease quantity');
  const increment = createElement('button', 'pdp-quantity-button', '+');
  increment.type = 'button';
  increment.setAttribute('aria-label', 'Increase quantity');
  decrement.addEventListener('click', () => {
    quantityInput.value = String(Math.max(1, Number(quantityInput.value) - 1));
  });
  increment.addEventListener('click', () => {
    quantityInput.value = String(Math.max(1, Number(quantityInput.value) || 1) + 1);
  });
  quantityControls.append(decrement, quantityInput, increment);
  const quantity = createElement('div', 'pdp-quantity');
  quantity.append(quantityLabel, quantityControls);

  const addButton = createElement('button', 'pdp-add-cart', 'Add to Cart');
  addButton.type = 'button';
  let selectedSize = '';
  const sizeOptions = getProductSizeOptions(product);
  const sizeControls = sizeOptions
    ? createSizeSelector(product, sizeOptions, (size) => {
      selectedSize = size;
      addButton.disabled = false;
    })
    : null;
  addButton.disabled = Boolean(sizeControls);
  addButton.addEventListener('click', () => {
    if (sizeControls && !selectedSize) {
      cartStatus.textContent = 'Select a size before adding this item.';
      sizeControls.fieldset.querySelector('input').focus();
      return;
    }
    const requestedQuantity = Number(quantityInput.value);
    if (!Number.isSafeInteger(requestedQuantity) || requestedQuantity < 1) {
      cartStatus.textContent = 'Enter a quantity of 1 or more.';
      quantityInput.focus();
      return;
    }
    addToCart(product, requestedQuantity, cartStatus, selectedSize);
  });

  const wishlist = createElement('button', 'wishlist-link', '♡ Add to Wishlist');
  wishlist.type = 'button';
  wishlist.setAttribute('aria-pressed', 'false');
  const wishlistStatus = createElement('p', 'pdp-wishlist-status');
  wishlistStatus.setAttribute('role', 'status');
  wishlistStatus.setAttribute('aria-live', 'polite');
  const updateWishlistButton = (isSaved) => {
    wishlist.setAttribute('aria-pressed', String(isSaved));
    wishlist.textContent = isSaved ? '♥ Added to Wishlist' : '♡ Add to Wishlist';
  };
  try {
    updateWishlistButton(getWishlist().some((item) => item.id === String(product.id)));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Unable to read wishlist.', error);
    wishlist.disabled = true;
    wishlistStatus.textContent = 'Wishlist is unavailable right now.';
  }
  wishlist.addEventListener('click', () => {
    try {
      const isSaved = toggleWishlist(product);
      updateWishlistButton(isSaved);
      wishlistStatus.textContent = isSaved
        ? `${product.title} saved to your wishlist.`
        : `${product.title} removed from your wishlist.`;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Unable to update wishlist.', error);
      wishlistStatus.textContent = 'Unable to update your wishlist.';
    }
  });
  info.append(quantity);
  if (sizeControls) info.append(sizeControls.fieldset);
  info.append(addButton, wishlist, wishlistStatus);
  container.append(gallery, info);

  const accordion = createElement('section', 'pdp-accordion');
  accordion.setAttribute('aria-label', 'Product information');
  const details = document.createElement('details');
  details.open = true;
  const detailsSummary = createElement('summary', '', 'Product Details');
  details.append(detailsSummary, createElement(
    'p',
    '',
    product.description || 'Product description is not available.',
  ));

  const specifications = document.createElement('details');
  const specificationsSummary = createElement('summary', '', 'Specifications');
  const specificationList = createElement('dl', 'pdp-specifications');
  [
    ['Brand', product.brand],
    ['Category', product.category],
    ['Product ID', product.id],
  ].forEach(([label, value]) => {
    if (!value) return;
    specificationList.append(
      createElement('dt', '', label),
      createElement('dd', '', String(value)),
    );
  });
  specifications.append(specificationsSummary, specificationList);

  const shipping = document.createElement('details');
  const shippingSummary = createElement('summary', '', 'Shipping & Returns');
  shipping.append(
    shippingSummary,
    createElement(
      'p',
      '',
      product.shipping || 'Shipping and return information is available at checkout.',
    ),
  );
  accordion.append(details, specifications, shipping);

  const relatedSection = createElement('section', 'related-products');
  relatedSection.setAttribute('aria-label', 'Related products');
  relatedSection.append(createElement('h2', '', 'Related Products'));
  const relatedGrid = createElement('div', 'related-grid');
  relatedProducts.forEach((relatedProduct) => {
    const article = createElement('article', 'related-card');
    article.append(createProductLink(
      relatedProduct,
      getProductImage(relatedProduct, assetBaseUrl),
    ));
    const relatedSizes = getProductSizeOptions(relatedProduct);
    const relatedAddButton = createElement(
      'button',
      'related-add-cart',
      relatedSizes ? 'Select Size' : 'Add to Cart',
    );
    relatedAddButton.type = 'button';
    if (relatedSizes) {
      relatedAddButton.addEventListener('click', () => {
        const url = new URL('/pages/product-details', window.location.origin);
        url.searchParams.set('productId', relatedProduct.id);
        window.location.assign(`${url.pathname}${url.search}`);
      });
    } else {
      relatedAddButton.addEventListener('click', () => addToCart(relatedProduct, 1, cartStatus));
    }
    article.append(relatedAddButton);
    relatedGrid.append(article);
  });
  relatedSection.append(relatedGrid);

  block.replaceChildren(container, cartStatus, accordion, relatedSection);
  if (sizeControls) block.append(sizeControls.dialog);
  updateBreadcrumb(block, product);
}

export default async function decorate(block) {
  const sourceLink = [...block.querySelectorAll('a[href]')]
    .find((link) => new URL(link.href).pathname.toLowerCase().endsWith('.json'));
  const sheetHref = sourceLink?.href;
  const loading = createElement('p', 'pdp-loading', 'Loading product...');
  loading.setAttribute('role', 'status');
  block.replaceChildren(loading);

  try {
    const productId = new URLSearchParams(window.location.search).get('productId');
    if (!productId) {
      throw new Error('The product detail URL is missing a productId.');
    }

    const { sheetUrl, assetBaseUrl } = getProductSheet(sheetHref);
    const rows = await fetchProductRows(sheetUrl);
    const product = rows.find((row) => String(row.id || '').trim() === productId);
    if (!product) throw new Error(`Product "${productId}" was not found in the product sheet.`);

    const productCategory = String(product.categorySlug || '').trim().toLowerCase();
    const relatedProducts = rows
      .filter((row) => (
        row.id !== product.id
        && String(row.categorySlug || '').trim().toLowerCase() === productCategory
      ))
      .slice(0, 3);

    document.title = `${product.title || 'Product'} | FlipKart`;
    createProductPage(block, product, relatedProducts, assetBaseUrl);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Unable to load the product details.', error);
    const message = createElement('p', 'pdp-error', 'Unable to load product details. Please try again later.');
    message.setAttribute('role', 'alert');
    block.replaceChildren(message);
  }
}
