import {
  ACCOUNT_STORAGE_KEY,
  getAddresses,
  getOrders,
  getProfile,
  getWishlist,
  saveProfile,
  toggleWishlist,
} from '../../scripts/account.js';

const PRODUCT_PLACEHOLDER = '/blocks/product-listing/images/product-placeholder.svg';
const ACCOUNT_TABS = [
  ['profile', 'Profile'],
  ['orders', 'My Orders'],
  ['wishlist', 'Wishlist'],
  ['addresses', 'Addresses'],
  ['settings', 'Account Settings'],
  ['signout', 'Sign Out'],
];

const TAB_PATHS = {
  profile: ['M20 21a8 8 0 0 0-16 0', 'M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z'],
  orders: ['M6 3h12v18l-3-2-3 2-3-2-3 2V3Z', 'M9 8h6', 'M9 12h6'],
  wishlist: ['M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z'],
  addresses: ['M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z', 'M12 10a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z'],
  settings: ['M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z', 'm19.4 15 .1.1a1.8 1.8 0 0 1-2.5 2.5l-.1-.1a1.8 1.8 0 0 0-3 .9v.2a1.8 1.8 0 0 1-3.6 0v-.2a1.8 1.8 0 0 0-3-.9l-.1.1a1.8 1.8 0 0 1-2.5-2.5l.1-.1a1.8 1.8 0 0 0-.9-3h-.2a1.8 1.8 0 0 1 0-3.6h.2a1.8 1.8 0 0 0 .9-3l-.1-.1a1.8 1.8 0 0 1 2.5-2.5l.1.1a1.8 1.8 0 0 0 3-.9v-.2a1.8 1.8 0 0 1 3.6 0v.2a1.8 1.8 0 0 0 3 .9l.1-.1a1.8 1.8 0 0 1 2.5 2.5l-.1.1a1.8 1.8 0 0 0 .9 3h.2a1.8 1.8 0 0 1 0 3.6h-.2a1.8 1.8 0 0 0-.9 3Z'],
  signout: ['M10 17l5-5-5-5', 'M15 12H3', 'M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7'],
};

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

function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

function createIcon(name) {
  const namespace = 'http://www.w3.org/2000/svg';
  const icon = document.createElementNS(namespace, 'svg');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('aria-hidden', 'true');
  icon.setAttribute('focusable', 'false');
  TAB_PATHS[name].forEach((data) => {
    const path = document.createElementNS(namespace, 'path');
    path.setAttribute('d', data);
    icon.append(path);
  });
  return icon;
}

function createAccountInput(labelText, name, type, value, autocomplete) {
  const field = createElement('div', 'account-field');
  const id = `account-${name}`;
  const label = createElement('label', '', labelText);
  label.htmlFor = id;
  const input = document.createElement('input');
  input.id = id;
  input.name = name;
  input.type = type;
  input.value = value;
  input.placeholder = labelText;
  input.autocomplete = autocomplete;
  if (name !== 'phone') input.required = true;
  field.append(label, input);
  return field;
}

function createProductImage(imagePath, title) {
  const image = document.createElement('img');
  image.alt = title;
  image.loading = 'lazy';
  const placeholder = new URL(PRODUCT_PLACEHOLDER, window.location.origin).href;
  image.addEventListener('error', () => {
    if (image.src !== placeholder) image.src = placeholder;
  }, { once: true });

  try {
    const url = new URL(imagePath || placeholder, window.location.origin);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Unsupported product image URL.');
    image.src = url.href;
  } catch (error) {
    image.src = placeholder;
  }
  return image;
}

function createProductLink(product) {
  const link = createElement('a', 'account-product-image');
  const url = new URL('/pages/product-details', window.location.origin);
  url.searchParams.set('productId', product.id);
  if (product.categorySlug) url.searchParams.set('categorySlug', product.categorySlug);
  link.href = `${url.pathname}${url.search}`;
  link.append(createProductImage(product.image, product.title));
  return link;
}

