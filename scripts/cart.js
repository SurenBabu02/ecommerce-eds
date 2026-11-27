export const CART_STORAGE_KEY = 'ecommerce-cart';
export const CART_CHANGE_EVENT = 'ecommerce-cart-change';

function normalizeItem(id, value) {
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new Error(`Invalid stored quantity for ${id}.`);
    }
    return value === 0 ? null : {
      id,
      size: '',
      title: '',
      brand: '',
      category: '',
      categorySlug: '',
      price: null,
      image: '',
      quantity: value,
    };
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Invalid stored cart item for ${id}.`);
  }
  const quantity = Number(value.quantity);
  const price = value.price === null || value.price === undefined ? null : Number(value.price);
  if (!Number.isSafeInteger(quantity) || quantity < 1
    || (price !== null && (!Number.isFinite(price) || price < 0))) {
    throw new Error(`Invalid stored cart item for ${id}.`);
  }

  return {
    id: String(value.id || id),
    size: String(value.size || ''),
    title: String(value.title || ''),
    brand: String(value.brand || ''),
    category: String(value.category || ''),
    categorySlug: String(value.categorySlug || ''),
    price,
    image: String(value.image || ''),
    quantity,
  };
}

function normalizeCart(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Stored cart data must be an object.');
  }

  return Object.entries(value).reduce((cart, [id, item]) => {
    if (!id.trim()) throw new Error('Stored cart contains an empty product ID.');
    const normalized = normalizeItem(id, item);
    if (normalized) cart[id] = normalized;
    return cart;
  }, {});
}

function getCartKey(id, size = '') {
  const productId = String(id || '').trim();
  const selectedSize = String(size || '').trim();
  return selectedSize ? `${productId}::${encodeURIComponent(selectedSize)}` : productId;
}

function saveCart(cart) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  window.dispatchEvent(new Event(CART_CHANGE_EVENT));
}

export function readCart() {
  const savedCart = localStorage.getItem(CART_STORAGE_KEY);
  if (!savedCart) return {};

  let parsed;
  try {
    parsed = JSON.parse(savedCart);
  } catch (error) {
    throw new Error('Stored cart data is not valid JSON.', { cause: error });
  }

  const cart = normalizeCart(parsed);
  if (JSON.stringify(parsed) !== JSON.stringify(cart)) saveCart(cart);
  return cart;
}

function getProductDetails(product) {
  const id = String(product.id || '').trim();
  const title = String(product.title || product.name || '').trim();
  const price = Number(String(product.price).replace(/,/g, ''));
  if (!id || !title || !Number.isFinite(price) || price < 0) {
    throw new Error('Product details are incomplete; unable to add this item to the cart.');
  }

  return {
    id,
    size: String(product.size || '').trim(),
    title,
    brand: String(product.brand || ''),
    category: String(product.category || ''),
    categorySlug: String(product.categorySlug || ''),
    price,
    image: String(product.image || ''),
  };
}

export function addToCart(product, quantity = 1) {
  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    throw new Error('Cart quantity must be a positive whole number.');
  }
  const details = getProductDetails(product);
  const cart = readCart();
  const cartKey = getCartKey(details.id, details.size);
  const existing = cart[cartKey];
  const nextQuantity = (existing ? existing.quantity : 0) + quantity;
  if (!Number.isSafeInteger(nextQuantity)) {
    throw new Error('Cart quantity exceeds the supported limit.');
  }
  cart[cartKey] = { ...existing, ...details, quantity: nextQuantity };
  saveCart(cart);
}

export function setCartQuantity(id, quantity, size = '') {
  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    throw new Error('Cart quantity must be a positive whole number.');
  }
  const cart = readCart();
  const cartKey = getCartKey(id, size);
  if (!cart[cartKey]) throw new Error(`Product ${id} is not in the cart.`);
  cart[cartKey].quantity = quantity;
  saveCart(cart);
}

export function removeFromCart(id, size = '') {
  const cart = readCart();
  const cartKey = getCartKey(id, size);
  if (!cart[cartKey]) return;
  delete cart[cartKey];
  saveCart(cart);
}

export function clearCart() {
  saveCart({});
}

export function getCartCount(cart = readCart()) {
  return Object.values(cart).reduce((total, item) => {
    const count = total + item.quantity;
    if (!Number.isSafeInteger(count)) throw new Error('Total cart quantity exceeds the supported limit.');
    return count;
  }, 0);
}
