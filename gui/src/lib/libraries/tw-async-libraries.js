import {ARDUINO_SPRITE_ITEM} from '../blockml-arduino-sprite.js';

const asyncLibrary = callback => {
    let data = null;
    return () => {
        if (data) return data;
        return callback()
            .then(mod => (data = mod.default));
    };
};

export const getBackdropLibrary = asyncLibrary(
    () => import(/* webpackChunkName: "library-backdrops" */ './backdrops.json')
);
export const getCostumeLibrary = asyncLibrary(
    () => import(/* webpackChunkName: "library-costumes" */ './costumes.json')
);
export const getSoundLibrary = asyncLibrary(
    () => import(/* webpackChunkName: "library-sounds" */ './sounds.json')
);
// blockml: the Arduino board sprite comes first (see ../blockml-arduino-sprite.js).
export const getSpriteLibrary = asyncLibrary(
    () => import(/* webpackChunkName: "library-sprites" */ './sprites.json')
        .then(mod => ({default: [ARDUINO_SPRITE_ITEM, ...mod.default]}))
);
