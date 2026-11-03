export class FaceAlignment {
  private static readonly TARGET_SIZE = 112;
  private static readonly MEAN_VALUE = 127.5;
  private static readonly STD_VALUE = 127.5;

  static alignFace(
    imageData: ImageData,
    landmarks: {leftEye: {x: number; y: number}; rightEye: {x: number; y: number}}
  ): ImageData | null {
    try {
      const eyeCenter = {
        x: (landmarks.leftEye.x + landmarks.rightEye.x) / 2,
        y: (landmarks.leftEye.y + landmarks.rightEye.y) / 2
      };

      const eyeDistance = Math.hypot(
        landmarks.rightEye.x - landmarks.leftEye.x,
        landmarks.rightEye.y - landmarks.leftEye.y
      );

      const desiredDistance = this.TARGET_SIZE * 0.45;
      const scale = desiredDistance / eyeDistance;

      const angle = Math.atan2(
        landmarks.rightEye.y - landmarks.leftEye.y,
        landmarks.rightEye.x - landmarks.leftEye.x
      );

      const alignedImage = this.warpAffine(
        imageData,
        eyeCenter,
        scale,
        angle,
        this.TARGET_SIZE
      );

      return alignedImage;
    } catch (error) {
      console.error('Face alignment failed:', error);
      return null;
    }
  }

  private static warpAffine(
    imageData: ImageData,
    center: {x: number; y: number},
    scale: number,
    angle: number,
    targetSize: number
  ): ImageData {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    
    const transform = (x: number, y: number): {x: number; y: number} => {
      const dx = x - center.x;
      const dy = y - center.y;
      const rotatedX = dx * cos + dy * sin;
      const rotatedY = -dx * sin + dy * cos;
      const scaledX = rotatedX * scale;
      const scaledY = rotatedY * scale;
      return {
        x: scaledX + targetSize / 2,
        y: scaledY + targetSize / 2
      };
    };

    const canvas = document.createElement('canvas');
    canvas.width = targetSize;
    canvas.height = targetSize;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    const img = new ImageData(imageData.data, imageData.width, imageData.height);
    ctx.putImageData(img, 0, 0);
    
    const alignedCanvas = document.createElement('canvas');
    alignedCanvas.width = targetSize;
    alignedCanvas.height = targetSize;
    const alignedCtx = alignedCanvas.getContext('2d');
    
    if (!alignedCtx) {
      throw new Error('Could not get aligned canvas context');
    }

    for (let y = 0; y < targetSize; y++) {
      for (let x = 0; x < targetSize; x++) {
        const src = transform(x, y);
        if (src.x >= 0 && src.x < imageData.width && src.y >= 0 && src.y < imageData.height) {
          const srcIndex = Math.floor(src.y) * imageData.width + Math.floor(src.x);
          const dstIndex = y * targetSize + x;
          alignedCtx.fillStyle = `rgba(${img.data[srcIndex * 4]}, ${img.data[srcIndex * 4 + 1]}, ${img.data[srcIndex * 4 + 2]}, ${img.data[srcIndex * 4 + 3]})`;
          alignedCtx.fillRect(x, y, 1, 1);
        }
      }
    }

    return alignedCtx.getImageData(0, 0, targetSize, targetSize);
  }

  static preprocessForTFLite(imageData: ImageData): Float32Array {
    const input = new Float32Array(1 * 112 * 112 * 3);
    
    for (let i = 0; i < 112 * 112; i++) {
      const r = imageData.data[i * 4] / this.STD_VALUE - 1.0;
      const g = imageData.data[i * 4 + 1] / this.STD_VALUE - 1.0;
      const b = imageData.data[i * 4 + 2] / this.STD_VALUE - 1.0;
      
      input[i * 3] = r;
      input[i * 3 + 1] = g;
      input[i * 3 + 2] = b;
    }
    
    return input;
  }
}