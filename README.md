# Empower Model - Financial Analysis Tool

A comprehensive financial modeling and analysis tool built with React, TypeScript, and Vite. This application helps businesses perform detailed financial analysis, including break-even analysis, cash flow projections, and investment metrics.

## Features

- **Financial Dashboard**: Visual overview of key financial metrics
- **Break-even Analysis**: Calculate break-even points with and without debt
- **Cash Flow Projections**: Detailed cash flow analysis over time
- **Product Cost Analysis**: Breakdown of product costs and margins
- **Loan Management**: Track and analyze loan payments and schedules
- **Scenario Analysis**: Compare base, optimistic, and pessimistic scenarios
- **What-if Analysis**: Test different financial scenarios
- **Data Export/Import**: Save and load financial models

## Technical Stack

- **Frontend**: React 19, TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Markdown Support**: Marked
- **Development Tools**: ESLint, TypeScript

## Getting Started

### Prerequisites

- Node.js (version 18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/aboutkrin/empower-model.git
cd empower-model
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Create a `.env` file in the root directory:
```env
VITE_ANTHROPIC_API_KEY=your_api_key_here
```

4. Start the development server:
```bash
npm run dev
# or
yarn dev
```

The application will be available at `http://localhost:5173`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## Project Structure

```
empower-model/
├── src/
│   ├── components/     # React components
│   ├── types/         # TypeScript type definitions
│   ├── utils/         # Utility functions
│   ├── App.tsx        # Main application component
│   └── main.tsx       # Application entry point
├── public/            # Static assets
├── index.html         # HTML template
├── package.json       # Project dependencies
├── tsconfig.json      # TypeScript configuration
└── vite.config.ts     # Vite configuration
```

## Key Features in Detail

### Financial Analysis
- Break-even point calculation
- Cash flow projections
- Investment metrics (NPV, IRR, Payback Period)
- Product cost breakdown
- Loan amortization schedules

### Data Management
- Save and load financial models
- Export/import functionality
- Scenario comparison
- What-if analysis

### Visualization
- Interactive charts and graphs
- Financial metrics dashboard
- Trend analysis
- Comparative analysis

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [React](https://reactjs.org/)
- [Vite](https://vitejs.dev/)
- [Recharts](https://recharts.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [TypeScript](https://www.typescriptlang.org/)
