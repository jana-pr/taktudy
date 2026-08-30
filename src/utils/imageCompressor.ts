/**
 * Compresses an image file (e.g. from iPhone camera or photo gallery)
 * to a lightweight base64 Data URL (max 1280px, ~120KB) so it saves quickly,
 * works 100% offline in IndexedDB, and displays instantly without overloading storage.
 */
export function compressImageFile(
  file: File,
  maxWidth = 1280,
  maxHeight = 1280,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Vybraný soubor není platný obrázek.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Nepodařilo se zpracovat obrázek.'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Nepodařilo se načíst soubor z paměti.'));
    reader.readAsDataURL(file);
  });
}

export interface PhotoPreset {
  label: string;
  url: string;
}

export const CATEGORY_PHOTO_PRESETS: Record<string, PhotoPreset[]> = {
  monument: [
    { label: 'Sigiriya (Lví skála)', url: 'https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?auto=format&fit=crop&w=1200&q=80' },
    { label: 'Chrám / Stúpa', url: 'https://images.unsplash.com/photo-1546708973-b339540b5162?auto=format&fit=crop&w=1200&q=80' },
    { label: 'Galle Fort / Maják', url: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=1200&q=80' },
    { label: 'Socha Buddhy / Dambulla', url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1200&q=80' },
  ],
  nature: [
    { label: 'Sloni / Safari', url: 'https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?auto=format&fit=crop&w=1200&q=80' },
    { label: 'Pláž / Palmy Mirissa', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80' },
    { label: 'Čajové plantáže', url: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80' },
    { label: 'Vodopád', url: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=1200&q=80' },
  ],
  view: [
    { label: 'Nine Arches Bridge (Most)', url: 'https://images.unsplash.com/photo-1566296314736-6eaac1ca0cb9?auto=format&fit=crop&w=1200&q=80' },
    { label: 'Ella Rock Panorama', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80' },
    { label: 'Západ slunce na pláži', url: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=1200&q=80' },
  ],
  food: [
    { label: 'Cejlonské Kari & Rýže', url: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=1200&q=80' },
    { label: 'Kavárna / Čerstvá káva', url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80' },
    { label: 'Čerstvé tropické ovoce', url: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=1200&q=80' },
    { label: 'Mořské plody u pláže', url: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=1200&q=80' },
  ],
  accommodation: [
    { label: 'Plážový resort s bazénem', url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80' },
    { label: 'Útulný pokoj / Hotel', url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80' },
    { label: 'Bungalov v džungli', url: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=80' },
  ],
  transport: [
    { label: 'Modrý vlak v čajových horách', url: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1200&q=80' },
    { label: 'Tuk-tuk na silnici', url: 'https://images.unsplash.com/photo-1559827291-72ee739d0d9a?auto=format&fit=crop&w=1200&q=80' },
    { label: 'Letiště / Letadlo', url: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1200&q=80' },
  ],
  bar: [
    { label: 'Plážový koktejl bar', url: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1200&q=80' },
    { label: 'Mladý kokos na pláži', url: 'https://images.unsplash.com/photo-1543083477-4f785aeafaa9?auto=format&fit=crop&w=1200&q=80' },
  ],
  other: [
    { label: 'Cestovatelská mapa a batoh', url: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80' },
    { label: 'Místní trh a koření', url: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1200&q=80' },
  ],
};
