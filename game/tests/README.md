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

Run all progression, integration and real-model tests:

```sh
NODE_PATH=/private/tmp/ship-character-runtime/node_modules node --test game/tests/*.test.cjs
node --test --experimental-test-coverage game/tests/wardrobe.test.cjs
```

The progression module reports 100% line/function coverage and over 98% branch
coverage. This is scoped to `wardrobe.js`, not the whole 3D application.
Integration tests execute the real game callbacks, clothing application,
storage failure handling and modal input guards. Actual model tests check ten
outfits, unchanged facial materials / skeleton, finite locomotion and a fixed
resource pool after 300 equipment changes.

Mobile visual regression check: enter Asia, open the wardrobe, equip the unlocked
Asia outfit and let the list scroll to its card. The close button must remain
inside the visible dialog; measure its DOM rectangle against the dialog bounds.
Before the sticky-button fix this check fails (`closeTop=-356`, `dialogTop=14`).
Also verify the saved outfit and discoveries survive a reload, and that selecting
a different continent leaves the equipped outfit unchanged.

## Character stance and atmosphere

`character-pose.test.cjs` checks the actual shipped skinned character: idle shoes
meet the ground, the torso faces forward, arms rest below the shoulders, facial
layers follow the cheek surface, and walk/run/jump articulation stays finite.
Calf cross-sections must taper without shrinking the knees, and the hoodie must
cover the shoulder band while keeping the upper neck and hands as skin in every
outfit. Eye visibility is ray-tested against the real hair and skin geometry.
The main skin mesh must form the nose bridge, wings, sockets and cheeks itself;
lips must follow that real surface. Head-and-hair proportions and the actual
visible neck connection are checked separately from the nominal object bounds.
The rendered body index must contain no source head-weighted face fragments.
Front and side rays sample multiple neck heights and idle times; hidden outfit
children are excluded by checking the visibility of every ancestor.
`atmosphere.test.cjs` checks linear regional color values, matched sky/fog colors,
and the thin-grass shader contribution without increasing the geometry budget.
CPU shader checks do not compile GLSL: verify the real WebGL scene and console
in the browser, on both desktop and mobile sizes.

Close-up browser checks: wardrobe → near-field preview → continue; repeat from
first-person and verify it is restored. Drag to orbit and press Escape to exit.
Calling the bird or interacting with a nearby NPC must exit the preview rather
than freeze an otherwise active route/dialogue. The visible continue button must
receive keyboard focus; closing it must not leave focus on a hidden element.
Inspect the face from the front and by dragging to orbit: the camera-side fill
must reveal the facial features only during inspection. Continue exploring,
click to run and jump to verify that the normal world lighting and locomotion
remain intact. This is still a stylized model, not a realistic human asset.
Scroll inward twice during inspection to reach facial view: the face must stay
near the centre, and Escape/continue must restore the original exploration view.
Normal exploration keeps its established zoom limits, and first-person/dialogs
must not respond to the portrait zoom gesture.
