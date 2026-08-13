export const INPUT_SIZE = 256;
export const CHANNEL_MEAN = [0.481, 0.458, 0.408] as const;
export const CHANNEL_STD = [0.269, 0.261, 0.276] as const;

export function rgbaToChw(data: Uint8ClampedArray, width = INPUT_SIZE, height = INPUT_SIZE): Float32Array {
  const pixels = width * height;
  if (data.length !== pixels * 4) throw new Error(`Expected ${pixels * 4} RGBA values, received ${data.length}`);
  const output = new Float32Array(pixels * 3);
  for (let pixel = 0; pixel < pixels; pixel += 1) {
    const rgbaOffset = pixel * 4;
    for (let channel = 0; channel < 3; channel += 1) {
      const value = (data[rgbaOffset + channel] ?? 0) / 255;
      output[channel * pixels + pixel] = (value - CHANNEL_MEAN[channel]!) / CHANNEL_STD[channel]!;
    }
  }
  return output;
}

