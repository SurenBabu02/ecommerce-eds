import { clearCart, readCart } from '../../scripts/cart.js';
import { recordOrder } from '../../scripts/account.js';
import fetchProductsByIds from '../../scripts/product-data.js';

const PRODUCT_PLACEHOLDER = '/blocks/product-listing/images/product-placeholder.svg';
const SHIPPING_PRICES = {
  standard: 10,
  express: 20,
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

function getItemDetails(item, productMap) {
  const product = productMap.get(item.id);
  const title = item.title || String(product?.title || `Product ${item.id}`);
  const priceValue = item.price ?? (
    product?.price === undefined || product?.price === null || String(product.price).trim() === ''
      ? NaN
      : Number(String(product.price).replace(/,/g, ''))
  );
  const price = Number.isFinite(priceValue) && priceValue >= 0 ? priceValue : null;

  return {
    title,
    brand: item.brand || String(product?.brand || ''),
    image: item.image || String(product?.image || ''),
    price,
  };
}

function createImage(imagePath, title) {
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

function createInputField(labelText, name, type, autocomplete) {
  const wrapper = createElement('div', 'checkout-field');
  const inputId = `checkout-${name}`;
  const label = createElement('label', '', labelText);
  label.htmlFor = inputId;
  const input = document.createElement('input');
  input.id = inputId;
  input.name = name;
  input.type = type;
  input.required = true;
  input.autocomplete = autocomplete;
  input.placeholder = labelText;
  wrapper.append(label, input);
  return wrapper;
}

function createAddressFields() {
  const row = createElement('div', 'checkout-address-row');
  const city = createInputField('City', 'city', 'text', 'address-level2');
  const state = createInputField('State', 'state', 'text', 'address-level1');
  const zip = createInputField('ZIP', 'postalCode', 'text', 'postal-code');
  row.append(city, state, zip);
  return row;
}

function createCountryField() {
  const wrapper = createElement('div', 'checkout-field');
  const label = createElement('label', '', 'Country');
  label.htmlFor = 'checkout-country';
  const select = document.createElement('select');
  select.id = 'checkout-country';
  select.name = 'country';
  select.required = true;
  const countries = [
    ['', 'Select Country'],
    ['US', 'United States'],
    ['CA', 'Canada'],
    ['GB', 'United Kingdom'],
    ['IN', 'India'],
    ['AU', 'Australia'],
  ];
  countries.forEach(([value, text]) => {
    const option = createElement('option', '', text);
    option.value = value;
    select.append(option);
  });
  wrapper.append(label, select);
  return wrapper;
}

function createShippingOptions(disabled) {
  const fieldset = createElement('fieldset', 'checkout-choice-group checkout-shipping-methods');
  fieldset.append(createElement('legend', '', 'Shipping Method'));
  [
    ['standard', 'Standard (5-7 days)'],
    ['express', 'Express (2-3 days)'],
  ].forEach(([value, labelText]) => {
    const optionLabel = createElement('label', 'checkout-choice');
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'shipping';
    input.value = value;
    input.dataset.price = String(SHIPPING_PRICES[value]);
    input.checked = value === 'standard';
    input.disabled = disabled;
    const text = createElement('span', '', labelText);
    optionLabel.append(input, text);
    fieldset.append(optionLabel);
  });
  return fieldset;
}

function createPaymentOptions(disabled) {
  const fieldset = createElement('fieldset', 'checkout-choice-group');
  fieldset.append(createElement('legend', '', 'Payment Method'));
  [
    ['card', 'Credit/Debit Card'],
    ['paypal', 'PayPal'],
  ].forEach(([value, labelText], index) => {
    const optionLabel = createElement('label', 'checkout-choice');
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'payment';
    input.value = value;
    input.checked = index === 0;
    input.disabled = disabled;
    const text = createElement('span', '', labelText);
    optionLabel.append(input, text);
    fieldset.append(optionLabel);
  });
  return fieldset;
}

function renderCheckout(block, cart, productMap) {
  const items = Object.values(cart);
  const page = createElement('div', 'checkout-page');
  const breadcrumb = createElement('nav', 'checkout-breadcrumb');
  breadcrumb.setAttribute('aria-label', 'Breadcrumb');
  const homeLink = createElement('a', '', 'Home');
  homeLink.href = '/';
  const currentPage = createElement('span', '', 'Checkout');
  currentPage.setAttribute('aria-current', 'page');
  breadcrumb.append(homeLink, document.createTextNode('›'), currentPage);

  const title = createElement('h1', 'checkout-title', 'Checkout');
  const form = document.createElement('form');
  form.className = 'checkout-form';
  const layout = createElement('div', 'checkout-layout');
  const details = createElement('section', 'checkout-details');
  details.append(createElement('h2', 'checkout-section-title', 'Shipping Details'));
  details.append(
    createInputField('Full Name', 'fullName', 'text', 'name'),
    createInputField('Email', 'email', 'email', 'email'),
    createInputField('Address', 'streetAddress', 'text', 'street-address'),
    createAddressFields(),
    createCountryField(),
    createShippingOptions(items.length === 0),
    createPaymentOptions(items.length === 0),
  );

  const summary = createElement('aside', 'checkout-summary');
  summary.setAttribute('aria-label', 'Order summary');
  summary.append(createElement('h2', 'checkout-section-title', 'Order Summary'));
  const list = createElement('ul', 'checkout-items');
  let subtotal = 0;
  let unresolvedCount = 0;
  items.forEach((item) => {
    const product = getItemDetails(item, productMap);
    const row = createElement('li', 'checkout-item');
    const image = createElement('div', 'checkout-item-image');
    image.append(createImage(product.image, product.title));
    const info = createElement('div', 'checkout-item-info');
    info.append(
      createElement('span', 'checkout-item-name', product.title),
      createElement('span', 'checkout-item-quantity', `Qty ${item.quantity}`),
    );
    if (product.price === null) {
      unresolvedCount += 1;
      info.append(createElement('strong', 'checkout-item-price', 'Price unavailable'));
    } else {
      const lineTotal = product.price * item.quantity;
      subtotal += lineTotal;
      info.append(createElement('strong', 'checkout-item-price', formatPrice(lineTotal)));
    }
    row.append(image, info);
    list.append(row);
  });

  const subtotalValue = createElement('strong', 'checkout-subtotal-value', formatPrice(subtotal));
  const initialShipping = items.length ? SHIPPING_PRICES.standard : 0;
  const shippingValue = createElement('strong', 'checkout-shipping-value', formatPrice(initialShipping));
  const totalValue = createElement('strong', 'checkout-total-value', formatPrice(
    subtotal + initialShipping,
  ));
  const summaryRows = createElement('div', 'checkout-summary-rows');
  const subtotalRow = createElement('div', 'checkout-summary-row');
  subtotalRow.append(createElement('span', '', 'Subtotal'), subtotalValue);
  const shippingRow = createElement('div', 'checkout-summary-row');
  shippingRow.append(createElement('span', '', 'Shipping'), shippingValue);
  const totalRow = createElement('div', 'checkout-summary-total');
  totalRow.append(createElement('span', '', 'Total'), totalValue);
  summaryRows.append(subtotalRow, shippingRow, totalRow);
  summary.append(list, summaryRows);

  const status = createElement('p', 'checkout-status');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  if (items.length === 0) {
    status.textContent = 'Your cart is empty. Add items before checking out.';
    const shoppingLink = createElement('a', 'checkout-continue', 'Continue Shopping');
    shoppingLink.href = '/pages/products';
    summary.append(shoppingLink);
  } else if (unresolvedCount) {
    status.textContent = 'Some cart items could not be priced. Return to your cart to review them.';
  }

  const placeOrder = createElement('button', 'checkout-place-order', 'Place Order');
  placeOrder.type = 'submit';
  placeOrder.disabled = items.length === 0 || unresolvedCount > 0;
  form.addEventListener('change', (event) => {
    if (items.length === 0 || event.target.name !== 'shipping') return;
    const shippingPrice = Number(event.target.dataset.price);
    shippingValue.textContent = formatPrice(shippingPrice);
    totalValue.textContent = formatPrice(subtotal + shippingPrice);
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    try {
      const currentCart = readCart();
      const orderItems = Object.values(currentCart).map((item) => {
        const product = getItemDetails(item, productMap);
        if (product.price === null) {
          throw new Error(`Price is unavailable for product ${item.id}.`);
        }
        return { ...item, ...product };
      });
      const formData = new FormData(form);
      const shippingInput = form.querySelector('input[name="shipping"]:checked');
      const paymentInput = form.querySelector('input[name="payment"]:checked');
      const country = form.elements.country.selectedOptions[0]?.textContent || '';
      const order = recordOrder({
        items: orderItems,
        shippingMethod: shippingInput?.value,
        paymentMethod: paymentInput?.value,
        shippingCost: Number(shippingInput?.dataset.price),
        address: {
          fullName: formData.get('fullName'),
          email: formData.get('email'),
          streetAddress: formData.get('streetAddress'),
          city: formData.get('city'),
          state: formData.get('state'),
          postalCode: formData.get('postalCode'),
          country,
        },
      });
      clearCart();
      status.textContent = `Order ${order.id} placed. Find it in My Orders.`;
      placeOrder.disabled = true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Unable to place order.', error);
      status.textContent = 'Unable to place your order. Please review your details and try again.';
    }
  });

  layout.append(details, summary);
  form.append(layout, status, placeOrder);
  page.append(breadcrumb, title, form);
  block.replaceChildren(page);
}

export default async function decorate(block) {
  const loading = createElement('p', 'checkout-loading', 'Loading checkout...');
  loading.setAttribute('role', 'status');
  block.replaceChildren(loading);

  try {
    const cart = readCart();
    const incompleteItems = Object.values(cart)
      .filter((item) => !item.title || item.price === null)
      .map((item) => item.id);
    const productMap = await fetchProductsByIds(incompleteItems);
    renderCheckout(block, cart, productMap);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Unable to load checkout.', error);
    const message = createElement(
      'p',
      'checkout-error',
      'Unable to load checkout details. Please return to your cart and try again.',
    );
    message.setAttribute('role', 'alert');
    block.replaceChildren(message);
  }
}
