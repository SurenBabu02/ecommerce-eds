import {
  CART_CHANGE_EVENT,
  CART_STORAGE_KEY,
  readCart,
  removeFromCart,
  setCartQuantity,
} from '../../scripts/cart.js';
import fetchProductsByIds from '../../scripts/product-data.js';

const PRODUCT_PLACEHOLDER = '/blocks/product-listing/images/product-placeholder.svg';

function createElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function formatPrice(price) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(price);
}

function resolveImage(imagePath, title) {
  const image = document.createElement('img');
  image.alt = title;
  image.loading = 'lazy';
  const placeholder = new URL(PRODUCT_PLACEHOLDER, window.location.origin).href;
  image.addEventListener('error', () => {
    if (image.src !== placeholder) image.src = placeholder;
  }, { once: true });

  try {
    const url = new URL(imagePath || placeholder, window.location.origin);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Unsupported image URL.');
    image.src = url.href;
  } catch (error) {
    image.src = placeholder;
  }
  return image;
}

function renderCart(block, productMap = new Map()) {
  const cart = readCart();
  const items = Object.values(cart);
  const page = createElement('div', 'cart-page');
  const heading = createElement('h1', 'cart-title', 'Shopping Cart');
  const status = createElement('p', 'cart-status');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  page.append(heading);

  if (items.length === 0) {
    const empty = createElement('div', 'cart-empty');
    empty.append(
      createElement('p', '', 'Your cart is empty.'),
      createElement('a', 'cart-continue', 'Continue Shopping'),
    );
    empty.querySelector('a').href = '/pages/products';
    page.append(empty);
    block.replaceChildren(page);
    return;
  }

  const layout = createElement('div', 'cart-layout');
  const list = createElement('ul', 'cart-items');
  let subtotal = 0;
  let unresolvedCount = 0;

  items.forEach((item) => {
    const product = productMap.get(item.id);
    const title = item.title || String(product?.title || `Product ${item.id}`);
    const itemLabel = item.size ? `${title}, size ${item.size}` : title;
    const brand = item.brand || String(product?.brand || '');
    const category = item.category || String(product?.category || '');
    const fallbackPrice = product?.price === undefined || product?.price === null
      || String(product.price).trim() === ''
      ? NaN
      : Number(String(product.price).replace(/,/g, ''));
    const priceValue = item.price ?? fallbackPrice;
    const price = Number.isFinite(priceValue) && priceValue >= 0 ? priceValue : null;
    const imagePath = item.image || String(product?.image || '');
    if (price === null) unresolvedCount += 1;
    else subtotal += price * item.quantity;

    const row = createElement('li', 'cart-item');
    const imageLink = createElement('a', 'cart-item-image');
    imageLink.href = `/pages/product-details?productId=${encodeURIComponent(item.id)}`;
    imageLink.append(resolveImage(imagePath, title));

    const details = createElement('div', 'cart-item-details');
    details.append(createElement('h2', 'cart-item-title', title));
    if (brand || category) {
      details.append(createElement('p', 'cart-item-meta', [brand, category].filter(Boolean).join(' · ')));
    }
    if (item.size) details.append(createElement('p', 'cart-item-size', `Size: ${item.size}`));
    details.append(createElement('p', 'cart-item-price', price === null ? 'Price unavailable' : formatPrice(price)));

    const quantity = createElement('div', 'cart-item-quantity');
    quantity.setAttribute('aria-label', `Quantity for ${itemLabel}`);
    const decrement = createElement('button', 'cart-quantity-button', '−');
    decrement.type = 'button';
    decrement.disabled = item.quantity <= 1;
    decrement.setAttribute('aria-label', `Decrease quantity of ${itemLabel}`);
    decrement.addEventListener('click', () => {
      try {
        setCartQuantity(item.id, item.quantity - 1, item.size);
      } catch (error) {
        status.textContent = 'Unable to update this item. Please try again.';
        // eslint-disable-next-line no-console
        console.error('Unable to update cart quantity.', error);
      }
    });
    const count = createElement('span', 'cart-item-count', String(item.quantity));
    count.setAttribute('aria-live', 'polite');
    const increment = createElement('button', 'cart-quantity-button', '+');
    increment.type = 'button';
    increment.setAttribute('aria-label', `Increase quantity of ${itemLabel}`);
    increment.addEventListener('click', () => {
      try {
        setCartQuantity(item.id, item.quantity + 1, item.size);
      } catch (error) {
        status.textContent = 'Unable to update this item. Please try again.';
        // eslint-disable-next-line no-console
        console.error('Unable to update cart quantity.', error);
      }
    });
    quantity.append(decrement, count, increment);

    const actions = createElement('div', 'cart-item-actions');
    const lineTotal = price === null ? '—' : formatPrice(price * item.quantity);
    actions.append(
      createElement('strong', 'cart-item-total', lineTotal),
      quantity,
    );
    const remove = createElement('button', 'cart-item-remove', '×');
    remove.type = 'button';
    remove.setAttribute('aria-label', `Remove ${itemLabel} from cart`);
    remove.addEventListener('click', () => {
      try {
        removeFromCart(item.id, item.size);
      } catch (error) {
        status.textContent = 'Unable to remove this item. Please try again.';
        // eslint-disable-next-line no-console
        console.error('Unable to remove cart item.', error);
      }
    });
    actions.append(remove);
    row.append(imageLink, details, actions);
    list.append(row);
  });

  if (unresolvedCount) {
    status.textContent = 'Some saved items no longer have product details. Their prices are not included.';
  }

  const summary = createElement('aside', 'cart-summary');
  summary.setAttribute('aria-label', 'Order summary');
  summary.append(createElement('h2', 'cart-summary-title', 'Order Summary'));
  const subtotalRow = createElement('div', 'cart-summary-row');
  subtotalRow.append(createElement('span', '', 'Subtotal'), createElement('strong', '', formatPrice(subtotal)));
  const shippingRow = createElement('div', 'cart-summary-row');
  shippingRow.append(createElement('span', '', 'Shipping'), createElement('span', '', 'Calculated at checkout'));
  const totalRow = createElement('div', 'cart-summary-total');
  totalRow.append(createElement('span', '', 'Estimated total'), createElement('strong', '', formatPrice(subtotal)));
  const checkout = createElement('a', 'cart-checkout', 'Proceed to Checkout');
  checkout.href = '/pages/checkout';
  const continueShopping = createElement('a', 'cart-continue', 'Continue Shopping');
  continueShopping.href = '/pages/products';
  summary.append(subtotalRow, shippingRow, totalRow, checkout, continueShopping);
  layout.append(list, summary);
  page.append(status, layout);
  block.replaceChildren(page);
}

export default async function decorate(block) {
  const loading = createElement('p', 'cart-loading', 'Loading your cart...');
  loading.setAttribute('role', 'status');
  block.replaceChildren(loading);

  let productMap = new Map();
  try {
    const cart = readCart();
    if (Object.values(cart).some((item) => !item.title || item.price === null)) {
      const missingDetails = Object.values(cart)
        .filter((item) => !item.title || item.price === null)
        .map((item) => item.id);
      productMap = await fetchProductsByIds(missingDetails);
    }
    renderCart(block, productMap);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Unable to load cart.', error);
    const message = createElement('p', 'cart-error', 'Unable to load your cart. Please refresh the page and try again.');
    message.setAttribute('role', 'alert');
    block.replaceChildren(message);
    return;
  }

  window.addEventListener(CART_CHANGE_EVENT, () => {
    try {
      renderCart(block, productMap);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Unable to refresh cart.', error);
    }
  });
  window.addEventListener('storage', (event) => {
    if (event.key !== CART_STORAGE_KEY && event.key !== null) return;
    try {
      renderCart(block, productMap);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Unable to refresh cart.', error);
    }
  });
}
