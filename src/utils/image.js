const DEFAULT_OPTIONS = {
  maxDimension: 1024,
  quality: 0.82,
  minQuality: 0.58,
  maxSizeBytes: 500 * 1024,
  maxInputBytes: 20 * 1024 * 1024,
  minDimension: 256,
  maxAttempts: 12,
};

const SUPPORTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("File gambar tidak bisa dibaca. Coba gunakan JPG, PNG, atau WEBP."));
    image.src = url;
  });
}

function canvasToBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Gagal mengompres gambar. Silakan pilih foto lain."));
      },
      "image/jpeg",
      quality
    );
  });
}

/**
 * Mengubah foto menjadi JPEG, membatasi dimensi maksimal, dan menurunkan
 * kualitas/resolusi bertahap sampai ukuran file berada di bawah batas target.
 */
export async function compressImage(file, options = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };

  if (!file) throw new Error("Pilih foto produk terlebih dahulu.");
  if (!SUPPORTED_TYPES.has(file.type)) {
    throw new Error("Format foto belum didukung. Gunakan JPG, PNG, atau WEBP.");
  }
  if (file.size > config.maxInputBytes) {
    throw new Error(`Ukuran foto sumber terlalu besar (${formatFileSize(file.size)}). Maksimal 20 MB.`);
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;

    if (!sourceWidth || !sourceHeight) {
      throw new Error("Dimensi foto tidak valid. Silakan pilih foto lain.");
    }

    const initialScale = Math.min(1, config.maxDimension / Math.max(sourceWidth, sourceHeight));
    let width = Math.max(1, Math.round(sourceWidth * initialScale));
    let height = Math.max(1, Math.round(sourceHeight * initialScale));
    let quality = config.quality;
    let blob = null;

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Browser tidak mendukung pemrosesan foto.");

    for (let attempt = 0; attempt < config.maxAttempts; attempt += 1) {
      canvas.width = width;
      canvas.height = height;

      // Latar putih menjaga bagian transparan PNG tidak berubah menjadi hitam.
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);

      blob = await canvasToBlob(canvas, quality);
      if (blob.size <= config.maxSizeBytes) break;

      if (quality > config.minQuality) {
        quality = Math.max(config.minQuality, Number((quality - 0.08).toFixed(2)));
      } else if (Math.max(width, height) > config.minDimension) {
        width = Math.max(1, Math.round(width * 0.85));
        height = Math.max(1, Math.round(height * 0.85));
        quality = config.quality;
      } else {
        break;
      }
    }

    if (!blob) throw new Error("Gagal mengompres gambar.");
    if (blob.size > config.maxSizeBytes) {
      throw new Error(
        `Foto masih terlalu besar setelah dikompres (${formatFileSize(blob.size)}). Pilih foto lain dengan detail atau resolusi lebih rendah.`
      );
    }

    const baseName = (file.name || "foto-produk").replace(/\.[^.]+$/, "").trim() || "foto-produk";
    return new File([blob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