function createProductRow(product, quantity, options = {}) {
  const row = createElement('li', 'account-product-row');
  const details = createElement('div', 'account-product-details');
  const title = createElement('a', 'account-product-title', product.title);
  const url = new URL('/pages/product-details', window.location.origin);
  url.searchParams.set('productId', product.id);
  if (product.categorySlug) url.searchParams.set('categorySlug', product.categorySlug);
  title.href = `${url.pathname}${url.search}`;
  details.append(title);
  if (product.brand) details.append(createElement('p', 'account-product-brand', product.brand));
  if (quantity) details.append(createElement('p', 'account-product-quantity', `Quantity: ${quantity}`));
  details.append(createElement(
    'strong',
    'account-product-price',
    formatPrice(product.price * (quantity || 1)),
  ));
  row.append(createProductLink(product), details);

  if (options.onRemove) {
    const remove = createElement('button', 'account-product-remove', 'Remove');
    remove.type = 'button';
    remove.setAttribute('aria-label', `Remove ${product.title} from wishlist`);
    remove.addEventListener('click', options.onRemove);
    row.append(remove);
  }
  return row;
}

function renderProfile(panel) {
  const profile = getProfile();
  const content = createElement('section', 'account-profile');
  content.append(createElement('h2', 'account-panel-title', 'Profile Information'));
  const avatar = createElement('div', 'account-avatar');
  avatar.setAttribute('aria-hidden', 'true');
  avatar.append(createElement('span', 'account-avatar-head'), createElement('span', 'account-avatar-body'));
  const form = document.createElement('form');
  form.className = 'account-profile-form';
  const status = createElement('p', 'account-status');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  form.append(
    avatar,
    createAccountInput('Full Name', 'fullName', 'text', profile.fullName, 'name'),
    createAccountInput('Email', 'email', 'email', profile.email, 'email'),
    createAccountInput('Phone', 'phone', 'tel', profile.phone, 'tel'),
  );
  const save = createElement('button', 'account-save', 'Save Changes');
  save.type = 'submit';
  form.append(save, status);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(form);
    try {
      saveProfile({
        fullName: data.get('fullName'),
        email: data.get('email'),
        phone: data.get('phone'),
      });
      status.textContent = 'Profile saved.';
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Unable to save profile.', error);
      status.textContent = 'Unable to save your profile. Please try again.';
    }
  });
  content.append(form);
  panel.replaceChildren(content);
}

function renderOrders(panel) {
  const content = createElement('section', 'account-orders');
  content.append(createElement('h2', 'account-panel-title', 'My Orders'));
  const orders = getOrders();
  if (orders.length === 0) {
    content.append(createElement('p', 'account-empty', 'You have not placed any orders yet.'));
    panel.replaceChildren(content);
    return;
  }

  const orderList = createElement('div', 'account-order-list');
  orders.forEach((order) => {
    const card = createElement('article', 'account-order');
    const heading = createElement('div', 'account-order-heading');
    const orderInfo = createElement('div', 'account-order-info');
    orderInfo.append(
      createElement('strong', '', `Order ${order.id}`),
      createElement('span', '', formatDate(order.placedAt)),
    );
    const status = createElement('span', 'account-order-status', order.status);
    heading.append(orderInfo, status);
    const items = createElement('ul', 'account-order-items');
    order.items.forEach((item) => items.append(createProductRow(item, item.quantity)));
    const total = createElement('p', 'account-order-total');
    total.append(
      createElement('span', '', 'Total'),
      createElement('strong', '', formatPrice(order.total)),
    );
    card.append(heading, items, total);
    orderList.append(card);
  });
  content.append(orderList);
  panel.replaceChildren(content);
}

function renderWishlist(panel, rerender) {
  const content = createElement('section', 'account-wishlist');
  content.append(createElement('h2', 'account-panel-title', 'Wishlist'));
  const wishlist = getWishlist();
  if (wishlist.length === 0) {
    content.append(createElement('p', 'account-empty', 'Your wishlist is empty.'));
    panel.replaceChildren(content);
    return;
  }

  const list = createElement('ul', 'account-product-list');
  wishlist.forEach((product) => {
    list.append(createProductRow(product, 0, {
      onRemove: () => {
        try {
          toggleWishlist(product);
          rerender();
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Unable to remove wishlist item.', error);
        }
      },
    }));
  });
  content.append(list);
  panel.replaceChildren(content);
}

