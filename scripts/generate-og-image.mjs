// scripts/generate-og-image.mjs — regenerate public/og-image.png (1200x630 OG default)
import sharp from 'sharp';

const W = 1200;
const H = 630;

const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="#f3ead8"/>
  <rect x="0" y="0" width="${W}" height="14" fill="#221d16"/>
  <rect x="0" y="${H - 14}" width="${W}" height="14" fill="#221d16"/>
  <rect x="92" y="352" width="230" height="10" fill="#b23a5b"/>
  <text x="88" y="330" font-family="'DejaVu Serif', Georgia, serif" font-weight="bold" font-size="130" fill="#221d16">Mahalle</text>
  <text x="92" y="432" font-family="'DejaVu Sans', sans-serif" font-size="44" fill="#221d16">Der Ort f&#252;r den Schillerkiez</text>
  <text x="92" y="560" font-family="'DejaVu Sans', sans-serif" font-size="28" fill="#6b6152">mahalle.digital</text>
</svg>`;

await sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: true }).toFile('public/og-image.png');
console.log('wrote public/og-image.png');
