# Teenage explorer

The youthful East Asian-styled face, tousled black hair, blue-gray hoodie with
hood / drawstrings / pocket, casual trousers and light sneakers are original
geometry / material work for this game. The original Michelle head geometry
is removed from the rendered mesh. The bind-pose body vertices are reshaped
with narrower hips and a straighter chest / waist silhouette; the teenage
character is not solely a smaller or recolored adult model. The visible standing
silhouette is approximately 1.54 meters in the idle animation pose. The nose,
eye sockets, cheek transitions and chin are sculpted into one continuous head
surface, with subtle vertex-color skin warmth rather than separate nose spheres.
The smaller head has approximately 6.5-head visible teenage proportions; lips
follow the actual face surface. This remains a stylized procedural character,
without photographic skin textures or facial expression animation.
Source head-weighted triangles, including lower-jaw remnants, are removed from
the rendered index. An original tapered neck is attached to the neck bone to
connect the new head and collar without changing the animation skeleton.

Skin micro-grain, directional hair strands and cloth weave are original,
deterministic 128×128 data textures. They use Three.js built-in physical
materials, not a custom shader or downloaded photographic textures. Skin and
clothing have separate body draw groups so hands are not woven fabric; brows
and eye whites retain their untextured materials. Five fixed texture objects
share three pixel sources (approximately 192 KiB of uncompressed source data).
Outfit changes reuse these resources. The body split adds one draw call without
adding meshes or changing geometry, skin weights or animation transforms.

The original body topology and bone rig remain the embedded Adobe / Mixamo reference,
with the existing Idle / Walk / Run animation transfer. See [CREDITS.md](CREDITS.md)
for the original asset sources and third-party usage terms.

Procedural NPCs can select individual skin tones, face styling, clothing colors
and short / curly hairstyles. Region palettes are art direction, not a claim
that a continent has only one ethnic group or skin color.

Growth and regional clothing decorations are original procedural geometry:
scarves, coat lapels, shoulder capes, piping, badges and woven-color panels.
All clothing variants reuse a fixed character-owned set of geometry/materials;
equipping outfits does not modify the face, skin color, stature or animation rig.
The seven regional travel outfits are fictional port-inspired designs, not
representations of an entire continent's traditional dress.
