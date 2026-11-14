const { compile, optimize } = require('@tailwindcss/node');
const { Scanner } = require('@tailwindcss/oxide');
const fs = require('fs');
const path = require('path');

async function buildCss() {
  const rootDir = path.resolve(__dirname, '..');
  const inputCssPath = path.join(rootDir, 'app', 'globals.source.css');
  const outputCssPath = path.join(rootDir, 'app', 'globals.css');

  console.log('Compiling Tailwind CSS from:', inputCssPath);

  let inputCss = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');
@import "tailwindcss";

:root {
  --background: #f8fafc;
  --foreground: #0f172a;
  --primary: #006B3E;
  --primary-hover: #005632;
  --primary-dark: #003822;
  --secondary: #1e3a8a;
  --surface: #ffffff;
  --border: #e2e8f0;
  --font-poppins: 'Poppins', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

body, button, input, select, textarea {
  font-family: 'Poppins', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

body {
  background-color: var(--background);
  color: var(--foreground);
  -webkit-font-smoothing: antialiased;
  -webkit-tap-highlight-color: transparent;
}

/* Hide scrollbars on mobile pills */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* Mobile App Native Feel */
@media (max-width: 768px) {
  input, select, textarea, button {
    font-size: 16px !important; /* Prevents auto-zoom on iOS */
  }
}

input, select, textarea {
  accent-color: #006B3E;
}

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: #f1f5f9;
}
::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
`;

  const compiler = await compile(inputCss, {
    base: rootDir,
    from: inputCssPath,
    onDependency: (dep) => {},
  });

  const scanner = new Scanner({
    sources: [
      { base: path.join(rootDir, 'app'), pattern: '**/*.{js,ts,jsx,tsx}', negated: false },
      { base: path.join(rootDir, 'components'), pattern: '**/*.{js,ts,jsx,tsx}', negated: false },
      { base: path.join(rootDir, 'lib'), pattern: '**/*.{js,ts,jsx,tsx}', negated: false },
    ],
  });

  const candidates = scanner.scan();
  console.log(`Scanned ${candidates.length} Tailwind utility candidate classes.`);

  const builtCss = compiler.build(candidates);
  console.log(`Generated raw CSS length: ${builtCss.length} bytes.`);

  const optimized = optimize(builtCss, { minify: false }).code;
  console.log(`Optimized CSS length: ${optimized.length} bytes.`);

  fs.writeFileSync(outputCssPath, optimized, 'utf8');
  console.log('Successfully written to:', outputCssPath);
}

buildCss().catch((err) => {
  console.error('Failed to compile Tailwind CSS:', err);
  process.exit(1);
});
