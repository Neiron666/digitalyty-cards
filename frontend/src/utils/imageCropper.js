function createImage(url) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener("load", () => resolve(image));
        image.addEventListener("error", (err) => reject(err));
        image.setAttribute("crossOrigin", "anonymous");
        image.src = url;
    });
}

function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
}

/**
 * @param {{
 *   imageSrc: string,
 *   cropPixels: {x:number,y:number,width:number,height:number},
 *   outputWidth: number,
 *   outputHeight: number,
 *   mimeType?: string,
 *   quality?: number
 * }} params
 */
export async function getCroppedBlob({
    imageSrc,
    cropPixels,
    outputWidth,
    outputHeight,
    mimeType = "image/jpeg",
    quality = 0.92,
}) {
    const image = await createImage(imageSrc);

    const canvas = document.createElement("canvas");
    canvas.width = outputWidth;
    canvas.height = outputHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context not available");

    const sx = clamp(cropPixels.x, 0, image.width);
    const sy = clamp(cropPixels.y, 0, image.height);
    const sw = clamp(cropPixels.width, 0, image.width - sx);
    const sh = clamp(cropPixels.height, 0, image.height - sy);

    ctx.drawImage(image, sx, sy, sw, sh, 0, 0, outputWidth, outputHeight);

    const blob = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b), mimeType, clamp(quality, 0, 1))
    );

    if (!blob) throw new Error("Failed to crop image");
    return blob;
}
