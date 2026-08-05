import { defineConfig } from 'vite';

// Build the quiz as ONE self-contained IIFE file that Squarespace can load from a
// Code Block. CSS is imported with `?inline` inside the widget and injected at
// runtime, so there is no separate stylesheet to host. data.json is imported at
// build time, so the widget needs no network fetch to run.
export default defineConfig({
  build: {
    // Emit straight into preview/ so preview/index.html can load ./kismet-quiz.v1.js.
    // This same file is what you upload to Squarespace (see README).
    outDir: 'preview',
    emptyOutDir: false, // keep preview/index.html
    cssCodeSplit: false,
    lib: {
      entry: 'src/main.js',
      name: 'KismetQuiz',
      formats: ['iife'],
      fileName: () => 'kismet-quiz.v1.js',
    },
    rollupOptions: {
      output: {
        entryFileNames: 'kismet-quiz.v1.js',
        // Inline everything — never split.
        inlineDynamicImports: true,
      },
    },
  },
});
