import { createOptimizedPicture } from '../../scripts/aem.js';

const categoryLabels = new Set(['electronics', 'fashion', 'footwear', 'accessories']);
const categoryPaths = {
  electronics: '/pages/products?categorySlug=electronics',
  fashion: '/pages/products?categorySlug=fashion',
  footwear: '/pages/products?categorySlug=footwear',
  accessories: '/pages/products?categorySlug=accessories',
};

function getRowLabel(row) {
  return [...row.children]
    .filter((cell) => !cell.querySelector('picture'))
    .map((cell) => cell.textContent.trim())
    .join(' ')
    .trim()
    .toLowerCase();
}

function isCategoryCards(block) {
  const rows = [...block.children];
  if (rows.length !== 4) return false;

  const labels = rows.map(getRowLabel);
  return labels.every((label) => categoryLabels.has(label))
    && new Set(labels).size === categoryLabels.size
    && rows.every((row, index) => {
      const links = [...row.querySelectorAll('a')];
      return row.querySelectorAll('picture').length === 1
        && !row.querySelector('button')
        && links.length <= 1
        && (!links.length || (
          links[0].querySelector('picture')
          && [
            categoryPaths[labels[index]],
            // legacyCategoryPaths[labels[index]],
            `/${labels[index]}`,
          ].includes(links[0].getAttribute('href'))
        ));
    });
}

function isDealsCards(block) {
  const section = block.closest('.section');
  const heading = section?.querySelector('h1, h2, h3, h4, h5, h6');
  return /^deals\s+on\b/i.test(heading?.textContent.trim() || '');
}

function isImageOnlyCards(block) {
  const rows = [...block.children];
  return rows.length > 1 && rows.every((row) => (
    row.querySelectorAll('picture').length === 1
      && !row.textContent.trim()
  ));
}

function addPromotionNavigation(block, list) {
  const navigation = document.createElement('div');
  navigation.className = 'cards-navigation-buttons';
  navigation.setAttribute('role', 'group');
  navigation.setAttribute('aria-label', 'Promotional card navigation');

  const previous = document.createElement('button');
  previous.type = 'button';
  previous.className = 'cards-previous';
  previous.setAttribute('aria-label', 'Previous promotional cards');
  previous.disabled = true;

  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'cards-next';
  next.setAttribute('aria-label', 'Next promotional cards');

  navigation.append(previous, next);
  block.append(navigation);

  const updateButtonStates = () => {
    const maxScroll = list.scrollWidth - list.clientWidth;
    previous.disabled = list.scrollLeft <= 1;
    next.disabled = maxScroll <= 1 || list.scrollLeft >= maxScroll - 1;
  };

  const scrollByCard = (direction) => {
    const firstCard = list.querySelector('li');
    if (!firstCard) return;

    const gap = Number.parseFloat(getComputedStyle(list).columnGap) || 0;
    list.scrollBy({
      left: direction * (firstCard.getBoundingClientRect().width + gap),
      behavior: 'smooth',
    });
  };

  previous.addEventListener('click', () => scrollByCard(-1));
  next.addEventListener('click', () => scrollByCard(1));
  list.addEventListener('scroll', updateButtonStates, { passive: true });
  window.addEventListener('resize', updateButtonStates);
  requestAnimationFrame(updateButtonStates);
}

export default function decorate(block) {
  if (isCategoryCards(block)) block.classList.add('categories');
  else if (isDealsCards(block)) block.classList.add('products');
  else if (isImageOnlyCards(block)) block.classList.add('promotions');

  /* change to ul, li */
  const ul = document.createElement('ul');
  if (block.classList.contains('promotions')) {
    ul.setAttribute('aria-label', 'Promotional images');
    ul.tabIndex = 0;
  }
  [...block.children].forEach((row) => {
    const categoryLabel = block.classList.contains('categories') ? getRowLabel(row) : '';
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) div.className = 'cards-card-image';
      else div.className = 'cards-card-body';
    });
    if (block.classList.contains('categories')) {
      const image = li.querySelector('.cards-card-image');
      const body = li.querySelector('.cards-card-body');
      const picture = image.querySelector('picture');
      const link = document.createElement('a');
      link.className = 'cards-category-link';
      link.href = categoryPaths[categoryLabel];
      link.setAttribute('aria-label', body.textContent.trim());
      image.replaceChildren(picture);
      link.append(image, body);
      li.replaceChildren(link);
    }
    ul.append(li);
  });
  ul.querySelectorAll('picture > img').forEach((img) => img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }])));
  block.replaceChildren(ul);
  if (block.classList.contains('promotions')) addPromotionNavigation(block, ul);
}
