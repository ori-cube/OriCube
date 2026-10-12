# Floating viewer controls

Actual local production build: FloatingPanel 752a3fc4, viewer a5d8e090, editor foundation de524581, authoring e5823c40.

Desktop: 986×961, step 3 of 21, progress 0%, zoom 100%. Mobile: 320×900, same state. Before image: aligned layout e9c3978d, same desktop state. Canvas covers the viewer; only the viewport between the measured upper/lower panels draws the paper.

Viewer recording: zoom, arrow-key rotation, reset, autoplay after manual step change, selecting and unselecting repeat. Keyboard is used for React Aria checkboxes. Authoring recording: import the user's crane.json, view the final step, return to editing, save JSON, and restore the draft after reload. Authoring screenshots: 986×1100, full page.

FloatingPanel screenshots: built Storybook Default, 640×360, unfocused and keyboard focus on the nested button. FloatingPanel branch standalone typecheck passed using its archived sources and the existing dependency runtime.

Viewer: 51 files / 300 tests; complete stack: 54 files / 309 tests. Production/Storybook builds and design-system typecheck passed. Existing build/lint warnings remain. Browser widths 320, 767, 768, 986, 1280; desktop 200% text and RTL. layout-checks.json includes real WebGL viewport and pointer-hit measurements. No VoiceOver test.
