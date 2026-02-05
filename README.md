# GuardianGate

Child safety check-in system for Israeli nurseries, built with TanStack Start and TypeScript with full Hebrew RTL support.

## Features

- 🚀 Built with TanStack Start for modern React development
- 📱 Fully responsive design
- 🌐 Complete Hebrew RTL (Right-to-Left) support
- 🎨 Tailwind CSS for styling
- ⚡ Hot Module Replacement (HMR) for fast development
- 🔒 TypeScript for type safety
- ✅ ESLint for code quality

## Getting Started

### Prerequisites

- Node.js (version 18 or higher recommended)
- npm or pnpm package manager

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

### Development

Start the development server:

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

### Building for Production

Build the application:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

## Project Structure

```
src/
├── routes/          # Route components (file-based routing)
│   ├── __root.tsx   # Root layout with RTL configuration
│   ├── index.tsx    # Home page
│   └── rtl-test.tsx # RTL testing page
├── components/      # Reusable React components
├── utils/           # Utility functions
├── types/           # TypeScript type definitions
├── styles/          # Global styles and CSS
│   └── app.css      # Main stylesheet with RTL support
└── lib/             # Shared library code
```

## RTL (Right-to-Left) Configuration

This project is configured for Hebrew RTL support:

### HTML Configuration

The root HTML element is configured in `src/routes/__root.tsx`:

```tsx
<html dir="rtl" lang="he">
```

### CSS Logical Properties

The project uses CSS logical properties for RTL-compatible layouts in `src/styles/app.css`:

- `margin-inline-start` / `margin-inline-end` - Automatically adapts to text direction
- `padding-inline-start` / `padding-inline-end` - Adjusts padding based on direction
- `border-inline-start` / `border-inline-end` - RTL-aware borders
- `text-align: start` - Aligns to right in RTL, left in LTR

### Testing RTL

Visit [http://localhost:3000/rtl-test](http://localhost:3000/rtl-test) to see comprehensive RTL layout examples.

## Available Scripts

- `npm run dev` - Start development server with HMR
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run typecheck` - Run TypeScript type checking
- `npm run lint` - Run ESLint code quality checks

## Development Workflow

1. **Make changes** to files in `src/`
2. **See updates** automatically via HMR (no manual refresh needed)
3. **Check types** with `npm run typecheck`
4. **Lint code** with `npm run lint`
5. **Commit** when tests pass

## Tech Stack

- **Framework**: [TanStack Start](https://tanstack.com/start) - Full-stack React framework
- **Router**: [TanStack Router](https://tanstack.com/router) - Type-safe file-based routing
- **Language**: [TypeScript](https://www.typescriptlang.org/) - Type safety
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- **Build Tool**: [Vite](https://vitejs.dev/) - Fast development and build tool
- **Linting**: [ESLint](https://eslint.org/) - Code quality

## License

This project is private and proprietary.
