export function generateSineWav(seconds = 1, sr = 16000, freq = 110): Buffer {
  const len = Math.floor(seconds * sr);
  const data = new Float32Array(len);
  for (let i = 0; i < len; i++) data[i] = Math.sin(2 * Math.PI * freq * (i / sr)) * 0.3;

  const numChannels = 1, bytesPerSample = 4;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sr * blockAlign;
  const dataSize = data.length * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(3, 20); // IEEE float
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sr, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(32, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  let off = 44;
  for (let i = 0; i < data.length; i++, off += 4) buffer.writeFloatLE(data[i], off);
  return buffer;
}

