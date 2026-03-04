import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Slow Shutter',
    short_name: 'Slow Shutter',
    description: 'Apply cinematic slow-shutter blur effects to your photos',
    start_url: '/',
    display: 'standalone',
    background_color: '#0A0A0A',
    theme_color: '#C8FF00',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
