import {BLOCKML_SPRITES, BLOCKML_BACKDROPS} from '../blockml-library.js';

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
        .then(mod => ({default: [...BLOCKML_BACKDROPS, ...mod.default]}))
);
export const getCostumeLibrary = asyncLibrary(
    () => import(/* webpackChunkName: "library-costumes" */ './costumes.json')
);
export const getSoundLibrary = asyncLibrary(
    () => import(/* webpackChunkName: "library-sounds" */ './sounds.json')
);
// blockml: our own sprites and backdrops come first (see ../blockml-library.js).
export const getSpriteLibrary = asyncLibrary(
    () => import(/* webpackChunkName: "library-sprites" */ './sprites.json')
        .then(mod => ({default: [...BLOCKML_SPRITES, ...mod.default]}))
);
