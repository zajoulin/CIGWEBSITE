# Sourcing a licensed 3D cardiovascular model

The platform currently ships a **procedurally generated** model (see
`src/lib/cardio3d/model.ts`). It has no licensing constraints, loads instantly and
is fully interactive, but it is diagrammatic rather than photorealistic.

If CIG wants a realistic anatomical mesh, these are genuinely licensable options.
Every licence below was checked against the publisher's own page while this
platform was built; **re-check before use**, because licence terms change.

---

## 1. NIH 3D (formerly the NIH 3D Print Exchange) — best first stop

- **Site:** <https://3d.nih.gov/>
- **Licensing:** per-model. A substantial number are dedicated to the **public
  domain under CC0 1.0**, which imposes no attribution requirement at all.
- **Example checked:** "Human Heart 3d Model" — <https://3d.nih.gov/entries/3DPX-022787>
  — released as **Public Domain (CC0 1.0)**, author Sourav Pan, submitted 11 July 2025.
- **Why it is the best first stop:** CC0 models can be used, modified and
  redistributed with no obligations, which avoids share-alike complications for
  a student group's website.
- **Caveat:** models are contributed by many authors and vary widely in
  anatomical accuracy and mesh quality. Check each model individually, and check
  its licence individually — not all NIH 3D models are CC0.

## 2. BodyParts3D / Anatomography — a curated anatomical database

- **Source:** The Database Center for Life Science (DBCLS), Japan.
- **Mirror with conversions:** <https://github.com/Kevin-Mattheus-Moerman/BodyParts3D>
- **Licence:** **CC BY-SA 2.1 Japan.**
- **Required attribution (verbatim):**
  > BodyParts3D, © The Database Center for Life Science licensed under
  > CC Attribution-Share Alike 2.1 Japan.
- **Also cite:** Mitsuhashi N, et al. (2009), *Nucleic Acids Research*; and the
  data archive DOI `http://doi.org/10.18908/lsdba.nbdc00837-000`.
- **Formats:** the GitHub mirror provides binary **STL** (converted from the
  original OBJ) with PNG previews. STL has no material or mesh-name data, so
  converting to GLB **and re-naming every mesh** would be required.
- **Important caveat:** the mirror's documentation does not list cardiovascular
  content, and its visible material focuses on skeletal and muscular structures
  from a single male model. **Confirm that the heart and great vessels are
  actually present before planning around this source.**
- **Share-alike consequence:** CC BY-SA is viral. Derivative models must be
  released under the same licence. That is usually fine for an educational site
  but is a real decision, not a formality.

## 3. Z-Anatomy — an open 3D atlas built on BodyParts3D

- **Repository:** <https://github.com/Z-Anatomy/Models-of-human-anatomy>
- **Licence:** **CC BY-SA 4.0**, with the upstream BodyParts3D attribution also
  required.
- **Required attribution (both lines):**
  > BodyParts3D — The Database Center for Life Science — CC-BY-SA 2.1 Japan
  > Z-Anatomy — The libre 3D atlas of anatomy — CC-BY-SA 4.0
- **Strength:** Z-Anatomy names its structures systematically, which is exactly
  what this platform's mesh-name convention needs.
- **Caveat:** the repository ships a single `Z-Anatomy.zip`; the formats inside
  and the extent of cardiovascular detail are not stated on the repository page.
  Download and inspect before committing.

## 4. AnatomyTOOL — an aggregator, not a source

- **Site:** <https://anatomytool.org/open3dmodel>
- Curates openly-licensed anatomical 3D models from many providers, including
  collections of heart models and links to NIH 3D. Useful for discovery; the
  licence always comes from the underlying provider, so check there.

## 5. Sketchfab (CC-BY / CC0 filter)

- Filter to Creative Commons licences and download GLB directly — the most
  convenient format for this platform.
- **Warning:** licences on Sketchfab are set by uploaders and are sometimes wrong,
  and anatomical accuracy of hobbyist models is highly variable. For a medical
  education platform, treat an unverified Sketchfab model as unsuitable unless
  the author is identifiable and the anatomy is checked by someone qualified.

## What to avoid

- Commercial medical model libraries (BioDigital, SciePro, Zygote, Elsevier 3D4Medical)
  unless CIG buys the appropriate licence. Their models are **not** free for
  redistribution on a public website, and embedding one without a licence would
  expose the group.
- Any model whose licence you cannot find. "It was free to download" is not a licence.

---

## Preparing a model for this platform

1. Convert to **GLB** (glTF 2.0 binary). Blender exports it directly.
2. **Name every mesh** to match the `meshName` fields in `content/anatomy/*.json`:

   ```
   heart.right_atrium          heart.tricuspid_valve      vessels.aorta
   heart.left_atrium           heart.mitral_valve         vessels.pulmonary_trunk
   heart.right_ventricle       heart.pulmonary_valve      vessels.pulmonary_arteries
   heart.left_ventricle        heart.aortic_valve         vessels.pulmonary_veins
   heart.interventricular_septum   heart.coronary_arteries    vessels.svc
   heart.interatrial_septum        heart.coronary_veins       vessels.ivc
   heart.sa_node   heart.av_node   heart.bundle_of_his   heart.purkinje_fibers
   vessels.systemic_arteries   vessels.systemic_veins
   ```

   Any mesh not in that list still renders; it simply is not selectable from the
   sidebar. Any name in the list without a mesh simply has no 3D representation —
   its information panel still works.

3. **Decimate.** Aim for well under 200 k triangles in total. Medical scan-derived
   meshes are often in the millions and will make the page unusable on a phone.
4. Orient to the platform's frame: **+X patient's left, +Y superior, +Z anterior**,
   scaled so the heart is roughly 2 units tall.
5. Put the file at `public/models/cardiovascular.glb`.
6. In `src/lib/cardio3d/loader.ts`, set

   ```ts
   export const MODEL_SOURCE: ModelSource = {
     kind: 'gltf',
     url: '/models/cardiovascular.glb',
     attribution: '…the attribution string the licence requires…',
   };
   ```

   and implement `loadGltf`. The renderer only needs, per mesh: a `name`, a
   `Float32Array` of positions, a `Float32Array` of normals and a `Uint32Array`
   of indices. Nothing else in the application changes.
7. Record the licence and attribution in `LICENSES.md` and make sure the
   attribution is **displayed** wherever the licence requires it.
