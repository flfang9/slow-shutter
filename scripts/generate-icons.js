const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Create a camera shutter icon SVG
const createShutterSVG = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="${size}" height="${size}" fill="#0A0A0A" rx="${size * 0.15}"/>

  <!-- Camera shutter blades (aperture design) -->
  <g transform="translate(${size/2}, ${size/2})">
    <!-- Outer circle -->
    <circle r="${size * 0.35}" fill="none" stroke="#C8FF00" stroke-width="${size * 0.02}"/>

    <!-- Shutter blades -->
    ${Array.from({length: 8}, (_, i) => {
      const angle = (i * 45) - 22.5;
      const innerRadius = size * 0.15;
      const outerRadius = size * 0.35;
      const bladeWidth = size * 0.08;

      const x1 = Math.cos((angle - bladeWidth/2) * Math.PI / 180) * innerRadius;
      const y1 = Math.sin((angle - bladeWidth/2) * Math.PI / 180) * innerRadius;
      const x2 = Math.cos((angle + bladeWidth/2) * Math.PI / 180) * innerRadius;
      const y2 = Math.sin((angle + bladeWidth/2) * Math.PI / 180) * innerRadius;
      const x3 = Math.cos((angle + bladeWidth/2) * Math.PI / 180) * outerRadius;
      const y3 = Math.sin((angle + bladeWidth/2) * Math.PI / 180) * outerRadius;
      const x4 = Math.cos((angle - bladeWidth/2) * Math.PI / 180) * outerRadius;
      const y4 = Math.sin((angle - bladeWidth/2) * Math.PI / 180) * outerRadius;

      return `<path d="M ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3} L ${x4} ${y4} Z" fill="#C8FF00" opacity="0.9"/>`;
    }).join('\n    ')}

    <!-- Center circle -->
    <circle r="${size * 0.12}" fill="#0A0A0A" stroke="#C8FF00" stroke-width="${size * 0.015}"/>

    <!-- Motion blur lines (for slow shutter effect) -->
    <line x1="${-size * 0.25}" y1="${-size * 0.42}" x2="${-size * 0.15}" y2="${-size * 0.42}"
          stroke="#C8FF00" stroke-width="${size * 0.008}" opacity="0.6"/>
    <line x1="${size * 0.15}" y1="${-size * 0.42}" x2="${size * 0.25}" y2="${-size * 0.42}"
          stroke="#C8FF00" stroke-width="${size * 0.008}" opacity="0.6"/>
    <line x1="${-size * 0.25}" y1="${size * 0.42}" x2="${-size * 0.15}" y2="${size * 0.42}"
          stroke="#C8FF00" stroke-width="${size * 0.008}" opacity="0.6"/>
    <line x1="${size * 0.15}" y1="${size * 0.42}" x2="${size * 0.25}" y2="${size * 0.42}"
          stroke="#C8FF00" stroke-width="${size * 0.008}" opacity="0.6"/>
  </g>
</svg>
`;

async function generateIcons() {
  const sizes = [192, 512];
  const publicDir = path.join(__dirname, '../public');

  for (const size of sizes) {
    const svg = createShutterSVG(size);
    const outputPath = path.join(publicDir, `icon-${size}.png`);

    await sharp(Buffer.from(svg))
      .png()
      .toFile(outputPath);

    console.log(`✓ Generated ${outputPath}`);
  }

  // Also create a favicon
  const faviconSvg = createShutterSVG(32);
  await sharp(Buffer.from(faviconSvg))
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'favicon.ico'));

  console.log('✓ Generated favicon.ico');

  // Create apple-touch-icon
  const appleSvg = createShutterSVG(180);
  await sharp(Buffer.from(appleSvg))
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  console.log('✓ Generated apple-touch-icon.png');
}

generateIcons().catch(console.error);
