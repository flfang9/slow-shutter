const sharp = require('sharp');
const path = require('path');

async function generateIcons() {
  const sizes = [192, 512];
  const publicDir = path.join(__dirname, '../public');
  const sourceLogo = path.join(publicDir, 'logo.png');

  for (const size of sizes) {
    const outputPath = path.join(publicDir, `icon-${size}.png`);

    await sharp(sourceLogo)
      .resize(size, size)
      .png()
      .toFile(outputPath);

    console.log(`✓ Generated ${outputPath}`);
  }

  // Also create a favicon
  await sharp(sourceLogo)
    .resize(48, 48)
    .png()
    .toFile(path.join(publicDir, 'favicon.ico'));

  console.log('✓ Generated favicon.ico');

  // Create apple-touch-icon
  await sharp(sourceLogo)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  console.log('✓ Generated apple-touch-icon.png');
}

generateIcons().catch(console.error);
