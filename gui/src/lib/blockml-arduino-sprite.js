// blockml: the "Arduino" sprite (an Uno board; costumes "uno" and "uno L on").
// Built by extensions/starters/build-robotics.mjs into static/sprites/. It is in the sprite
// library, and adding the Arduino extension adds it to a project that has none.

export const ARDUINO_SPRITE_ITEM = {
    name: 'Arduino Uno',
    tags: ['arduino', 'robot', 'robotics'],
    rawURL: 'sprites/arduino-uno.svg',
    blockmlSprite3: 'sprites/arduino-uno.sprite3'
};

export const hasArduinoSprite = vm => vm.runtime.targets.some(
    t => t.isOriginal && !t.isStage && t.getName() === 'Arduino'
);

export const addArduinoSprite = vm => fetch(new URL(ARDUINO_SPRITE_ITEM.blockmlSprite3, location.href).href)
    .then(res => {
        if (!res.ok) throw new Error(`Could not load the Arduino sprite (${res.status})`);
        return res.arrayBuffer();
    })
    .then(buffer => vm.addSprite(buffer));
