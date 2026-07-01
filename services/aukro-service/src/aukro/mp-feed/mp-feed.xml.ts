import { createHash } from 'crypto';
import {
  MP_FEED_MAX_BYTES,
  MP_FEED_MAX_PRODUCTS,
  MP_FEED_TEMPLATE_NAME,
  MpFeedGenerationResult,
  MpFeedProduct,
  MpFeedValidationError,
} from './mp-feed.types';

export function generateMpFeedXml(products: MpFeedProduct[]): MpFeedGenerationResult {
  if (products.length > MP_FEED_MAX_PRODUCTS) {
    throw new MpFeedValidationError('MP_FEED_LIMIT_EXCEEDED', 'MP feed product limit exceeded.', {
      productCount: products.length,
      maxProducts: MP_FEED_MAX_PRODUCTS,
    });
  }

  const sortedProducts = [...products].sort((left, right) => left.externalId.localeCompare(right.externalId));
  assertUniqueExternalIds(sortedProducts);

  const body = sortedProducts.map((product) => renderTemplate(product)).join('\n');
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<ExportFromSM>',
    '  <Templates>',
    body,
    '  </Templates>',
    '</ExportFromSM>',
    '',
  ].join('\n');
  const byteSize = Buffer.byteLength(xml, 'utf8');

  if (byteSize > MP_FEED_MAX_BYTES) {
    throw new MpFeedValidationError('MP_FEED_LIMIT_EXCEEDED', 'MP feed byte limit exceeded.', {
      byteSize,
      maxBytes: MP_FEED_MAX_BYTES,
    });
  }

  return {
    xml,
    checksum: createHash('sha256').update(xml).digest('hex'),
    byteSize,
    productCount: sortedProducts.length,
  };
}

function assertUniqueExternalIds(products: MpFeedProduct[]): void {
  const seen = new Set<string>();
  for (const product of products) {
    if (seen.has(product.externalId)) {
      throw new MpFeedValidationError('MP_FEED_DUPLICATE_EXTERNAL_ID', 'MP feed ExternalId values must be unique.', {
        externalId: product.externalId,
      });
    }
    seen.add(product.externalId);
  }
}

function renderTemplate(product: MpFeedProduct): string {
  const lines = [
    '    <Template>',
    element('TemplateName', MP_FEED_TEMPLATE_NAME, 6),
    element('Name', product.name, 6),
    element('ExternalId', product.externalId, 6),
    element('CategoryId', product.categoryId, 6),
    element('Description', product.description, 6),
    element('Quantity', product.quantity, 6),
    element('QuantityUnit', product.quantityUnit, 6),
    element('Duration', product.duration, 6),
    element('OfferType', product.offerType, 6),
    element('Place', product.place, 6),
  ];

  if (product.buyNowPrice !== undefined) lines.push(priceElement('BuyNowPrice', product.buyNowPrice, product.currency, 6));
  if (product.startingPrice !== undefined) lines.push(priceElement('StartingPrice', product.startingPrice, product.currency, 6));

  lines.push(renderShipment(product));
  lines.push(renderFields(product));
  lines.push(renderImages(product));
  lines.push('    </Template>');
  return lines.join('\n');
}

function renderShipment(product: MpFeedProduct): string {
  const lines = [
    '      <Shipment>',
    element('Method', product.shipment.method, 8),
  ];
  if (product.shipment.templateId !== undefined) lines.push(element('TemplateId', product.shipment.templateId, 8));
  if (product.shipment.price !== undefined) lines.push(priceElement('Price', product.shipment.price, product.shipment.currency || product.currency, 8));
  lines.push('      </Shipment>');
  return lines.join('\n');
}

function renderFields(product: MpFeedProduct): string {
  const fields = [...product.fields].sort((left, right) => `${left.name}:${left.id || ''}`.localeCompare(`${right.name}:${right.id || ''}`));
  const lines = ['      <Fields>'];
  for (const field of fields) {
    lines.push('        <Field>');
    if (field.id !== undefined) lines.push(element('Id', field.id, 10));
    lines.push(element('Name', field.name, 10));
    lines.push(element('Value', field.value, 10));
    if (field.unit !== undefined) lines.push(element('Unit', field.unit, 10));
    lines.push('        </Field>');
  }
  lines.push('      </Fields>');
  return lines.join('\n');
}

function renderImages(product: MpFeedProduct): string {
  const images = [...product.images].sort((left, right) => left.position - right.position || left.url.localeCompare(right.url));
  const lines = ['      <Images>'];
  for (const image of images) {
    lines.push('        <Image>');
    lines.push(element('Url', image.url, 10));
    lines.push(element('Position', image.position, 10));
    if (image.alt !== undefined) lines.push(element('Alt', image.alt, 10));
    lines.push('        </Image>');
  }
  lines.push('      </Images>');
  return lines.join('\n');
}

function priceElement(name: string, amount: number, currency: string, indent: number): string {
  const padding = ' '.repeat(indent);
  return `${padding}<${name} currency="${escapeXml(currency)}">${formatAmount(amount)}</${name}>`;
}

function element(name: string, value: string | number | boolean, indent: number): string {
  const padding = ' '.repeat(indent);
  return `${padding}<${name}>${escapeXml(String(value))}</${name}>`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatAmount(amount: number): string {
  return Number(amount).toFixed(2);
}
