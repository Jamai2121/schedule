export function drawItemBase(ctx, item, sprite, colorGlow) {
  const bob = Math.sin(item.bobbing) * 4;
  
  ctx.fillStyle = colorGlow;
  ctx.beginPath();
  ctx.arc(item.x, item.y + bob, 18, 0, Math.PI * 2);
  ctx.fill();
  
  if (sprite && sprite.complete) {
    ctx.drawImage(sprite, item.x - 16, item.y - 16 + bob, 32, 32);
  } else {
    // Фоллбэк
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(item.x, item.y + bob, 12, 0, Math.PI * 2);
    ctx.fill();
  }
}