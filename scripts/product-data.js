const PRODUCT_SHEET = '/pages/categories/footwear.json';

export default async function fetchProductsByIds(productIds) {
  const remaining = new Set(productIds.map((id) => String(id)));
  const products = new Map();
  if (remaining.size === 0) return products;

  const sheetUrl = new URL(PRODUCT_SHEET, window.location.origin);
  let offset = 0;
  let total;

  do {
    const pageUrl = new URL(sheetUrl);
    pageUrl.searchParams.set('offset', String(offset));
    // Product sheet offsets depend on the previous response length.
    // eslint-disable-next-line no-await-in-loop
    const response = await fetch(pageUrl);
    if (!response.ok) {
      throw new Error(`Product sheet request failed with status ${response.status}.`);
    }
    // eslint-disable-next-line no-await-in-loop
    const page = await response.json();
    const pageTotal = Number(page?.total);
    const limit = Number(page?.limit);
    if (!page || typeof page !== 'object' || Array.isArray(page)
      || !Array.isArray(page.data)
      || !Number.isSafeInteger(pageTotal)
      || pageTotal < 0
      || !Number.isSafeInteger(limit)
      || limit < 1
      || Number(page.offset) !== offset
      || page.data.length > limit
      || (total !== undefined && total !== pageTotal)) {
      throw new Error('The product sheet returned an invalid page.');
    }
    total = pageTotal;
    if (page.data.length === 0 && offset < total) {
      throw new Error('The product sheet returned no rows before its reported total.');
    }

    page.data.forEach((product) => {
      if (!product || !product.id) return;
      const id = String(product.id).trim();
      if (remaining.has(id)) {
        products.set(id, product);
        remaining.delete(id);
      }
    });
    offset += page.data.length;
  } while (offset < total);

  if (offset !== total) throw new Error('The product sheet row count is incomplete.');
  return products;
}
