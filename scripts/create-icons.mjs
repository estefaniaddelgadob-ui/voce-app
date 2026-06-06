import { createCanvas } from 'canvas';
import { writeFileSync, mkdirSync } from 'fs';

function createIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Rounded rectangle background
  const radius = size / 5;
  ctx.fillStyle = '#6366F1';
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fill();

  // Soundwave bars
  const heights = [0.28, 0.52, 0.72, 0.52, 0.28];
  const barWidth = size * 0.07;
  const gap = size * 0.05;
  const totalWidth = heights.length * barWidth +
    (heights.length - 1) * gap;
  const startX = (size - totalWidth) / 2;
  const cx = size / 2;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  heights.forEach((h, i) => {
    const barH = size * h;
    const x = startX + i * (barWidth + gap);
    const y = cx - barH / 2;
    const r = barWidth / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + barWidth - r, y);
    ctx.quadraticCurveTo(x + barWidth, y,
      x + barWidth, y + r);
    ctx.lineTo(x + barWidth, y + barH - r);
    ctx.quadraticCurveTo(x + barWidth, y + barH,
      x + barWidth - r, y + barH);
    ctx.lineTo(x + r, y + barH);
    ctx.quadraticCurveTo(x, y + barH, x, y + barH - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
  });

  return canvas.toBuffer('image/png');
}

mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon-192.png', createIcon(192));
writeFileSync('public/icons/icon-512.png', createIcon(512));
console.log('Icons created!');
