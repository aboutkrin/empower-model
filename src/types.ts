import { Loan } from './types/parameters';

// Create a new file for types
export interface ModelConfig {
  modelData: {
    capacity: number;
    capacityAnnual: number;
    years: number[];
  };
  yearConfig: {
    startYear: number;
    duration: number;
  };
  capacityUsage: number;
  capacityGrowth: number;
  priceTiers: {
    name: string;
    price: number;
    percentage: number;
  }[];
  priceGrowth: number;
  fixedCosts: {
    name: string;
    cost: number;
    monthly?: boolean;
    annual?: boolean;
    type: string;
    years?: number;
    startYear?: number;
  }[];
  variableCosts: {
    name: string;
    unitCost: number;
    tier?: string;
    all?: boolean;
  }[];
  loans: Loan[];
} 