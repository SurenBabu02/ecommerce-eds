import { decorateIcons, getMetadata } from '../../scripts/aem.js';
import { CART_CHANGE_EVENT, CART_STORAGE_KEY, getCartCount } from '../../scripts/cart.js';
import { loadFragment } from '../fragment/fragment.js';

// media query match that indicates mobile/tablet width
const isDesktop = window.matchMedia('(min-width: 900px)');

/**
 * Closes the open nav dropdown (desktop) or the nav menu (mobile) on Escape
 * @param {KeyboardEvent} e keydown event
 */
function closeOnEscape(e) {
  if (e.code === 'Escape') {
    const nav = document.getElementById('nav');
    const navSections = nav.querySelector('.nav-sections');
    if (!navSections) return;
    const navSectionExpanded = navSections.querySelector('[aria-expanded="true"]');
    if (navSectionExpanded && isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleAllNavSections(navSections);
      navSectionExpanded.focus();
    } else if (!isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleMenu(nav, navSections);
      nav.querySelector('button').focus();
    }
  }
}

/**
 * Closes the open nav dropdown (desktop) or the nav menu (mobile) when focus leaves the nav
 * @param {FocusEvent} e focusout event
 */
function closeOnFocusLost(e) {
  const nav = e.currentTarget;
  if (!nav.contains(e.relatedTarget)) {
    const navSections = nav.querySelector('.nav-sections');
    if (!navSections) return;
    const navSectionExpanded = navSections.querySelector('[aria-expanded="true"]');
    if (navSectionExpanded && isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleAllNavSections(navSections, false);
    } else if (!isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleMenu(nav, navSections, false);
    }
  }
}

/**
 * Toggles all nav sections
 * @param {Element} sections The container element
 * @param {Boolean|string} expanded Whether the element should be expanded or collapsed
 */
function toggleAllNavSections(sections, expanded = false) {
  if (!sections) return;
  sections.querySelectorAll('.nav-drop > button').forEach((button) => {
    button.setAttribute('aria-expanded', expanded);
  });
}

/**
 * Toggles the entire nav
 * @param {Element} nav The container element
 * @param {Element} navSections The nav sections within the container element
 * @param {*} forceExpanded Optional param to force nav expand behavior when not null
 */
function toggleMenu(nav, navSections, forceExpanded = null) {
  const expanded = forceExpanded !== null ? !forceExpanded : nav.getAttribute('aria-expanded') === 'true';
  const button = nav.querySelector('.nav-hamburger button');
  document.body.style.overflowY = (expanded || isDesktop.matches) ? '' : 'hidden';
  // the desktop nav is always expanded, so aria-expanded only applies to the mobile menu
  if (isDesktop.matches) nav.removeAttribute('aria-expanded');
  else nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  toggleAllNavSections(navSections, expanded || isDesktop.matches ? 'false' : 'true');
  button.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');

  // enable menu collapse on escape keypress
  if (!expanded || isDesktop.matches) {
    // collapse menu on escape press
    window.addEventListener('keydown', closeOnEscape);
    // collapse menu on focus lost
    nav.addEventListener('focusout', closeOnFocusLost);
  } else {
    window.removeEventListener('keydown', closeOnEscape);
    nav.removeEventListener('focusout', closeOnFocusLost);
  }
}

function createToolLink(name, label, href) {
  const link = document.createElement('a');
  link.className = `nav-tool-link nav-tool-${name}`;
  link.href = href;
  link.setAttribute('aria-label', label);

  const icon = document.createElement('span');
  icon.className = `icon icon-${name}`;
  link.append(icon);

  const linkLabel = document.createElement('span');
  linkLabel.className = 'nav-tool-label';
  linkLabel.textContent = label;
  link.append(linkLabel);
  return link;
}

