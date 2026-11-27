import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

function findLink(links, predicate) {
  return links.find((link) => predicate(link));
}

function createFooterLink(label, href) {
  const link = document.createElement('a');
  link.href = href;
  link.textContent = label;
  return link;
}

function createLinkList(links) {
  const list = document.createElement('ul');
  links.filter(Boolean).forEach((link) => {
    const item = document.createElement('li');
    item.append(link);
    list.append(item);
  });
  return list;
}

function createGroup(title, links) {
  const group = document.createElement('section');
  group.className = 'footer-group';

  const heading = document.createElement('h2');
  heading.textContent = title;
  group.append(heading, createLinkList(links));
  return group;
}

function createSocialLinks(links) {
  const networks = [
    { host: 'facebook.com', name: 'Facebook', icon: 'f' },
    { host: 'instagram.com', name: 'Instagram', icon: '◎' },
    { host: 'youtube.com', name: 'YouTube', icon: '▶' },
    { host: 'twitter.com', name: 'Twitter', icon: 'X' },
  ];
  const socialNav = document.createElement('nav');
  socialNav.className = 'footer-social';
  socialNav.setAttribute('aria-label', 'Social media');

  networks.forEach(({ host, name, icon }) => {
    const link = findLink(links, (candidate) => {
      const { hostname } = new URL(candidate.href, window.location.origin);
      return hostname === host || hostname.endsWith(`.${host}`);
    });
    if (!link) return;

    link.className = 'footer-social-link';
    link.setAttribute('aria-label', name);
    link.replaceChildren();

    const iconElement = document.createElement('span');
    iconElement.className = `footer-social-icon footer-social-${name.toLowerCase()}`;
    iconElement.setAttribute('aria-hidden', 'true');
    iconElement.textContent = icon;
    link.append(iconElement);
    socialNav.append(link);
  });

  return socialNav;
}

/**
 * Loads and decorates the footer.
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';
  const fragment = await loadFragment(footerPath);
  const authoredLinks = [...fragment.querySelectorAll('a[href]')];
  const categoryLinks = ['Electronics', 'Fashion', 'Footwear', 'Accessories'].map((name) => {
    const link = findLink(authoredLinks, (candidate) => (
      candidate.textContent.trim().toLowerCase() === name.toLowerCase()
    ));
    if (!link) return null;

    const url = new URL(link.href, window.location.origin);
    const slug = name.toLowerCase();
    url.searchParams.delete('category');
    url.searchParams.set('categorySlug', slug);
    link.setAttribute('href', `${url.pathname}${url.search}`);
    return link;
  });

  const returnsLink = findLink(authoredLinks, (link) => /returns/i.test(link.textContent));
  const faqLink = findLink(authoredLinks, (link) => /^faq$/i.test(link.textContent.trim()));
  const contactLink = findLink(authoredLinks, (link) => /contact us/i.test(link.textContent));
  const privacyLink = findLink(authoredLinks, (link) => /privacy policy/i.test(link.textContent));
  const termsLink = findLink(authoredLinks, (link) => /terms of use/i.test(link.textContent));
  const socialLinks = createSocialLinks(authoredLinks);
  const homeLink = findLink(authoredLinks, (link) => {
    const { pathname } = new URL(link.href, window.location.origin);
    return /\/pages\/home\/?$/i.test(pathname);
  });
  const brand = fragment.querySelector('.footer-columns h3');
  const copyright = fragment.querySelector('.footer-bottom p');

  const footerContent = document.createElement('div');
  footerContent.className = 'footer-layout';

  const main = document.createElement('div');
  main.className = 'footer-main';

  const brandColumn = document.createElement('div');
  brandColumn.className = 'footer-brand';
  const brandName = document.createElement('span');
  brandName.textContent = (brand?.textContent.trim() || 'ShopEase').replace(/^🛍️\s*/, '');
  brandColumn.append(brandName);

  const shoppingLink = createFooterLink('Shopping', '/');
  const aboutLink = homeLink
    ? homeLink.cloneNode(true)
    : createFooterLink('Our Story', '/');
  aboutLink.textContent = 'Our Story';
  if (returnsLink) returnsLink.textContent = 'Returns';

  main.append(
    brandColumn,
    createGroup('Shop', categoryLinks),
    createGroup('Help', [shoppingLink, returnsLink, faqLink, contactLink]),
    createGroup('About', [aboutLink, privacyLink, termsLink]),
  );

  const footerCopyright = document.createElement('p');
  footerCopyright.className = 'footer-copyright';
  footerCopyright.textContent = copyright?.textContent.trim() || '';

  footerContent.append(main, socialLinks, footerCopyright);
  block.replaceChildren(footerContent);
}
