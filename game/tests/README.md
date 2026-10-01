# Companion model tests

Run with Node's built-in test runner and Three.js r170:

```sh
NODE_PATH=/private/tmp/ship-character-runtime/node_modules node --test game/tests/companions.test.cjs
```

No browser, network access, or repository `package.json` is needed. `NODE_PATH`
may point to another installed `three@0.170.0` runtime. The test does not install
dependencies or change production files.

The tests parse the committed GLB geometry, skeleton and animation data, then
execute the real `loadAgentCharacter()` code. Embedded image/material loading is
omitted only in the CPU parser. Character geometry and the production clothing,
head and locomotion code are not mocked.

Bird tests execute the real `makeGuideSpirit()` and `animateGuideSpirit()`
declarations from `game.js` with actual Three meshes. Browser startup is omitted.
They check visible wing/beak/tail geometry, finite motion and stable
reduced-motion poses, rather than checking source-text contents.

Browser QA is still required for appearance, first/third-person cameras, clicking
to run, guide routing and switching continents. These CPU tests do not establish
visual quality or whole-application coverage.
