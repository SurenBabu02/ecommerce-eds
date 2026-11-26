export const ACCOUNT_STORAGE_KEY = 'ecommerce-account';

const EMPTY_ACCOUNT = {
  profile: { fullName: '', email: '', phone: '' },
  wishlist: [],
  orders: [],
  addresses: [],
};

function normalizeProduct(product) {
  if (!product || typeof product !== 'object' || Array.isArray(product)) {
    throw new Error('Stored account product is invalid.');
  }
  const id = String(product.id || '').trim();
  const title = String(product.title || product.name || '').trim();
  const price = Number(String(product.price).replace(/,/g, ''));
  if (!id || !title || !Number.isFinite(price) || price < 0) {
    throw new Error('Stored account product is missing valid product details.');
  }

  return {
    id,
    title,
    brand: String(product.brand || ''),
    category: String(product.category || ''),
    categorySlug: String(product.categorySlug || ''),
    price,
    image: String(product.image || ''),
  };
}

function normalizeAddress(address) {
  if (!address || typeof address !== 'object' || Array.isArray(address)) {
    throw new Error('Stored address is invalid.');
  }
  const normalized = {
    fullName: String(address.fullName || '').trim(),
    email: String(address.email || '').trim(),
    streetAddress: String(address.streetAddress || '').trim(),
    city: String(address.city || '').trim(),
    state: String(address.state || '').trim(),
    postalCode: String(address.postalCode || '').trim(),
    country: String(address.country || '').trim(),
  };
  if (Object.values(normalized).some((value) => !value)) {
    throw new Error('Stored address is missing required fields.');
  }
  return normalized;
}

function normalizeOrder(order) {
  if (!order || typeof order !== 'object' || Array.isArray(order)
    || !Array.isArray(order.items)) {
    throw new Error('Stored order is invalid.');
  }
  const id = String(order.id || '').trim();
  const placedAt = String(order.placedAt || '');
  const shippingMethod = String(order.shippingMethod || '');
  const paymentMethod = String(order.paymentMethod || '');
  const shippingCost = Number(order.shippingCost);
  const total = Number(order.total);
  if (!id || !Number.isFinite(Date.parse(placedAt))
    || !['standard', 'express'].includes(shippingMethod)
    || !['card', 'paypal'].includes(paymentMethod)
    || !Number.isFinite(shippingCost) || shippingCost < 0
    || !Number.isFinite(total) || total < 0) {
    throw new Error('Stored order is missing valid order details.');
  }

  const items = order.items.map((item) => {
    const product = normalizeProduct(item);
    const quantity = Number(item.quantity);
    if (!Number.isSafeInteger(quantity) || quantity < 1) {
      throw new Error('Stored order contains an invalid quantity.');
    }
    return { ...product, quantity };
  });
  if (items.length === 0) throw new Error('Stored order has no products.');

  return {
    id,
    placedAt,
    status: String(order.status || 'Placed'),
    shippingMethod,
    paymentMethod,
    shippingCost,
    total,
    address: normalizeAddress(order.address),
    items,
  };
}

function readAccount() {
  const savedAccount = localStorage.getItem(ACCOUNT_STORAGE_KEY);
  if (!savedAccount) {
    return {
      profile: { ...EMPTY_ACCOUNT.profile },
      wishlist: [],
      orders: [],
      addresses: [],
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(savedAccount);
  } catch (error) {
    throw new Error('Stored account data is not valid JSON.', { cause: error });
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Stored account data must be an object.');
  }
  const profile = parsed.profile || {};
  if (typeof profile !== 'object' || Array.isArray(profile)) {
    throw new Error('Stored profile is invalid.');
  }
  ['wishlist', 'orders', 'addresses'].forEach((key) => {
    if (parsed[key] !== undefined && !Array.isArray(parsed[key])) {
      throw new Error(`Stored account ${key} must be a list.`);
    }
  });

  return {
    profile: {
      fullName: String(profile.fullName || ''),
      email: String(profile.email || ''),
      phone: String(profile.phone || ''),
    },
    wishlist: (parsed.wishlist || []).map(normalizeProduct),
    orders: (parsed.orders || []).map(normalizeOrder),
    addresses: (parsed.addresses || []).map(normalizeAddress),
  };
}

function writeAccount(account) {
  localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(account));
}

export function getProfile() {
  return readAccount().profile;
}

export function saveProfile(profile) {
  const account = readAccount();
  account.profile = {
    fullName: String(profile.fullName || '').trim(),
    email: String(profile.email || '').trim(),
    phone: String(profile.phone || '').trim(),
  };
  if (!account.profile.fullName || !account.profile.email) {
    throw new Error('Name and email are required to save the profile.');
  }
  writeAccount(account);
}

export function getWishlist() {
  return readAccount().wishlist;
}

export function toggleWishlist(product) {
  const item = normalizeProduct(product);
  const account = readAccount();
  const index = account.wishlist.findIndex((savedItem) => savedItem.id === item.id);
  if (index >= 0) {
    account.wishlist.splice(index, 1);
    writeAccount(account);
    return false;
  }
  account.wishlist.unshift(item);
  writeAccount(account);
  return true;
}

export function getOrders() {
  return readAccount().orders;
}

export function getAddresses() {
  return readAccount().addresses;
}

export function recordOrder({
  items, address, shippingMethod, paymentMethod, shippingCost,
}) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Add products to the cart before placing an order.');
  }
  if (!['standard', 'express'].includes(shippingMethod)
    || !['card', 'paypal'].includes(paymentMethod)) {
    throw new Error('Select valid shipping and payment methods.');
  }
  const normalizedItems = items.map((item) => {
    const product = normalizeProduct(item);
    const quantity = Number(item.quantity);
    if (!Number.isSafeInteger(quantity) || quantity < 1) {
      throw new Error('Order contains an invalid product quantity.');
    }
    return { ...product, quantity };
  });
  const normalizedAddress = normalizeAddress(address);
  const normalizedShippingCost = Number(shippingCost);
  if (!Number.isFinite(normalizedShippingCost) || normalizedShippingCost < 0) {
    throw new Error('Shipping cost is invalid.');
  }
  const subtotal = normalizedItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  );
  if (!Number.isFinite(subtotal + normalizedShippingCost)) {
    throw new Error('Order total exceeds the supported limit.');
  }
  const placedAt = new Date().toISOString();
  const order = {
    id: `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    placedAt,
    status: 'Placed',
    shippingMethod,
    paymentMethod,
    shippingCost: normalizedShippingCost,
    total: subtotal + normalizedShippingCost,
    address: normalizedAddress,
    items: normalizedItems,
  };

  const account = readAccount();
  account.orders.unshift(order);
  const addressExists = account.addresses.some((savedAddress) => (
    savedAddress.streetAddress.toLowerCase() === normalizedAddress.streetAddress.toLowerCase()
      && savedAddress.city.toLowerCase() === normalizedAddress.city.toLowerCase()
      && savedAddress.state.toLowerCase() === normalizedAddress.state.toLowerCase()
      && savedAddress.postalCode.toLowerCase() === normalizedAddress.postalCode.toLowerCase()
      && savedAddress.country.toLowerCase() === normalizedAddress.country.toLowerCase()
  ));
  if (!addressExists) account.addresses.unshift(normalizedAddress);
  writeAccount(account);
  return order;
}
