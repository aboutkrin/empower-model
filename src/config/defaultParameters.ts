import { Parameters } from '../types/parameters';

export const defaultParameters: Parameters = {
  modelData: {
    capacity: 8000,
    capacityAnnual: 96000,
    years: [
      2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032
    ]
  },
  yearConfig: {
    startYear: 2023,
    duration: 35
  },
  capacityUsage: 3,
  capacityGrowth: 20,
  priceTiers: [
    {
      name: "Em-Unique",
      price: 74000,
      percentage: 10
    },
    {
      name: "Em-One",
      price: 52000,
      percentage: 10
    },
    {
      name: "Em-Pro",
      price: 45000,
      percentage: 60
    },
    {
      name: "Em-Star",
      price: 37000,
      percentage: 20
    }
  ],
  priceGrowth: 2,
  fixedCosts: [
    {
      name: "Building Depreciation",
      cost: 20800000,
      annual: true,
      type: "depreciation",
      years: 25,
      startYear: 2023
    },
    {
      name: "PPGL Machine Depreciation",
      cost: 22500000,
      annual: true,
      type: "depreciation",
      years: 20,
      startYear: 2023
    },
    {
      name: "Soft Cost Depreciation",
      cost: 1000000,
      annual: true,
      type: "depreciation",
      years: 20,
      startYear: 2023
    },
    {
      name: "Administrative Staff",
      cost: 1500000,
      monthly: true,
      type: "regular"
    },
    {
      name: "Insurance",
      cost: 450000,
      monthly: true,
      type: "regular"
    },
    {
      name: "Other Fixed Costs",
      cost: 350000,
      monthly: true,
      type: "regular"
    }
  ],
  variableCosts: [
    {
      name: "Raw Materials - Tier 1",
      unitCost: 30659.61,
      tier: "Em-Unique",
      volumeReduction: 10
    },
    {
      name: "Raw Materials - Tier 2",
      unitCost: 35616.9,
      tier: "Em-One",
      volumeReduction: 10
    },
    {
      name: "Raw Materials - Tier 3",
      unitCost: 36960.86,
      tier: "Em-Pro",
      volumeReduction: 10
    },
    {
      name: "Raw Materials - Tier 4",
      unitCost: 32326.07,
      tier: "Em-Star",
      volumeReduction: 10
    },
    {
      name: "Paint - Tier 1",
      unitCost: 16815.96,
      tier: "Em-Unique",
      volumeReduction: 5
    },
    {
      name: "Paint - Tier 2",
      unitCost: 5202.86,
      tier: "Em-One",
      volumeReduction: 5
    },
    {
      name: "Paint - Tier 3",
      unitCost: 2278.13,
      tier: "Em-Pro",
      volumeReduction: 5
    },
    {
      name: "Paint - Tier 4",
      unitCost: 1083.73,
      tier: "Em-Star",
      volumeReduction: 5
    },
    {
      name: "LNG - Tier 1",
      unitCost: 4545.45,
      all: false,
      tier: "Em-Unique",
      volumeReduction: 5
    },
    {
      name: "LNG - Tier 2",
      unitCost: 3072.67,
      all: false,
      tier: "Em-One",
      volumeReduction: 5
    },
    {
      name: "LNG - Tier 3",
      unitCost: 2352.48,
      all: false,
      tier: "Em-Pro",
      volumeReduction: 5
    },
    {
      name: "LNG - Tier 4",
      unitCost: 1490.56,
      all: false,
      tier: "Em-Star",
      volumeReduction: 5
    },
    {
      name: "Consumable - Tier 1",
      unitCost: 2784.87,
      all: false,
      tier: "Em-Unique",
      volumeReduction: 5
    },
    {
      name: "Consumable - Tier 2",
      unitCost: 1964.7,
      all: false,
      tier: "Em-One",
      volumeReduction: 5
    },
    {
      name: "Consumable - Tier 3",
      unitCost: 1732.93,
      all: false,
      tier: "Em-Pro",
      volumeReduction: 5
    },
    {
      name: "Consumable - Tier 4",
      unitCost: 849.44,
      all: false,
      tier: "Em-Star",
      volumeReduction: 5
    },
    {
      name: "Film",
      unitCost: 2472.6,
      all: false,
      tier: "Em-Unique",
      volumeReduction: 5
    },
    {
      name: "Direct Labour",
      unitCost: 8351.25,
      all: true
    },
    {
      name: "Utility - Tier 1",
      unitCost: 19301.23,
      all: false,
      tier: "Em-Unique",
      volumeReduction: 5
    },
    {
      name: "Utility - Tier 2",
      unitCost: 1991.44,
      all: false,
      tier: "Em-One",
      volumeReduction: 5
    },
    {
      name: "Utility - Tier 3",
      unitCost: 2350.53,
      all: false,
      tier: "Em-Pro",
      volumeReduction: 5
    },
    {
      name: "Utility - Tier 4",
      unitCost: 740.95,
      all: false,
      tier: "Em-Star",
      volumeReduction: 5
    },
    {
      name: "Maintenance Cost",
      unitCost: 1840.17,
      all: true,
      volumeReduction: 5
    },
    {
      name: "Production Supply",
      unitCost: 10158.82,
      all: true,
      volumeReduction: 5
    }
  ],
  loans: [
    {
      name: "PPGL Machine Loan",
      amount: 360000000,
      bank: "BBL",
      interestRate: 4.75,
      term: 84,
      startDate: "2023-01",
      type: "machine"
    },
    {
      name: "Building Loan",
      amount: 213000000,
      bank: "KBank",
      interestRate: 5.91,
      term: 91,
      startDate: "2023-01",
      type: "building"
    },
    {
      name: "Crane",
      amount: 30690000,
      bank: "BSL",
      interestRate: 4.96,
      term: 48,
      startDate: "2023-08",
      type: "other"
    },
    {
      name: "Overhead Crane",
      amount: 23561543.94,
      bank: "BSL",
      interestRate: 6.1,
      term: 60,
      startDate: "2023-01",
      type: "other"
    },
    {
      name: "Solar",
      amount: 23261940,
      bank: "BSL",
      interestRate: 5.27,
      term: 60,
      startDate: "2024-03",
      type: "other"
    }
  ],
  yieldLoss: 2
} as const; 