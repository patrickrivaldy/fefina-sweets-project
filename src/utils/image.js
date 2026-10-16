// Kompres foto sebelum diupload: HP sering menghasilkan 3-8MB per foto,
// grid kasir akan lemot kalau me-load banyak file sebesar itu sekaligus.
// Fungsi ini mengecilkan ke max 1024px (JPEG ~80%) → biasanya tinggal 100-200KB.
export function compressImage(file, maxDim = 1024, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file?.type?.startsWith("image/")) {
      reject(new Error("File harus berupa gambar."));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      const scale = Math.min(1, maxDim / Math.max(width, height));
      width = Math.round(width * scale);
      height = Math.round(height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Gagal mengompres gambar."));
            return;
          }
          const name = (file.name.split(".")[0] || "foto") + ".jpg";
          resolve(new File([blob], name, { type: "image/jpeg" }));
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("File gambar tidak bisa dibaca."));
    };
    img.src = url;
  });
}
