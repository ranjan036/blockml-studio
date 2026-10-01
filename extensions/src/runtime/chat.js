// BlockML Studio chat runtime (MIT). Used by the Chat AI extension: runs a small
// open chat model on this device's graphics chip (WebLLM + WebGPU, in chat-engine.js,
// loaded on first use), and exports our safety check (features/chat-safety.js).
//
// The model files are not ours to host: the weights come from the model's public
// Hugging Face repository (mlc-ai, Apache-2.0) and the compiled model code from
// MLC's binary-mlc-llm-libs on GitHub, downloaded once and kept in the browser's
// cache. Nothing typed is ever sent anywhere: the chat runs on this device.
export { checkQuestion, checkAnswer, REPLIES } from '../features/chat-safety.js';

const HERE = import.meta.url.slice(0, import.meta.url.lastIndexOf('/') + 1);
const LIBS = 'https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_84/base/';

// "small" (276 MB) is the default everywhere: on the test laptop it answered in 1–2 s,
// while "big" (840 MB, better and safer on its own) took 6–28 s once the laptop was warm.
// A project can still choose "big" for a strong computer.
export const MODELS = {
  big: {
    model: 'https://huggingface.co/mlc-ai/Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
    model_id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
    model_lib: LIBS + 'Qwen2-1.5B-Instruct-q4f16_1_cs1k-webgpu.wasm',
    low_resource_required: true,
    vram_required_MB: 1629.75,
    overrides: { context_window_size: 2048 },
    sizeMB: 840,
  },
  small: {
    model: 'https://huggingface.co/mlc-ai/Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
    model_id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
    model_lib: LIBS + 'Qwen2-0.5B-Instruct-q4f16_1_cs1k-webgpu.wasm',
    low_resource_required: true,
    vram_required_MB: 944.62,
    overrides: { context_window_size: 2048 },
    sizeMB: 276,
  },
};

export const defaultModel = () => 'small';

/** Whether this browser can run the chat model at all (it needs WebGPU). */
export async function hasWebGPU() {
  try {
    return !!(navigator.gpu && (await navigator.gpu.requestAdapter()));
  } catch {
    return false;
  }
}

/**
 * Starts the chat model (downloading it the first time).
 * @param {'big'|'small'} size
 * @param {(fraction: number, text: string) => void} onProgress
 */
export async function loadChat(size, onProgress) {
  const { sizeMB, ...record } = MODELS[size];
  const { createEngine } = await import(HERE + 'chat-engine.js');
  const engine = await createEngine(record, onProgress);
  // The first answer also prepares the graphics chip (several seconds): do it now, not
  // when a student asks.
  await engine.reply([{ role: 'user', content: 'Hi' }], 1);
  return { size, reply: (messages, maxTokens) => engine.reply(messages, maxTokens), unload: () => engine.unload() };
}
