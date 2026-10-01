// BlockML Studio chat engine (MIT): WebLLM (Apache-2.0) on this device's graphics chip.
// Loaded by chat-runtime.js only when a project uses the Chat AI. (It runs in the page:
// in a Web Worker the same model answered about three times slower in our tests.)
// A low temperature keeps answers close to what the role says.
import { CreateMLCEngine } from '@mlc-ai/web-llm';

export async function createEngine(record, onProgress) {
  const engine = await CreateMLCEngine(record.model_id, {
    appConfig: { model_list: [record] },
    initProgressCallback: (p) => onProgress(p.progress, p.text),
  });
  return {
    async reply(messages, maxTokens) {
      const r = await engine.chat.completions.create({ messages, max_tokens: maxTokens, temperature: 0.3 });
      return (r.choices[0].message.content || '').trim();
    },
    unload: () => engine.unload(),
  };
}
