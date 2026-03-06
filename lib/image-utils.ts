const MAX_DIMENSION = 4000;
const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif'];
const RAW_EXTENSIONS = ['.cr2', '.cr3', '.nef', '.arw', '.dng', '.raf', '.orf', '.rw2', '.pef', '.srw'];

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();
  const isHeic = fileName.endsWith('.heic') || fileName.endsWith('.heif') || fileType === 'image/heic' || fileType === 'image/heif';
  const isJpeg = fileType === 'image/jpeg' || fileType === 'image/jpg' || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg');
  const isPng = fileType === 'image/png' || fileName.endsWith('.png');
  const isRaw = RAW_EXTENSIONS.some(ext => fileName.endsWith(ext));

  if (!isJpeg && !isPng && !isHeic && !isRaw) {
    return {
      valid: false,
      error: 'Only JPEG, PNG, HEIC, and RAW images are supported.',
    };
  }

  // Check file size - RAW files can be larger since we only extract preview
  const maxSize = isRaw ? 150 * 1024 * 1024 : 50 * 1024 * 1024; // 150MB for RAW, 50MB for others
  if (file.size > maxSize) {
    return {
      valid: false,
      error: isRaw
        ? 'RAW file too large. Please upload a file under 150MB.'
        : 'File size too large. Please upload an image under 50MB.',
    };
  }

  return { valid: true };
}

// Extract embedded JPEG preview from RAW file
async function extractRawPreview(file: File): Promise<Blob | null> {
  try {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Look for JPEG markers (FFD8 = start, FFD9 = end)
    let jpegStart = -1;
    let jpegEnd = -1;

    for (let i = 0; i < bytes.length - 1; i++) {
      if (bytes[i] === 0xFF && bytes[i + 1] === 0xD8) {
        // Found JPEG start
        if (jpegStart === -1) jpegStart = i;
      }
      if (bytes[i] === 0xFF && bytes[i + 1] === 0xD9) {
        // Found JPEG end
        jpegEnd = i + 2;
        // Look for a reasonably sized preview (> 50KB)
        if (jpegStart !== -1 && (jpegEnd - jpegStart) > 50000) {
          break;
        }
      }
    }

    if (jpegStart !== -1 && jpegEnd !== -1 && jpegEnd > jpegStart) {
      const jpegData = bytes.slice(jpegStart, jpegEnd);
      return new Blob([jpegData], { type: 'image/jpeg' });
    }

    return null;
  } catch (error) {
    console.error('Failed to extract RAW preview:', error);
    return null;
  }
}

export async function loadImage(file: File): Promise<HTMLImageElement> {
  let processedFile = file;

  // Check file type once
  const fileName = file.name.toLowerCase();
  const fileType = file.type.toLowerCase();
  const isRaw = RAW_EXTENSIONS.some(ext => fileName.endsWith(ext));
  const isHeic = fileName.endsWith('.heic') || fileName.endsWith('.heif') || fileType === 'image/heic' || fileType === 'image/heif';

  // Process RAW file first
  if (isRaw) {
    console.log('RAW file detected, extracting preview...');
    const preview = await extractRawPreview(file);
    if (preview) {
      processedFile = new File([preview], file.name.replace(/\.[^.]+$/, '.jpg'), {
        type: 'image/jpeg',
      });
      console.log('RAW preview extracted successfully');
    } else {
      throw new Error('Could not extract preview from RAW file. Try converting to JPEG first.');
    }
  }

  // Convert HEIC to JPEG if needed

  if (isHeic && typeof window !== 'undefined') {
    try {
      // Dynamic import to avoid SSR issues
      const heic2any = (await import('heic2any')).default;

      const convertedBlob = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.95,
      });

      // heic2any can return Blob or Blob[]
      const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
      processedFile = new File([blob], file.name.replace(/\.heic$/i, '.jpg'), {
        type: 'image/jpeg',
      });
    } catch (error) {
      console.error('HEIC conversion failed:', error);
      throw new Error('Failed to convert HEIC image');
    }
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(processedFile);

    img.onload = () => {
      // Convert to data URL before revoking blob URL
      // This ensures img.src remains valid after blob is revoked
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

        // Now we can safely revoke the blob URL
        URL.revokeObjectURL(url);

        // Create new image with data URL
        const finalImg = new Image();
        finalImg.onload = () => resolve(finalImg);
        finalImg.onerror = () => reject(new Error('Failed to load data URL'));
        finalImg.src = dataUrl;
      } else {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to create canvas context'));
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

export function scaleImageIfNeeded(
  image: HTMLImageElement
): HTMLImageElement | HTMLCanvasElement {
  const { width, height } = image;

  // Check if scaling is needed
  if (width <= MAX_DIMENSION && height <= MAX_DIMENSION) {
    return image;
  }

  // Calculate new dimensions
  const scale = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
  const newWidth = Math.floor(width * scale);
  const newHeight = Math.floor(height * scale);

  // Create canvas and scale
  const canvas = document.createElement('canvas');
  canvas.width = newWidth;
  canvas.height = newHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return image; // Fallback to original if canvas fails
  }

  ctx.drawImage(image, 0, 0, newWidth, newHeight);
  return canvas;
}

export function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
  canvas.toBlob((blob) => {
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = filename;
    link.href = url;
    link.click();

    URL.revokeObjectURL(url);
  }, 'image/jpeg', 0.95);
}

export async function shareCanvas(canvas: HTMLCanvasElement, filename: string) {
  if (!navigator.share) {
    throw new Error('Web Share API not supported');
  }

  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
    }, 'image/jpeg', 0.95);
  });

  const file = new File([blob], filename, { type: 'image/jpeg' });

  await navigator.share({
    files: [file],
    title: 'Slow Shutter Effect',
  });
}