function renderAddresses(panel) {
  const content = createElement('section', 'account-addresses');
  content.append(createElement('h2', 'account-panel-title', 'Addresses'));
  const addresses = getAddresses();
  if (addresses.length === 0) {
    content.append(createElement('p', 'account-empty', 'Saved checkout addresses will appear here.'));
    panel.replaceChildren(content);
    return;
  }

  const list = createElement('div', 'account-address-list');
  addresses.forEach((address) => {
    const card = createElement('article', 'account-address-card');
    card.append(
      createElement('h3', 'account-address-name', address.fullName),
      createElement('p', '', address.streetAddress),
      createElement('p', '', `${address.city}, ${address.state} ${address.postalCode}`),
      createElement('p', '', address.country),
      createElement('p', '', address.email),
    );
    list.append(card);
  });
  content.append(list);
  panel.replaceChildren(content);
}

export default function decorate(block) {
  const page = createElement('div', 'account-page');
  const breadcrumb = createElement('nav', 'account-breadcrumb');
  breadcrumb.setAttribute('aria-label', 'Breadcrumb');
  const homeLink = createElement('a', '', 'Home');
  homeLink.href = '/';
  const currentPage = createElement('span', '', 'My Account');
  currentPage.setAttribute('aria-current', 'page');
  breadcrumb.append(homeLink, document.createTextNode('›'), currentPage);

  const layout = createElement('div', 'account-layout');
  const tabList = createElement('nav', 'account-tabs');
  tabList.setAttribute('role', 'tablist');
  tabList.setAttribute('aria-label', 'My Account');
  tabList.setAttribute('aria-orientation', 'vertical');
  const panel = createElement('div', 'account-panel');
  panel.id = 'account-panel';
  panel.setAttribute('role', 'tabpanel');
  panel.setAttribute('tabindex', '0');
  let activeTab = 'profile';
  function renderActiveTab() {
    panel.setAttribute('aria-labelledby', `account-tab-${activeTab}`);
    try {
      if (activeTab === 'profile') renderProfile(panel);
      else if (activeTab === 'orders') renderOrders(panel);
      else if (activeTab === 'wishlist') renderWishlist(panel, renderActiveTab);
      else if (activeTab === 'addresses') renderAddresses(panel);
      else panel.replaceChildren();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Unable to load account section.', error);
      const message = createElement('p', 'account-error', 'Unable to load this account section. Please try again.');
      message.setAttribute('role', 'alert');
      panel.replaceChildren(message);
    }
  }

  const tabs = ACCOUNT_TABS.map(([key, label]) => {
    const button = createElement('button', 'account-tab');
    button.type = 'button';
    button.id = `account-tab-${key}`;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', panel.id);
    button.setAttribute('aria-selected', String(key === activeTab));
    button.tabIndex = key === activeTab ? 0 : -1;
    button.append(createIcon(key), createElement('span', 'account-tab-label', label));
    button.addEventListener('click', () => {
      activeTab = key;
      tabs.forEach((tab) => {
        const selected = tab === button;
        tab.setAttribute('aria-selected', String(selected));
        tab.tabIndex = selected ? 0 : -1;
      });
      renderActiveTab();
    });
    tabList.append(button);
    return button;
  });

  tabList.addEventListener('keydown', (event) => {
    const currentIndex = tabs.indexOf(document.activeElement);
    let nextIndex = currentIndex;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
    else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = tabs.length - 1;
    else return;
    event.preventDefault();
    tabs[nextIndex].focus();
    tabs[nextIndex].click();
  });

  layout.append(tabList, panel);
  page.append(breadcrumb, layout);
  block.replaceChildren(page);
  renderActiveTab();
  window.addEventListener('storage', (event) => {
    if (event.key === ACCOUNT_STORAGE_KEY || event.key === null) renderActiveTab();
  });
}
