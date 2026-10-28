import { TILE, ROOM_COLS, ROOM_ROWS, TILE_DOOR_TOP, TILE_DOOR_BOTTOM, TILE_DOOR_LEFT, TILE_DOOR_RIGHT, TILE_EXIT_DOOR, SPRITES, COLORS, gameState } from '../core/state.js';
import { getRoomData } from '../map/build.js';

export function drawDoors(ctx, room, areDoorsLocked) {
  const locked = areDoorsLocked();

  for (let r = 0; r < ROOM_ROWS; r++) {
    for (let c = 0; c < ROOM_COLS; c++) {
      const t = room[r][c];

      if (t >= TILE_DOOR_TOP && t <= TILE_DOOR_RIGHT) {
        let angle = 0;
        if (t === TILE_DOOR_TOP) angle = 0;
        if (t === TILE_DOOR_RIGHT) angle = Math.PI / 2;
        if (t === TILE_DOOR_BOTTOM) angle = Math.PI;
        if (t === TILE_DOOR_LEFT) angle = -Math.PI / 2;

        drawDoor(ctx, c * TILE, r * TILE, angle, locked);
      }

      if (t === TILE_EXIT_DOOR) {
        let angle = 0;
        if (r === 0) angle = 0;
        else if (r === ROOM_ROWS - 1) angle = Math.PI;
        else if (c === 0) angle = -Math.PI / 2;
        else if (c === ROOM_COLS - 1) angle = Math.PI / 2;

        if (locked) {
          drawDoor(ctx, c * TILE, r * TILE, angle, true);
        } else {
          drawExitDoor(ctx, c * TILE, r * TILE, angle);
        }
      }
    }
  }
}

function drawDoor(ctx, x, y, angle, isLocked) {
  let img = SPRITES.doorNormal;

  if (isLocked) {
    img = SPRITES.doorClose;
  } else {
    let targetX = gameState.currentRoom.x;
    let targetY = gameState.currentRoom.y;

    if (y === 0) targetY -= 1;
    else if (y === (ROOM_ROWS - 1) * TILE) targetY += 1;
    else if (x === 0) targetX -= 1;
    else if (x === (ROOM_COLS - 1) * TILE) targetX += 1;

    const currentRoom = getRoomData(gameState.mapRooms, gameState.currentRoom.x, gameState.currentRoom.y);
    const targetRoom = getRoomData(gameState.mapRooms, targetX, targetY);

    if (currentRoom && currentRoom.type === 'chest') {
      img = SPRITES.doorChest;
    } else if (targetRoom) {
      if (targetRoom.type === 'boss') img = SPRITES.doorBoss;
      else if (targetRoom.type === 'chest') img = SPRITES.doorChest;
    }
  }

  if (img && img.complete) {
    ctx.save();
    ctx.translate(x + TILE / 2, y + TILE / 2);
    ctx.rotate(angle);
    ctx.drawImage(img, -TILE / 2, -TILE / 2, TILE, TILE);
    ctx.restore();
  } else {
    ctx.fillStyle = isLocked ? '#ef4444' : COLORS.door;
    ctx.fillRect(x, y, TILE, TILE);
  }
}

function drawExitDoor(ctx, x, y, angle) {
  const img = SPRITES.doorExit;
  if (img && img.complete) {
    ctx.save();
    ctx.translate(x + TILE / 2, y + TILE / 2);
    ctx.rotate(angle);
    ctx.drawImage(img, -TILE / 2, -TILE / 2, TILE, TILE);
    ctx.restore();
  } else {
    ctx.fillStyle = COLORS.exitDoor;
    ctx.fillRect(x, y, TILE, TILE);
  }
}