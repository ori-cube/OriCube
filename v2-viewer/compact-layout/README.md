# V2 compact viewer layout

Captured from the local production build at a5daf0bceb48182b3864b5aed9bac0ce68ed64a1, including viewer change e066e7fb7eb1206ded6bd67ec590ad61f5661bbb.

- before-desktop.png: previous production build, 986x961 viewport, first step, 100% zoom.
- after-desktop.png: same viewport, first step and 100% zoom.
- after-mobile.png / after-wide.png: 320x900 and 1280x900 viewports.
- completed.png: last step at 100% progress in the same viewer.
- viewer-layout.mp4 / .gif: keyboard-select autoplay, manually advance steps, zoom to 50%, rotate with arrow keys, reset, disable autoplay and play the final step.
- authoring-editor.png / authoring-preview.png: user-recorded crane JSON imported and previewed in the authoring page.
- authoring-layout.mp4 / .gif: import, final-step preview, keyboard-select autoplay, return to editing, export controls, reload and resume.

At 986x961, the playback area height changes from 198.09px to 105px, and the canvas height from 405.14px to 587.22px. The play button ends at x=60 and the slider thumb starts at x=62 at 0% progress; their hit areas do not overlap.

Layout also checked at 200% text size and in an RTL mirror. The UI uses the authentic user-recorded crane history.
