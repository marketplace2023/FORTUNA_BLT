# Racing 3D assets

## Horse model

**Horse**, by **Quaternius**, Public Domain / **CC0 1.0**.

- Creator listing and license: https://poly.pizza/m/qvTrSG9pZF
- CC0: https://creativecommons.org/publicdomain/zero/1.0/
- GLB conversion mirror used for download: https://github.com/trebeljahr/quaternius-showcase/blob/main/public/glb/animals_pack/Horse.glb
- Downloaded file: `horse.glb`. Includes the skeletal gallop animation.

Runtime modifications: normalized scale, recalculated smooth vertex normals, eight coat colors, original saddlecloths and jockey geometry. No model, texture, frame or video from the user's Kiron reference is included in the game.

## Three.js

Three.js **r180**, MIT license. Vendored files in `public/vendor/three/`.

- Source: https://github.com/mrdoob/three.js/tree/r180
- License: `public/vendor/three/LICENSE`
- GLTFLoader, SkeletonUtils and BufferGeometryUtils imports are adjusted to relative local paths. No CDN is required at runtime.

## Original artwork

`woodland.png` was generated using the built-in image_gen tool for this project. The original prompt is documented in `docs/hipodromo-royale.md`.