function decorateNavTools(nav) {
  let tools = nav.querySelector('.nav-tools');
  if (!tools) {
    tools = document.createElement('div');
    tools.className = 'nav-tools';
    nav.append(tools);
  }

  const content = tools.querySelector('.default-content-wrapper') || tools;
  const searchIcon = tools.querySelector('.icon-search');
  if (searchIcon) {
    let searchLink = searchIcon.closest('a');
    if (!searchLink) {
      searchLink = createToolLink('search', 'Search', '/search');
      searchIcon.parentElement.replaceChild(searchLink, searchIcon);
      searchLink.querySelector('.icon').replaceWith(searchIcon);
    } else {
      searchLink.classList.add('nav-tool-link', 'nav-tool-search');
      searchLink.setAttribute('aria-label', 'Search');
    }
  } else {
    content.append(createToolLink('search', 'Search', '/search'));
  }

  let accountLink = tools.querySelector('.nav-tool-account');
  if (!accountLink) {
    accountLink = createToolLink('account', 'My account', '/pages/account');
    content.append(accountLink);
  }
  accountLink.href = '/pages/account';
  accountLink.setAttribute('aria-label', 'My account');

  let cartLink = tools.querySelector('.nav-tool-cart');
  if (!cartLink) {
    cartLink = createToolLink('cart', 'Cart', '/pages/cart');
    content.append(cartLink);
  }
  cartLink.href = '/pages/cart';
  let cartCount = cartLink.querySelector('.nav-tool-cart-count');
  if (!cartCount) {
    cartCount = document.createElement('span');
    cartCount.className = 'nav-tool-cart-count';
    cartCount.setAttribute('aria-hidden', 'true');
    cartLink.append(cartCount);
  }

  const updateCartCount = () => {
    try {
      const count = getCartCount();
      cartCount.textContent = count > 99 ? '99+' : String(count);
      cartCount.hidden = count === 0;
      cartLink.setAttribute('aria-label', `Cart, ${count} ${count === 1 ? 'item' : 'items'}`);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Unable to read cart count.', error);
      cartCount.textContent = '!';
      cartCount.hidden = false;
      cartLink.setAttribute('aria-label', 'Cart count unavailable');
    }
  };
  updateCartCount();
  window.addEventListener(CART_CHANGE_EVENT, updateCartCount);
  window.addEventListener('storage', (event) => {
    if (event.key === CART_STORAGE_KEY || event.key === null) updateCartCount();
  });

  decorateIcons(tools);
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  // load nav as fragment
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  const fragment = await loadFragment(navPath);

  // decorate nav DOM
  block.textContent = '';
  const nav = document.createElement('nav');
  nav.id = 'nav';
  while (fragment.firstElementChild) nav.append(fragment.firstElementChild);

  const classes = ['brand', 'sections', 'tools'];
  classes.forEach((c, i) => {
    const section = nav.children[i];
    if (section) section.classList.add(`nav-${c}`);
  });

  const navBrand = nav.querySelector('.nav-brand');
  const brandLink = navBrand && navBrand.querySelector('.button');
  if (brandLink) {
    brandLink.className = '';
    const buttonContainer = brandLink.closest('.button-container');
    if (buttonContainer) buttonContainer.className = '';
  }

  decorateNavTools(nav);

  const navSections = nav.querySelector('.nav-sections');
  if (navSections) {
    navSections.querySelectorAll(':scope .default-content-wrapper > ul > li').forEach((navSection) => {
      const subList = navSection.querySelector(':scope > ul');
      if (!subList) return;
      navSection.classList.add('nav-drop');
      // wrap the dropdown label in a button so it is announced as expandable
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-expanded', false);
      [...navSection.childNodes].forEach((node) => {
        if (node !== subList) button.append(node);
      });
      navSection.prepend(button);
      button.addEventListener('click', () => {
        const expanded = button.getAttribute('aria-expanded') === 'true';
        if (isDesktop.matches) {
          button.focus();
          toggleAllNavSections(navSections);
        }
        button.setAttribute('aria-expanded', !expanded);
      });
    });
  }

  // hamburger for mobile
  const hamburger = document.createElement('div');
  hamburger.classList.add('nav-hamburger');
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation">
      <span class="nav-hamburger-icon"></span>
    </button>`;
  hamburger.addEventListener('click', () => toggleMenu(nav, navSections));
  nav.prepend(hamburger);
  nav.setAttribute('aria-expanded', 'false');
  // prevent mobile nav behavior on window resize
  toggleMenu(nav, navSections, isDesktop.matches);
  isDesktop.addEventListener('change', () => toggleMenu(nav, navSections, isDesktop.matches));

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);
}
