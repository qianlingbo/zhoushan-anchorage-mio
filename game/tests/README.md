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

For raw execution-range evidence, set `NODE_V8_COVERAGE` to a temporary directory
when running the command. V8 records both the dynamically imported character
module and the executed game-function declarations. Node's formatted
`--experimental-test-coverage` report may omit these dynamic scripts; an empty
file table showing “100%” is not valid production coverage evidence.

## Growth wardrobe

```sh
node --test game/tests/wardrobe.test.cjs
```

Wardrobe tests require no external dependency. They import the real progression
module and verify unique discovery/encounter XP, all seven regional unlocks in
free visiting order, growth-tier upgrades, manual regional selection and
validated version-one JSON saves. Stored XP and unlocked lists are never a
source of authority. The actual border-control location ID is `immigration`.
