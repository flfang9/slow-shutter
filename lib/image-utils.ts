const MAX_DIMENSION = 4000;
const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg'];

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (!ACCEPTED_TYPES.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: 'Only JPEG images are supported. Please upload a .jpg or .jpeg file.',
    };
  }

  // Check file size (max 50MB)
  if (file.size > 50 * 1024 * 1024) {
    return {
      valid: false,
      error: 'File size too large. Please upload an image under 50MB.',
    };
  }

  return { valid: true };
}

export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
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
