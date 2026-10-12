# V2 viewer aligned layout

Actual local production build: viewer PR 18795613, editor foundation 06b7a0ab, authoring e9c3978d.

Desktop: 986×961, step 3 of 21, progress 0%, zoom 100%. Mobile: 320×900, same state. Before image: previous production build a6c7ac24, same desktop state.

The viewer recording demonstrates zoom/reset, autoplay after manual step changes, and selecting/unselecting repeat. Keyboard is used for React Aria checkboxes.

Authoring recording demonstrates importing the user's crane.json, inspecting the final step in the shared viewer, returning to editing, saving JSON, and restoring the draft after reload. Authoring screenshots: 986×1100, full page.

Validation: viewer branch 51 files / 298 tests; complete stack 54 files / 307 tests; production and Storybook builds passed. Existing lint/build warnings remain. Browser widths 320, 767, 768, 986, 1280; desktop 200% text and RTL. layout-checks.json contains geometry measurements. No VoiceOver test.
