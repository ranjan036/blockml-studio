// blockml: our own sprites and backdrops in "Choose a Sprite" / "Choose a Backdrop".
// They are files on this site (static/sprites/, static/backdrops/), not on Scratch's asset
// server. Built by extensions/starters/build-lessons.mjs (game-sprites.mjs) and
// build-robotics.mjs (the Arduino board).
import {ARDUINO_SPRITE_ITEM} from './blockml-arduino-sprite.js';

export const BLOCKML_SPRITES = [
    ARDUINO_SPRITE_ITEM,
    {
        name: 'Dino',
        tags: ['animals', 'dinosaur', 'dino', 'game'],
        rawURL: 'sprites/dino.svg',
        blockmlSprite3: 'sprites/dino.sprite3'
    },
    {
        name: 'Cactus',
        tags: ['cactus', 'desert', 'plant', 'game', 'outdoors'],
        rawURL: 'sprites/cactus.svg',
        blockmlSprite3: 'sprites/cactus.sprite3'
    }
];

export const BLOCKML_BACKDROPS = [
    {
        name: 'Dino Desert',
        tags: ['outdoors', 'desert', 'dino', 'game'],
        rawURL: 'backdrops/dino-desert.svg',
        blockmlSvg: 'backdrops/dino-desert.svg',
        rotationCenterX: 240,
        rotationCenterY: 180,
        bitmapResolution: 1
    }
];

const fetchFile = path => fetch(new URL(path, location.href).href).then(res => {
    if (!res.ok) throw new Error(`Could not load ${path} (${res.status})`);
    return res.arrayBuffer();
});

/** Adds one of our .sprite3 library sprites to the project. */
export const addBlockmlSprite = (vm, item) => fetchFile(item.blockmlSprite3).then(buffer => vm.addSprite(buffer));

/** Adds one of our SVG library backdrops to the stage (and switches to it, like Scratch's). */
export const addBlockmlBackdrop = (vm, item) => fetchFile(item.blockmlSvg).then(buffer => {
    const storage = vm.runtime.storage;
    const asset = storage.createAsset(
        storage.AssetType.ImageVector, storage.DataFormat.SVG, new Uint8Array(buffer), null, true
    );
    return vm.addBackdrop(`${asset.assetId}.svg`, {
        name: item.name,
        dataFormat: 'svg',
        asset,
        assetId: asset.assetId,
        md5: `${asset.assetId}.svg`,
        rotationCenterX: item.rotationCenterX,
        rotationCenterY: item.rotationCenterY,
        bitmapResolution: item.bitmapResolution,
        skinId: null
    });
});
