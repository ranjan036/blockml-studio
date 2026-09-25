# BlockML Studio

A free, open-source Scratch-style editor with AI blocks (image models you
train yourself, object detection, face, hand and pose), built for CODE AI
students. All AI runs on the student's own laptop: no accounts, no per-use
costs, and camera images never leave the device.

**Status:** S0 (benchmarking the AI models on CODE AI laptops). Milestones:
S0 benchmark → S1 editor live at studio.blockml.codeai.ltd → S2 Face + Hand &
Pose blocks → S3 Image Model trainer → S4 Object Detection → S5 starter
projects and lesson cards → S6 export AI projects as Android apps.

## What's here now

- [`bench/`](bench/) — **S0 benchmark**: measures every candidate vision model
  (TensorFlow.js) on a real laptop — speed, load time, memory, two models
  together next to a running project, Image Model training time — and logs
  every network request the page makes. Published at
  https://ranjan036.github.io/blockml-studio/.

Run it locally:

```
cd bench
npm install
npm run dev        # add ?quick to the URL for a short smoke test
```

## License

GPL-3.0 (see [LICENSE](LICENSE)). The studio will be a fork of the TurboWarp
editor, which is GPL-3.0. BlockML Studio is not affiliated with or endorsed
by TurboWarp or the Scratch Foundation.
