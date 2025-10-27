// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  // optional in v4, but handy if you keep UI in these dirs
  content: [
    './app/**/*.{ts,tsx,js,jsx}',
    './components/**/*.{ts,tsx,js,jsx}',
    './src/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
