import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  // load footer as fragment
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';
  const fragment = await loadFragment(footerPath);

  // decorate footer DOM
  block.textContent = '';
  const footer = document.createElement('div');
  while (fragment.firstElementChild) footer.append(fragment.firstElementChild);
  footer.querySelectorAll('a[href]').forEach((link) => {
    const url = new URL(link.href, window.location.origin);
    if (url.pathname !== '/pages/account' && url.pathname !== '/account') return;
    const listItem = link.closest('li');
    if (listItem) listItem.remove();
    else link.remove();
  });

  block.append(footer);
}
