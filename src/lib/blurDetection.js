/**
 * Checks if an image file is blurry using Laplacian variance.
 * Returns { blurry: boolean, score: number }.
 * Score < 100 typically indicates blur.
 */
export async function checkImageBlur(file) {
  if (!file.type.startsWith('image/')) return { blurry: false, score: 0 };

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const maxDim = 200;
        const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const w = canvas.width;
        const h = canvas.height;

        // Convert to grayscale
        const gray = new Float32Array(w * h);
        for (let i = 0, j = 0; i < data.length; i += 4, j++) {
          gray[j] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        }

        // Compute Laplacian variance (sharpness metric)
        let sum = 0, sumSq = 0, count = 0;
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const idx = y * w + x;
            const lap = gray[idx - w] + gray[idx + w] + gray[idx - 1] + gray[idx + 1] - 4 * gray[idx];
            sum += lap;
            sumSq += lap * lap;
            count++;
          }
        }

        const variance = count > 0 ? sumSq / count - (sum * sum) / (count * count) : 0;
        URL.revokeObjectURL(img.src);
        resolve({ blurry: variance < 100, score: Math.round(variance) });
      } catch {
        URL.revokeObjectURL(img.src);
        resolve({ blurry: false, score: 0 });
      }
    };
    img.onerror = () => resolve({ blurry: false, score: 0 });
    img.src = URL.createObjectURL(file);
  });
}