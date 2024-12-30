import { defineConfig } from 'vite';
import { ghPages } from 'vite-plugin-gh-pages';

export default defineConfig({
    base: '/dronexr/', // Name of your GitHub repository
    build: {
        outDir: 'dist', // Specify the output directory for builds
    },
    root: '.', // Set the project root
    plugins: [ghPages()],
});
