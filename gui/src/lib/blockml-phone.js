// blockml: a phone is a touch screen with a short side under 500px. On a phone the editor
// drops its 1024x640 minimum, keeps the stage small and asks to be held sideways.
// Keep in step with the @media rules marked "blockml: phone" in the CSS files.
const PHONE_QUERY = '(pointer: coarse) and (max-height: 500px), (pointer: coarse) and (max-width: 500px)';

export {
    PHONE_QUERY
};
