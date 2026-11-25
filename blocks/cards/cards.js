import { createOptimizedPicture } from '../../scripts/aem.js';

const categoryLabels = new Set(['electronics', 'fashion', 'footwear', 'accessories']);

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
    && rows.every((row) => row.querySelectorAll('picture').length === 1 && !row.querySelector('a, button'));
}

function isDealsCards(block) {
  const section = block.closest('.section');
  const heading = section?.querySelector('h1, h2, h3, h4, h5, h6');
  return /^deals\s+on\b/i.test(heading?.textContent.trim() || '');
}

export default function decorate(block) {
  if (isCategoryCards(block)) block.classList.add('categories');
  else if (isDealsCards(block)) block.classList.add('products');

  /* change to ul, li */
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) div.className = 'cards-card-image';
      else div.className = 'cards-card-body';
    });
    ul.append(li);
  });
  ul.querySelectorAll('picture > img').forEach((img) => img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }])));
  block.replaceChildren(ul);
}
