export interface ModelData {
  capacity: number;
  capacityAnnual: number;
  years: number[];
}

export interface YearConfig {
  startYear: number;
  duration: number;
}

export interface PriceTier {
  name: string;
  price: number;
  percentage: number;
}

export interface FixedCost {
  name: string;
  cost: number;
  annual?: boolean;
  monthly?: boolean;
  type: 'depreciation' | 'regular';
  years?: number;
  startYear?: number;
}

export interface VariableCost {
  name: string;
  unitCost: number;
  tier?: string;
  all?: boolean;
  volumeReduction?: number;
}

export interface Loan {
  name: string;
  amount: number;
  bank: string;
  interestRate: number;
  term: number;
  startDate: string;
  type: 'machine' | 'building' | 'other';
}

export interface Parameters {
  modelData: ModelData;
  yearConfig: YearConfig;
  capacityUsage: number;
  capacityGrowth: number;
  priceTiers: PriceTier[];
  priceGrowth: number;
  fixedCosts: FixedCost[];
  variableCosts: VariableCost[];
  loans: Loan[];
  yieldLoss: number; // Percentage of yield loss
} 