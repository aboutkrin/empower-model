import { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ModelConfig } from './types';

// Add TypeScript interfaces for better type safety
interface SavedModel {
  yearConfig: {
    startYear: number;
    duration: number;
  };
  modelData: {
    capacity: number;
    capacityAnnual: number;
  };
  capacityUsage: number;
  capacityGrowth: number;
  priceTiers: Array<{
    name: string;
    price: number;
    percentage: number;
  }>;
  priceGrowth: number;
  fixedCosts: Array<{
    name: string;
    cost: number;
    annual?: boolean;
    monthly?: boolean;
    type: string;
    years?: number;
    startYear?: number;
  }>;
  variableCosts: Array<{
    name: string;
    unitCost: number;
    tier?: string;
    all?: boolean;
    volumeReduction?: number; // Percentage reduction per 1000 tons
  }>;
  loans: Array<{
    name: string;
    amount: number;
    bank: string;
    interestRate: number;
    term: number;
    startDate: string;
    type: string;
  }>;
  irrTimeframe: number;
}

interface CashFlowData {
  year: number;
  revenue: number;
  operatingProfit: number;
  netCashFlow: number;
  loanPayments: number;
  netCashFlowAfterDebt: number;
}

interface FinancialData {
  year: number;
  revenue: number;
  operatingProfit: number;
  netCashFlow: number;
  yearlyCapacityUsage: number;
  monthlyVolume: number;
  annualVolume: number;
  totalVariableCosts: number;
  operatingFixedCosts: number;
  annualDepreciation: number;
}

// Define a color palette for pie slices
const pieColors = [
  '#6366F1', '#F59E42', '#10B981', '#EF4444', '#3B82F6', '#FBBF24', '#A78BFA', '#F472B6', '#34D399', '#F87171', '#60A5FA', '#FCD34D', '#C084FC', '#F9A8D4', '#6EE7B7', '#FCA5A5', '#93C5FD', '#FDE68A', '#DDD6FE', '#FBCFE8'
];

const EmpowerModel = () => {
  const [modelData, setModelData] = useState({
    capacity: 10000,
    capacityAnnual: 120000,
    years: Array.from({ length: 10 }, (_, i) => 2023 + i), // Creates array [2023, 2024, ..., 2032]
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [capacityUsage, setCapacityUsage] = useState(75);
  const [priceTiers, setPriceTiers] = useState([
    { name: "Em-Unique", price: 40000, percentage: 20 },
    { name: "Em-One", price: 45000, percentage: 30 },
    { name: "Em-Pro", price: 48000, percentage: 35 },
    { name: "Em-Star", price: 52000, percentage: 15 }
  ]);
  const [priceGrowth, setPriceGrowth] = useState(2.0);
  
  const [fixedCosts, setFixedCosts] = useState([
    { name: "Building Depreciation", cost: 20800000, annual: true, type: "depreciation", years: 25, startYear: 2023 },
    { name: "PPGL Machine Depreciation", cost: 22500000, annual: true, type: "depreciation", years: 20, startYear: 2023 },
    { name: "Soft Cost Depreciation", cost: 1000000, annual: true, type: "depreciation", years: 20, startYear: 2023 },
    { name: "Administrative Staff", cost: 1500000, monthly: true, type: "regular" },
    { name: "Utilities - Fixed", cost: 800000, monthly: true, type: "regular" },
    { name: "Maintenance Contract", cost: 650000, monthly: true, type: "regular" },
    { name: "Insurance", cost: 450000, monthly: true, type: "regular" },
    { name: "Other Fixed Costs", cost: 350000, monthly: true, type: "regular" }
  ]);
  
  const [variableCosts, setVariableCosts] = useState<SavedModel['variableCosts']>([
    { name: "Raw Materials - Tier 1", unitCost: 42000, tier: "Em-Unique", volumeReduction: 0 },
    { name: "Raw Materials - Tier 2", unitCost: 39000, tier: "Em-One", volumeReduction: 0 },
    { name: "Raw Materials - Tier 3", unitCost: 36000, tier: "Em-Pro", volumeReduction: 0 },
    { name: "Raw Materials - Tier 4", unitCost: 33000, tier: "Em-Star", volumeReduction: 0 },
    { name: "Paint - Tier 1", unitCost: 7000, tier: "Em-Unique", volumeReduction: 0 },
    { name: "Paint - Tier 2", unitCost: 6000, tier: "Em-One", volumeReduction: 0 },
    { name: "Paint - Tier 3", unitCost: 4000, tier: "Em-Pro", volumeReduction: 0 },
    { name: "Paint - Tier 4", unitCost: 3500, tier: "Em-Star", volumeReduction: 0 },
    { name: "Utilities - Variable", unitCost: 2594, all: true, volumeReduction: 0 },
    { name: "Direct Labor", unitCost: 1800, all: true, volumeReduction: 0 },
    { name: "Packaging", unitCost: 900, all: true, volumeReduction: 0 }
  ]);
  
  // Changed from static to state
  const [financialData, setFinancialData] = useState<FinancialData[]>([]);
  
  // Financial metrics state
  const [metrics, setMetrics] = useState({
    npv: 0,
    irr: 0,
    paybackPeriod: 0,
    totalRevenue: 0,
    totalProfit: 0,
    breakEvenYear: 0,
    weightedPrice: 0,
    monthlyFixedCost: 0,
    weightedVariableCost: 0,
    contributionMargin: 0,
    breakEvenVolume: 0,
    breakEvenCapacity: 0
  });
  
  // Add this to your existing state declarations
  const [loans, setLoans] = useState([
    {
      name: "PPGL Machine Loan",
      amount: 360000000,
      bank: "BBL",
      interestRate: 5.5,  // MLR - 0.5%
      term: 84,  // 7 years in months
      startDate: "2023-01",
      type: "machine"
    },
    {
      name: "Building Loan",
      amount: 213000000,
      bank: "KBank",
      interestRate: 5.0,  // MLR - 1.0%
      term: 180,  // 15 years in months
      startDate: "2023-01",
      type: "building"
    }
  ]);
  
  // Add this to your existing state declarations
  const [capacityGrowth, setCapacityGrowth] = useState(10); // Default 10% annual growth
  
  // Add new state for year configuration
  const [yearConfig, setYearConfig] = useState({
    startYear: 2023,
    duration: 35
  });
  
  // Add this to your existing state
  const [irrTimeframe, setIrrTimeframe] = useState(35); // Default to full period
  
  // Add local state for duration input
  const [durationInput, setDurationInput] = useState(yearConfig.duration.toString());
  
  // Add this function to update years when configuration changes
  const updateYearRange = (startYear: number, duration: number) => {
    setYearConfig({ startYear, duration });
    setModelData(prev => ({
      ...prev,
      years: Array.from({ length: duration }, (_, i) => startYear + i)
    }));
  };
  
  // This would process the actual Excel data in a real implementation
  useEffect(() => {
    // Simulate loading the Excel data
    setTimeout(() => {
      // Calculate metrics based on current parameters
      calculateMetrics();
      setLoading(false);
    }, 1000);
  }, []);
  
  // Add a useEffect to ensure initial calculation and updates
  useEffect(() => {
    if (!loading) {
      calculateMetrics();
    }
  }, [
    yearConfig.startYear,
    yearConfig.duration,
    capacityUsage,
    capacityGrowth,
    priceTiers,
    priceGrowth,
    fixedCosts,
    variableCosts,
    modelData.capacity,
    modelData.capacityAnnual,
    modelData.years,
    loans,
    irrTimeframe,
    loading
  ]);
  
  // Add this useEffect
  useEffect(() => {
    // Ensure IRR timeframe doesn't exceed the projection duration
    if (irrTimeframe > yearConfig.duration) {
      setIrrTimeframe(yearConfig.duration);
    }
  }, [yearConfig.duration]);
  
  // Update calculateProjections function to properly handle costs and cash flows
  const calculateProjections = (weightedPrice: number, monthlyFixedCost: number) => {
    const projections = [];
    const endYear = yearConfig.startYear + yearConfig.duration;

    // Generate data only for the projection period
    for (let year = yearConfig.startYear; year < endYear; year++) {
      const yearsSinceStart = year - yearConfig.startYear;
      const yearlyCapacityUsage = calculateYearlyCapacityUsage(year);
      
      // Calculate volumes
      const monthlyVolume = modelData.capacity * (yearlyCapacityUsage / 100);
      const annualVolume = monthlyVolume * 12;
      
      // Calculate revenue with price growth
      const priceMultiplier = Math.pow(1 + priceGrowth / 100, yearsSinceStart);
      const yearlyPrice = weightedPrice * priceMultiplier;
      const revenue = (annualVolume * yearlyPrice) / 1000000;
      
      // Calculate variable costs with volume-based reduction
      const totalVariableCosts = variableCosts.reduce((sum, cost) => {
        const effectiveUnitCost = calculateEffectiveVariableCost(cost, monthlyVolume);
        if (cost.all) {
          return sum + (annualVolume * effectiveUnitCost);
        } else {
          const matchingTier = priceTiers.find(tier => tier.name === cost.tier);
          if (matchingTier) {
            return sum + (annualVolume * (matchingTier.percentage / 100) * effectiveUnitCost);
          }
        }
        return sum;
      }, 0) / 1000000;
      
      // Calculate fixed costs (excluding depreciation)
      const operatingFixedCosts = fixedCosts
        .filter(item => item.type !== "depreciation")
        .reduce((sum, item) => {
          const annualCost = item.monthly ? item.cost * 12 : item.cost;
          return sum + annualCost;
        }, 0) / 1000000;
      
      // Calculate depreciation
      const annualDepreciation = fixedCosts
        .filter(item => item.type === "depreciation")
        .reduce((sum, item) => {
          const depreciationPeriod = item.years || 10;
          if (yearsSinceStart < depreciationPeriod) {
            return sum + (item.cost / depreciationPeriod);
          }
          return sum;
        }, 0) / 1000000;

      // Calculate operating metrics
      const grossProfit = revenue - totalVariableCosts;
      const operatingProfit = grossProfit - operatingFixedCosts - annualDepreciation;
      
      // Calculate cash flow
      const operatingCashFlow = operatingProfit + annualDepreciation;
      
      // Calculate initial investment
      const initialInvestment = year === yearConfig.startYear
        ? fixedCosts
            .filter(item => item.type === "depreciation")
            .reduce((sum, item) => sum + item.cost, 0) / 1000000
        : 0;
      
      const netCashFlow = operatingCashFlow - initialInvestment;

      projections.push({
        year,
        revenue,
        operatingProfit,
        netCashFlow,
        yearlyCapacityUsage,
        monthlyVolume,
        annualVolume,
        totalVariableCosts,
        operatingFixedCosts,
        annualDepreciation
      });
    }

    return projections;
  };
  
  const calculateNPV = (cashFlows: number[], discountRate: number): number => {
    return cashFlows.reduce((npv, cf, year) => {
      return npv + (cf / Math.pow(1 + discountRate, year));
    }, 0);
  };

  const calculateIRR = (cashFlows: number[]): number => {
    // Guard against invalid cash flows
    if (!cashFlows.length || !cashFlows.some(cf => cf > 0) || !cashFlows.some(cf => cf < 0)) {
      return 0;
    }

    const guess = 0.1;
    const maxIterations = 100;
    const tolerance = 0.00001;

    let rate = guess;
    
    for (let i = 0; i < maxIterations; i++) {
      const npv = cashFlows.reduce((sum, cf, t) => 
        sum + cf / Math.pow(1 + rate, t), 0
      );
      
      const derivativeNpv = cashFlows.reduce((sum, cf, t) => 
        sum - t * cf / Math.pow(1 + rate, t + 1), 0
      );
      
      const newRate = rate - npv / derivativeNpv;
      
      if (Math.abs(newRate - rate) < tolerance) {
        return newRate * 100; // Convert to percentage
      }
      
      rate = newRate;
    }
    
    return 0; // Return 0 if no solution found
  };

  // Update the calculatePaybackPeriod function to project beyond the selected period
  const calculatePaybackPeriod = (projections: any[]): number => {
    // Get the last year's metrics to use for extrapolation
    const lastYear = projections[projections.length - 1];
    const initialInvestment = Math.abs(projections[0].netCashFlow);
    let cumulativeCashFlow = 0;
    let year = 0;

    // First check within the projection period
    for (let i = 0; i < projections.length; i++) {
      cumulativeCashFlow += projections[i].netCashFlow;
      if (cumulativeCashFlow >= 0) {
        // Calculate fractional year for more accurate payback period
        const previousCF = cumulativeCashFlow - projections[i].netCashFlow;
        const fraction = (0 - previousCF) / (projections[i].netCashFlow - previousCF);
        return i - 1 + fraction;
      }
    }
    
    // If not found within projection period, extrapolate using last year's cash flow
    if (lastYear.netCashFlow > 0) {
      const remainingToRecover = -cumulativeCashFlow;
      const additionalYears = remainingToRecover / lastYear.netCashFlow;
      return projections.length - 1 + additionalYears;
    }
    
    // If last year's cash flow is negative or zero, no payback possible
    return Infinity;
  };

  // Update the metrics display for Payback Period
  const PaybackPeriodCard = () => {
    const payback = metrics.paybackPeriod;
    const isInfinite = !isFinite(payback);
    const isWithinProjection = payback <= yearConfig.duration;

  return (
                <div className="card">
                  <h3>Payback Period</h3>
        <div className="text-2xl font-bold">
          {isInfinite ? (
            'No Payback'
          ) : (
            `${payback.toFixed(1)} Years`
          )}
        </div>
        {!isInfinite && !isWithinProjection && (
          <div className="text-sm text-amber-600">
            {`Extends ${(payback - yearConfig.duration).toFixed(1)} years beyond projection period`}
          </div>
        )}
        {isInfinite && (
          <div className="text-sm text-red-500">
            Project never recovers initial investment
          </div>
        )}
      </div>
    );
  };

  // Update calculateMetrics to use the new payback calculation
  const calculateMetrics = () => {
    if (!modelData || !yearConfig || priceTiers.length === 0) return;

    // Calculate weighted price and costs
    const weightedPrice = priceTiers.reduce((sum, tier) => 
      sum + (tier.price * (tier.percentage / 100)), 0);

    const monthlyFixedCost = fixedCosts.reduce((sum, item) => {
      if (item.monthly) return sum + item.cost;
      if (item.annual) return sum + (item.cost / 12);
      return sum;
    }, 0);

    // Calculate break-even volume iteratively since it depends on volume
    let breakEvenVolume = 0;
    let breakEvenCapacity = 0;
    let breakEvenYear = 0;
    
    // Function to calculate total variable cost for a given volume
    const calculateTotalVariableCost = (volume: number) => {
      return variableCosts.reduce((sum, cost) => {
        const effectiveUnitCost = calculateEffectiveVariableCost(cost, volume);
        if (cost.all) {
          return sum + effectiveUnitCost;
        } else {
          const matchingTier = priceTiers.find(tier => tier.name === cost.tier);
          if (matchingTier) {
            return sum + (effectiveUnitCost * (matchingTier.percentage / 100));
          }
        }
        return sum;
      }, 0);
    };

    // Find break-even volume using binary search
    let low = 0;
    let high = modelData.capacity;
    let iterations = 0;
    const maxIterations = 100;
    const tolerance = 0.1; // 0.1 ton tolerance

    while (iterations < maxIterations) {
      const mid = (low + high) / 2;
      const totalVariableCost = calculateTotalVariableCost(mid);
      const contribution = weightedPrice - totalVariableCost;
      const breakEvenPoint = monthlyFixedCost / contribution;

      if (Math.abs(mid - breakEvenPoint) < tolerance) {
        breakEvenVolume = mid;
        break;
      }

      if (mid < breakEvenPoint) {
        low = mid;
      } else {
        high = mid;
      }
      iterations++;
    }

    breakEvenCapacity = (breakEvenVolume / modelData.capacity) * 100;

    // Find break-even year considering volume growth
    for (let year = 0; year < yearConfig.duration; year++) {
      const yearsSinceStart = year;
      const baseUsage = capacityUsage;
      const growth = capacityGrowth;
      
      // Calculate capacity for this year
      const projectedUsage = baseUsage * Math.pow(1 + growth / 100, yearsSinceStart);
      const cappedUsage = Math.min(projectedUsage, 100);
      const monthlyVolume = modelData.capacity * (cappedUsage / 100);
      
      if (monthlyVolume >= breakEvenVolume) {
        // Calculate fractional year
        const prevYearVolume = year > 0 ? 
          modelData.capacity * (Math.min(baseUsage * Math.pow(1 + growth / 100, yearsSinceStart - 1), 100) / 100) : 0;
        
        const fraction = (breakEvenVolume - prevYearVolume) / (monthlyVolume - prevYearVolume);
        breakEvenYear = year + fraction;
        break;
      }
    }

    // Calculate weighted variable cost at current volume
    const currentVolume = modelData.capacity * (capacityUsage / 100);
    const weightedVariableCost = calculateTotalVariableCost(currentVolume);

    // Calculate contribution margin at current volume
    const contributionMargin = weightedPrice - weightedVariableCost;

    // Calculate projections for the projection period
    const projections = calculateProjections(weightedPrice, monthlyFixedCost);
    setFinancialData(projections);

    // Get cash flows for IRR and NPV (using projection period)
    const cashFlows = projections.map(year => year.netCashFlow);

    // Calculate IRR using projection period cash flows
    const irr = calculateIRR(cashFlows);
    
    // Calculate NPV with 10% discount rate for projection period
    const npv = calculateNPV(cashFlows, 0.10);

    // Calculate payback period (can extend beyond projection period)
    const paybackPeriod = calculatePaybackPeriod(projections);

    // Calculate total revenue and profit
    const totalRevenue = projections.reduce((sum, year) => sum + year.revenue, 0);
    const totalProfit = projections.reduce((sum, year) => sum + year.operatingProfit, 0);

    setMetrics({
      npv,
      irr: irr || 0,
      paybackPeriod,
      totalRevenue,
      totalProfit,
      breakEvenYear,
      weightedPrice,
      monthlyFixedCost,
      weightedVariableCost,
      contributionMargin,
      breakEvenVolume,
      breakEvenCapacity
    });
  };

  const calculateMonthlyPayment = (principal: number, annualRate: number, termMonths: number) => {
    const monthlyRate = (annualRate / 100) / 12;
    return Math.round(
      principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths) / 
      (Math.pow(1 + monthlyRate, termMonths) - 1)
    );
  };

  const calculateTotalInterest = (principal: number, annualRate: number, termMonths: number) => {
    const monthlyPayment = calculateMonthlyPayment(principal, annualRate, termMonths);
    return Math.round(monthlyPayment * termMonths - principal);
  };

  const generateAmortizationSchedule = (loans: any[]) => {
    const years = Array.from(new Set(loans.flatMap(loan => {
      const startYear = parseInt(loan.startDate.split('-')[0]);
      return Array.from(
        { length: Math.ceil(loan.term / 12) },
        (_, i) => startYear + i
      );
    }))).sort();

    return years.map(year => {
      let yearlyPrincipal = 0;
      let yearlyInterest = 0;
      let remainingBalance = 0;

      loans.forEach(loan => {
        const startYear = parseInt(loan.startDate.split('-')[0]);
        const monthlyPayment = calculateMonthlyPayment(loan.amount, loan.interestRate, loan.term);
        const monthsInYear = 12;
        
        if (year >= startYear && year < startYear + Math.ceil(loan.term / 12)) {
          let balance = loan.amount;
          const monthlyRate = (loan.interestRate / 100) / 12;

          for (let month = 1; month <= loan.term; month++) {
            const currentYear = startYear + Math.floor((month - 1) / 12);
            
            if (currentYear === year) {
              const interest = balance * monthlyRate;
              const principal = monthlyPayment - interest;
              
              yearlyPrincipal += principal;
              yearlyInterest += interest;
            }
            
            balance -= (monthlyPayment - (balance * monthlyRate));
            if (currentYear === year) {
              remainingBalance += Math.max(0, balance);
            }
          }
        }
      });

      return {
        year,
        principal: Math.round(yearlyPrincipal),
        interest: Math.round(yearlyInterest),
        totalPayment: Math.round(yearlyPrincipal + yearlyInterest),
        remainingBalance: Math.round(remainingBalance)
      };
    });
  };

  // Add this helper function for number formatting
  const formatNumber = (num: number) => {
    return num.toLocaleString('en-US', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0
    });
  };

  // Add this helper function for input number formatting
  const formatInputNumber = (value: string) => {
    // Remove all non-numeric characters except decimal point
    const numericValue = value.replace(/[^\d.]/g, '');
    // Format with commas
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // Add this helper function to parse formatted number back to numeric value
  const parseFormattedNumber = (value: string) => {
    return parseFloat(value.replace(/,/g, '')) || 0;
  };

  // Helper function to calculate yearly capacity usage
  const calculateYearlyCapacityUsage = (year: number) => {
    const yearsSinceStart = year - yearConfig.startYear;
    const baseUsage = capacityUsage;
    const growth = capacityGrowth;
    
    if (yearsSinceStart === 0) return baseUsage;
    
    const projectedUsage = baseUsage * Math.pow(1 + growth / 100, yearsSinceStart);
    return Math.min(projectedUsage, 100); // Cap at 100%
  };

  // Add these functions to handle saving and loading
  const saveModel = () => {
    try {
      const modelToSave = {
        yearConfig,
        modelData: {
          capacity: modelData.capacity,
          capacityAnnual: modelData.capacityAnnual,
        },
        capacityUsage,
        capacityGrowth,
        priceTiers,
        priceGrowth,
        fixedCosts,
        variableCosts,
        loans,
        irrTimeframe
      };

      localStorage.setItem('empowerModel', JSON.stringify(modelToSave));
      alert('Model saved successfully!');
    } catch (error) {
      console.error('Error saving model:', error);
      alert('Failed to save model. Please try again.');
    }
  };

  const [modelVersion, setModelVersion] = useState(0);

  const loadModel = () => {
    try {
      const savedModel = localStorage.getItem('empowerModel');
      if (!savedModel) {
        alert('No saved model found.');
        return;
      }

      const parsedModel = JSON.parse(savedModel);

      // Load all settings at once
      setYearConfig(parsedModel.yearConfig);
      setModelData(prevData => ({
        ...prevData,
        capacity: parsedModel.modelData.capacity,
        capacityAnnual: parsedModel.modelData.capacityAnnual,
        years: Array.from(
          { length: parsedModel.yearConfig.duration },
          (_, i) => parsedModel.yearConfig.startYear + i
        )
      }));
      setCapacityUsage(parsedModel.capacityUsage);
      setCapacityGrowth(parsedModel.capacityGrowth);
      setPriceTiers(parsedModel.priceTiers);
      setPriceGrowth(parsedModel.priceGrowth);
      setFixedCosts(parsedModel.fixedCosts);
      setVariableCosts(parsedModel.variableCosts);
      setLoans(parsedModel.loans);
      setIrrTimeframe(parsedModel.irrTimeframe);

      // Force re-render for Costs tab
      setModelVersion(v => v + 1);

      // Recalculate metrics after loading
      // setTimeout(() => {
      //   calculateMetrics();
      // }, 100);

      alert('Model loaded successfully!');
    } catch (error) {
      console.error('Error loading model:', error);
      alert('Failed to load model. Please try again.');
    }
  };

  // Helper functions
  const calculateWeightedPrice = () => {
    const totalPercentage = priceTiers.reduce((sum, tier) => sum + tier.percentage, 0);
    return priceTiers.reduce((sum, tier) => {
      return sum + tier.price * (tier.percentage / totalPercentage);
    }, 0);
  };

  const calculateMonthlyFixedCost = () => {
    return fixedCosts.reduce((sum, item) => {
      if (item.monthly) return sum + item.cost;
      if (item.annual) return sum + (item.cost / 12);
      return sum;
    }, 0);
  };

  // Add state for save/load feedback
  const [saveStatus, setSaveStatus] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error';
  }>({
    show: false,
    message: '',
    type: 'success'
  });

  // Calculate the total product mix percentage
  const totalProductMix = priceTiers.reduce((sum, tier) => sum + tier.percentage, 0);

  // Update the Duration input handler
  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setDurationInput(inputValue);
    // Allow empty input for deletion
    if (inputValue === '') return;
    // Convert to number and apply limits
    const newDuration = parseInt(inputValue);
    if (!isNaN(newDuration)) {
      setYearConfig(prev => ({
        ...prev,
        duration: Math.min(50, newDuration)
      }));
    }
  };

  // Sync durationInput with yearConfig.duration if it changes elsewhere
  useEffect(() => {
    setDurationInput(yearConfig.duration.toString());
  }, [yearConfig.duration]);

  // Add this function to reset to default values
  const resetToDefault = () => {
    // Reset model data
    setModelData({
      capacity: 10000,
      capacityAnnual: 120000,
      years: Array.from({ length: 10 }, (_, i) => 2023 + i),
    });

    // Reset other states
    setCapacityUsage(75);
    setCapacityGrowth(10);
    setPriceTiers([
      { name: "Em-Unique", price: 40000, percentage: 20 },
      { name: "Em-One", price: 45000, percentage: 30 },
      { name: "Em-Pro", price: 48000, percentage: 35 },
      { name: "Em-Star", price: 52000, percentage: 15 }
    ]);
    setPriceGrowth(2.0);
    setFixedCosts([
      { name: "Building Depreciation", cost: 20800000, annual: true, type: "depreciation", years: 25, startYear: 2023 },
      { name: "PPGL Machine Depreciation", cost: 22500000, annual: true, type: "depreciation", years: 20, startYear: 2023 },
      { name: "Soft Cost Depreciation", cost: 1000000, annual: true, type: "depreciation", years: 20, startYear: 2023 },
      { name: "Administrative Staff", cost: 1500000, monthly: true, type: "regular" },
      { name: "Utilities - Fixed", cost: 800000, monthly: true, type: "regular" },
      { name: "Maintenance Contract", cost: 650000, monthly: true, type: "regular" },
      { name: "Insurance", cost: 450000, monthly: true, type: "regular" },
      { name: "Other Fixed Costs", cost: 350000, monthly: true, type: "regular" }
    ]);
    setVariableCosts([
      { name: "Raw Materials - Tier 1", unitCost: 42000, tier: "Em-Unique", volumeReduction: 0 },
      { name: "Raw Materials - Tier 2", unitCost: 39000, tier: "Em-One", volumeReduction: 0 },
      { name: "Raw Materials - Tier 3", unitCost: 36000, tier: "Em-Pro", volumeReduction: 0 },
      { name: "Raw Materials - Tier 4", unitCost: 33000, tier: "Em-Star", volumeReduction: 0 },
      { name: "Paint - Tier 1", unitCost: 7000, tier: "Em-Unique", volumeReduction: 0 },
      { name: "Paint - Tier 2", unitCost: 6000, tier: "Em-One", volumeReduction: 0 },
      { name: "Paint - Tier 3", unitCost: 4000, tier: "Em-Pro", volumeReduction: 0 },
      { name: "Paint - Tier 4", unitCost: 3500, tier: "Em-Star", volumeReduction: 0 },
      { name: "Utilities - Variable", unitCost: 2594, all: true, volumeReduction: 0 },
      { name: "Direct Labor", unitCost: 1800, all: true, volumeReduction: 0 },
      { name: "Packaging", unitCost: 900, all: true, volumeReduction: 0 }
    ]);
    setLoans([
      {
        name: "PPGL Machine Loan",
        amount: 360000000,
        bank: "BBL",
        interestRate: 5.5,
        term: 84,
        startDate: "2023-01",
        type: "machine"
      },
      {
        name: "Building Loan",
        amount: 213000000,
        bank: "KBank",
        interestRate: 5.0,
        term: 180,
        startDate: "2023-01",
        type: "building"
      }
    ]);
    setYearConfig({
      startYear: 2023,
      duration: 35
    });
    setIrrTimeframe(35);

    // Show success message
    setSaveStatus({
      show: true,
      message: 'Model reset to default values successfully!',
      type: 'success'
    });
    setTimeout(() => setSaveStatus(prev => ({ ...prev, show: false })), 3000);

    // Recalculate metrics
    // setTimeout(() => {
    //   calculateMetrics();
    // }, 100);
  };

  // Add this helper function to calculate effective variable cost
  const calculateEffectiveVariableCost = (cost: SavedModel['variableCosts'][0], monthlyVolume: number) => {
    if (!cost.volumeReduction || cost.volumeReduction === 0) return cost.unitCost;
    
    // Calculate reduction based on volume (per 1000 tons)
    const reductionFactor = 1 - ((monthlyVolume / 1000) * (cost.volumeReduction / 100));
    // Ensure cost doesn't go below 0
    return Math.max(0, cost.unitCost * reductionFactor);
  };

  // Scenario state
  const [scenario, setScenario] = useState<'base' | 'optimistic' | 'pessimistic'>('base');
  const [originalParams, setOriginalParams] = useState<any>(null);

  // Scenario handler
  const handleScenarioChange = (newScenario: 'base' | 'optimistic' | 'pessimistic') => {
    if (newScenario === scenario) return;
    if (!originalParams) {
      setOriginalParams({
        priceGrowth,
        capacityGrowth,
        priceTiers: JSON.parse(JSON.stringify(priceTiers)),
        variableCosts: JSON.parse(JSON.stringify(variableCosts)),
        fixedCosts: JSON.parse(JSON.stringify(fixedCosts)),
      });
    }
    if (newScenario === 'base' && originalParams) {
      setPriceGrowth(originalParams.priceGrowth);
      setCapacityGrowth(originalParams.capacityGrowth);
      setPriceTiers(JSON.parse(JSON.stringify(originalParams.priceTiers)));
      setVariableCosts(JSON.parse(JSON.stringify(originalParams.variableCosts)));
      setFixedCosts(JSON.parse(JSON.stringify(originalParams.fixedCosts)));
    } else if (newScenario === 'optimistic') {
      setPriceGrowth((originalParams?.priceGrowth ?? priceGrowth) + 2);
      setCapacityGrowth((originalParams?.capacityGrowth ?? capacityGrowth) + 5);
      setVariableCosts((originalParams?.variableCosts ?? variableCosts).map((v: any) => ({ ...v, unitCost: v.unitCost * 0.95 })));
      setFixedCosts((originalParams?.fixedCosts ?? fixedCosts).map((f: any) => ({ ...f, cost: f.cost * 0.97 })));
    } else if (newScenario === 'pessimistic') {
      setPriceGrowth((originalParams?.priceGrowth ?? priceGrowth) - 1);
      setCapacityGrowth((originalParams?.capacityGrowth ?? capacityGrowth) - 3);
      setVariableCosts((originalParams?.variableCosts ?? variableCosts).map((v: any) => ({ ...v, unitCost: v.unitCost * 1.07 })));
      setFixedCosts((originalParams?.fixedCosts ?? fixedCosts).map((f: any) => ({ ...f, cost: f.cost * 1.05 })));
    }
    setScenario(newScenario);
  };

  // What-if quick input state
  const [whatIf, setWhatIf] = useState({ price: 0, variable: 0, fixed: 0 });

  const applyWhatIf = () => {
    // Adjust priceTiers
    setPriceTiers((prev) => prev.map(tier => ({ ...tier, price: Math.round(tier.price * (1 + whatIf.price / 100)) })));
    // Adjust variableCosts
    setVariableCosts((prev) => prev.map(v => ({ ...v, unitCost: Math.round(v.unitCost * (1 + whatIf.variable / 100)) })));
    // Adjust fixedCosts
    setFixedCosts((prev) => prev.map(f => ({ ...f, cost: Math.round(f.cost * (1 + whatIf.fixed / 100)) })));
  };
  const resetWhatIf = () => {
    handleScenarioChange(scenario); // restore to scenario values
    setWhatIf({ price: 0, variable: 0, fixed: 0 });
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading model data...</div>;
  }

  return (
    <div className="flex flex-col bg-gray-100 min-h-screen">
      <header className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-6 px-4 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold">EM-FinCast</h1>
          <p className="mt-2 text-primary-100">
            Capacity: {formatNumber(modelData.capacity)} tons/month ({formatNumber(modelData.capacityAnnual)} tons/year)
          </p>
        </div>
      </header>

      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex gap-4 mb-6">
            <button
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium shadow-sm"
              onClick={saveModel}
            >
              Save Model
            </button>
            <button
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-medium shadow-sm"
              onClick={loadModel}
            >
              Load Saved Model
            </button>
            <button
              className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-medium shadow-sm"
              onClick={resetToDefault}
            >
              Reset to Default
            </button>
          </div>
          
          {/* Save Status Message */}
          {saveStatus.show && (
            <div
              className={`px-4 py-2 rounded-md text-sm ${
                saveStatus.type === 'success' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {saveStatus.message}
            </div>
          )}
          
          {/* Export/Import Buttons */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => {
                const config = {
                  modelData,
                  yearConfig,
                  capacityUsage,
                  capacityGrowth,
                  priceTiers,
                  priceGrowth,
                  fixedCosts,
                  variableCosts,
                  loans
                };
                
                const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `empower-model-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
              className="btn btn-secondary"
            >
              Export Model
            </button>
            
            <div className="relative">
              <input
                type="file"
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      try {
                        const config: ModelConfig = JSON.parse(event.target?.result as string);
                        setModelData(config.modelData);
                        setYearConfig(config.yearConfig);
                        setCapacityUsage(config.capacityUsage);
                        setCapacityGrowth(config.capacityGrowth);
                        setPriceTiers(config.priceTiers);
                        setPriceGrowth(config.priceGrowth);
                        setFixedCosts(config.fixedCosts as typeof fixedCosts);
                        setVariableCosts(config.variableCosts as typeof variableCosts);
                        setLoans(config.loans);
                        setSaveStatus({
                          show: true,
                          message: 'Model imported successfully!',
                          type: 'success'
                        });
                      } catch (error) {
                        setSaveStatus({
                          show: true,
                          message: 'Error importing model',
                          type: 'error'
                        });
                      }
                      setTimeout(() => setSaveStatus(prev => ({ ...prev, show: false })), 3000);
                    };
                    reader.readAsText(file);
                  }
                }}
                className="hidden"
                id="import-file"
              />
              <label
                htmlFor="import-file"
                className="btn btn-secondary cursor-pointer"
              >
                Import Model
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="flex border-b bg-white">
        <button
          className={`px-4 py-3 ${activeTab === 'dashboard' ? 'text-blue-700 border-b-2 border-blue-700 font-medium' : 'text-gray-600'}`}
          onClick={() => setActiveTab('dashboard')}
        >
          Dashboard
        </button>
        <button
          className={`px-4 py-3 ${activeTab === 'financials' ? 'text-blue-700 border-b-2 border-blue-700 font-medium' : 'text-gray-600'}`}
          onClick={() => setActiveTab('financials')}
        >
          Financial Statements
        </button>
        <button
          className={`px-4 py-3 ${activeTab === 'cashflow' ? 'text-blue-700 border-b-2 border-blue-700 font-medium' : 'text-gray-600'}`}
          onClick={() => setActiveTab('cashflow')}
        >
          Cash Flow After Debt
        </button>
        <button
          className={`px-4 py-3 ${activeTab === 'breakeven' ? 'text-blue-700 border-b-2 border-blue-700 font-medium' : 'text-gray-600'}`}
          onClick={() => setActiveTab('breakeven')}
        >
          Break-even
        </button>
        <button
          className={`px-4 py-3 ${activeTab === 'breakevenWithDebt' ? 'text-blue-700 border-b-2 border-blue-700 font-medium' : 'text-gray-600'}`}
          onClick={() => setActiveTab('breakevenWithDebt')}
        >
          Break-even with Debt
        </button>
        <button
          className={`px-4 py-3 ${activeTab === 'costs' ? 'text-blue-700 border-b-2 border-blue-700 font-medium' : 'text-gray-600'}`}
          onClick={() => setActiveTab('costs')}
        >
          Costs
        </button>
        <button
          className={`px-4 py-3 ${activeTab === 'loans' ? 'text-blue-700 border-b-2 border-blue-700 font-medium' : 'text-gray-600'}`}
          onClick={() => setActiveTab('loans')}
        >
          Loan Analysis
        </button>
        <button
          className={`px-4 py-3 ${activeTab === 'statistics' ? 'text-blue-700 border-b-2 border-blue-700 font-medium' : 'text-gray-600'}`}
          onClick={() => setActiveTab('statistics')}
        >
          Statistics
        </button>
      </div>

      <div className="flex flex-col md:flex-row flex-1">
        {/* Parameters Panel - Only shown on dashboard tab */}
        {activeTab === 'dashboard' && (
        <aside className="lg:w-80">
          <div className="card sticky top-24 space-y-6">
            <h2 className="text-xl font-bold mb-6">Model Parameters</h2>

            {/* Capacity Configuration */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Capacity Settings</h3>
              
              {/* Monthly Capacity */}
          <div className="mb-4">
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Monthly Capacity (tons)
            </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={formatInputNumber(modelData.capacity.toString())}
                    onChange={(e) => {
                      const newCapacity = parseFormattedNumber(e.target.value);
                      setModelData({
                        ...modelData,
                        capacity: newCapacity,
                        capacityAnnual: newCapacity * 12
                      });
                    }}
                    className="input text-right"
                  />
                  <span className="text-sm text-gray-500">tons/month</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Annual: {formatNumber(modelData.capacityAnnual)} tons/year
                </p>
              </div>

              {/* Initial Capacity Usage */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Initial Capacity Usage ({yearConfig.startYear})
                </label>
                <div className="flex items-center gap-4">
            <input
              type="range"
                    min="0"
              max="100"
              value={capacityUsage}
              onChange={(e) => setCapacityUsage(parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <div className="flex items-center gap-2">
                    <input 
                      type="number"
                      min="0"
                      max="100"
                      value={capacityUsage}
                      onChange={(e) => {
                        const value = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                        setCapacityUsage(value);
                      }}
                      className="input w-16 text-right"
                    />
                    <span className="text-sm font-medium text-gray-900">%</span>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {yearConfig.startYear} Volume: {formatNumber(modelData.capacity * (capacityUsage / 100))} tons/month
                </div>
          </div>

              {/* Capacity Growth Rate */}
          <div className="mb-4">
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Annual Capacity Growth Rate
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={capacityGrowth}
                    onChange={(e) => setCapacityGrowth(parseFloat(e.target.value))}
                    className="input text-right"
                  />
                  <span className="text-sm text-gray-500">% per year</span>
                </div>
              </div>

              {/* Projected Capacity Table */}
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-600 mb-2">Projected Capacity Usage</h4>
                <div className="bg-white rounded border border-gray-200 overflow-x-auto max-h-96">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-50">
                      <tr>
                        <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 sticky left-0 bg-gray-50">Year</th>
                        <th className="py-2 px-3 text-right text-xs font-medium text-gray-500">Usage %</th>
                        <th className="py-2 px-3 text-right text-xs font-medium text-gray-500">Monthly (tons)</th>
                        <th className="py-2 px-3 text-right text-xs font-medium text-gray-500">Annual (tons)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modelData.years.map((year, index) => {
                        const yearlyCapacityUsage = calculateYearlyCapacityUsage(year);
                        const monthlyVolume = modelData.capacity * (yearlyCapacityUsage / 100);
                        const annualVolume = monthlyVolume * 12;
                        
                        return (
                          <tr key={year} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                            <td className="py-2 px-3 sticky left-0 font-medium" style={{ backgroundColor: index % 2 === 0 ? '#f9fafb' : '#ffffff' }}>
                              {year}
                            </td>
                            <td className="py-2 px-3 text-right">
                              {formatNumber(yearlyCapacityUsage)}%
                            </td>
                            <td className="py-2 px-3 text-right">
                              {formatNumber(monthlyVolume)}
                            </td>
                            <td className="py-2 px-3 text-right">
                              {formatNumber(annualVolume)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Year Range Configuration */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Projection Period</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Start Year
                    </label>
                    <input
                      type="number"
                      value={yearConfig.startYear}
                      onChange={(e) => {
                        const newStartYear = parseInt(e.target.value);
                        updateYearRange(newStartYear, yearConfig.duration);
                      }}
                      className="input text-right"
                      min="2023"
                      max="2050"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="duration" className="form-label">
                      Duration (Yr)
                    </label>
                    <input
                      id="duration"
                      type="number"
                      value={durationInput}
                      onChange={handleDurationChange}
                      className="input text-right" // match Start Year
                      min="1"
                      max="50"
                      step="1"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Rest of your existing parameters */}
            {/* Product Tiers */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Tiers
            </label>
              <div className="space-y-3">
            {priceTiers.map((tier, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={tier.name}
                      onChange={(e) => {
                        const newTiers = [...priceTiers];
                        newTiers[index].name = e.target.value;
                        setPriceTiers(newTiers);
                      }}
                      className="input text-sm flex-1"
                    />
                  <input
                    type="text"
                    value={formatInputNumber(tier.price.toString())}
                    onChange={(e) => {
                      const newTiers = [...priceTiers];
                      newTiers[index].price = parseFormattedNumber(e.target.value);
                      setPriceTiers(newTiers);
                    }}
                      className="input text-sm w-28"
                  />
                  <input
                    type="number"
                    value={tier.percentage}
                    onChange={(e) => {
                      const newTiers = [...priceTiers];
                      newTiers[index].percentage = parseInt(e.target.value);
                      setPriceTiers(newTiers);
                    }}
                      className="input text-sm w-16"
                  />
              </div>
            ))}
            <div className="mt-2 text-sm">
                      <span>
                Total Product Mix:&nbsp;
                <span className={totalProductMix > 100 ? "text-red-600 font-bold" : "text-green-700 font-semibold"}>
                  {totalProductMix}%
                      </span>
                {totalProductMix > 100 && (
                  <span className="ml-2 text-xs text-red-500 font-semibold">
                    (Should not exceed 100%)
                  </span>
                )}
              </span>
            </div>
            </div>
          </div>

            {/* Price Growth */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
              Price Growth (% per year)
            </label>
            <input
              type="number"
              step="0.1"
              value={priceGrowth}
              onChange={(e) => setPriceGrowth(parseFloat(e.target.value))}
                className="input"
            />
          </div>
        </div>
        </aside>
        )}

        {/* Main Content Area */}
        <div className="flex-1 p-4">
          {activeTab === 'dashboard' && (
            <div>
              {/* Scenario Toggle */}
              <div className="mb-4 flex gap-2 items-center">
                <span className="font-medium">Scenario:</span>
                <button
                  className={`px-3 py-1 rounded ${scenario === 'base' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                  onClick={() => handleScenarioChange('base')}
                >Base</button>
                <button
                  className={`px-3 py-1 rounded ${scenario === 'optimistic' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                  onClick={() => handleScenarioChange('optimistic')}
                >Optimistic</button>
                <button
                  className={`px-3 py-1 rounded ${scenario === 'pessimistic' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                  onClick={() => handleScenarioChange('pessimistic')}
                >Pessimistic</button>
              </div>
              {/* What-if Quick Input Panel */}
              <div className="mb-6 flex flex-wrap gap-4 items-end bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
                <span className="font-medium">What-if:</span>
                <div>
                  <label className="block text-xs text-gray-600">Price %</label>
                  <input type="number" className="input w-20" value={whatIf.price} onChange={e => setWhatIf(w => ({ ...w, price: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Variable Cost %</label>
                  <input type="number" className="input w-20" value={whatIf.variable} onChange={e => setWhatIf(w => ({ ...w, variable: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Fixed Cost %</label>
                  <input type="number" className="input w-20" value={whatIf.fixed} onChange={e => setWhatIf(w => ({ ...w, fixed: parseFloat(e.target.value) || 0 }))} />
                </div>
                <button className="btn btn-primary ml-2" onClick={applyWhatIf}>Apply</button>
                <button className="btn btn-secondary" onClick={resetWhatIf}>Reset</button>
              </div>
              {/* NPV, IRR, Payback */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                {/* NPV Card */}
                <div className="card">
                  <h3>Net Present Value</h3>
                  <div className="text-2xl font-bold">
                    {formatNumber(metrics.npv)} M THB
                  </div>
                  <div className="text-sm text-gray-500">
                    {`${yearConfig.duration} year projection`}
                  </div>
                </div>
                {/* IRR Card */}
                <div className="card">
                  <h3>IRR</h3>
                  <div className="flex items-center gap-2">
                    <div className="text-2xl font-bold">
                      {metrics.irr > 0 ? `${metrics.irr.toFixed(2)}%` : 'Not Calculable'}
                    </div>
                    {metrics.irr <= 0 && (
                      <div className="text-sm text-red-500">
                        {`Project does not generate positive returns in ${yearConfig.duration} years`}
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {`${yearConfig.duration} year projection`}
                  </div>
                </div>
                {/* Payback Period Card */}
                <div className="card">
                  <h3>Payback Period</h3>
                  <div className="text-2xl font-bold">
                    {metrics.paybackPeriod > 0 && metrics.paybackPeriod <= yearConfig.duration
                      ? `${metrics.paybackPeriod.toFixed(2)} Years`
                      : 'No Payback'}
                  </div>
                  <div className="text-sm text-gray-500">
                    Year when cumulative cash flow becomes positive
                  </div>
                  {metrics.paybackPeriod > yearConfig.duration && (
                    <div className="text-sm text-red-500">
                      Investment not recovered in projection period
                    </div>
                  )}
                </div>
              </div>
              {/* Financial Projections */}
              <div className="card" key={modelVersion}>
                <h3 className="text-lg font-bold mb-6">Financial Projections</h3>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart 
                      data={financialData.filter(d => 
                        d.year >= yearConfig.startYear && 
                        d.year < yearConfig.startYear + yearConfig.duration
                      )}
                      margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis 
                        dataKey="year"
                        tick={{ fill: '#6B7280' }}
                        interval={Math.floor(yearConfig.duration / 10)}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                        domain={[
                          yearConfig.startYear, 
                          yearConfig.startYear + yearConfig.duration - 1
                        ]}
                      />
                      <YAxis 
                        tick={{ fill: '#6B7280' }}
                        tickFormatter={(value) => {
                          if (value === 0) return '0';
                          if (Math.abs(value) >= 1000) return `${(value/1000).toFixed(1)}k`;
                          return value.toFixed(0);
                        }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                        formatter={(value: number) => [`${value.toFixed(2)} M THB`, '']}
                        labelFormatter={(year) => `Year ${year}`}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#0EA5E9" 
                        strokeWidth={2}
                        dot={{ fill: '#0EA5E9', r: 4 }}
                        name="Revenue (M THB)" 
                        isAnimationActive={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="operatingProfit" 
                        stroke="#10B981" 
                        strokeWidth={2}
                        dot={{ fill: '#10B981', r: 4 }}
                        name="Operating Profit (M THB)" 
                        isAnimationActive={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="netCashFlow" 
                        stroke="#6366F1" 
                        strokeWidth={2}
                        dot={{ fill: '#6366F1', r: 4 }}
                        name="Net Cash Flow (M THB)" 
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              {/* Cumulative Cash Flow Trend Chart */}
              <div className="card mt-8">
                <h3 className="text-lg font-bold mb-6">Cumulative Cash Flow Trend</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={(() => {
                        let cumulative = 0;
                        return financialData.map((d) => {
                          cumulative += d.netCashFlow;
                          return { year: d.year, cumulativeCashFlow: cumulative };
                        });
                      })()}
                      margin={{ top: 5, right: 30, left: 20, bottom: 40 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="year" tick={{ fill: '#6B7280' }} angle={-45} textAnchor="end" height={60} />
                      <YAxis tick={{ fill: '#6B7280' }} tickFormatter={value => value.toLocaleString()} />
                      <Tooltip formatter={(value) => [`${value.toLocaleString()} M THB`, '']} labelFormatter={year => `Year ${year}`} />
                      <Legend />
                      <Line type="monotone" dataKey="cumulativeCashFlow" stroke="#f59e42" strokeWidth={2} dot={{ fill: '#f59e42', r: 4 }} name="Cumulative Cash Flow (M THB)" isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              {/* Explanatory Note under the graph */}
              <div className="mt-4 mb-8 p-3 bg-blue-50 border-l-4 border-blue-400 text-blue-900 rounded">
                <strong>Note:</strong> All figures on this dashboard include variable costs, fixed costs, loan payments, and other relevant expenses. The financial metrics and projections reflect the full cost structure of your business.
              </div>
              {/* Break-even Analysis (Summary) with white background */}
              <div className="bg-white rounded shadow p-6 mt-8 mb-8">
                {(() => {
                  // Use the same break-even logic as the break-even tab
                  const weightedPrice = priceTiers.reduce((sum, tier) => sum + (tier.price * (tier.percentage / 100)), 0);
                  const monthlyFixedCost = fixedCosts.reduce((sum, item) => {
                    if (item.monthly) return sum + item.cost;
                    if (item.annual) return sum + (item.cost / 12);
                    return sum;
                  }, 0);
                  const calculateTotalVariableCost = (volume: number) => {
                    return variableCosts.reduce((sum, cost) => {
                      const effectiveUnitCost = calculateEffectiveVariableCost(cost, volume);
                      if (cost.all) {
                        return sum + effectiveUnitCost;
                      } else {
                        const matchingTier = priceTiers.find(tier => tier.name === cost.tier);
                        if (matchingTier) {
                          return sum + (effectiveUnitCost * (matchingTier.percentage / 100));
                        }
                      }
                      return sum;
                    }, 0);
                  };
                  let breakEvenVolume = null;
                  let breakEvenCapacity = null;
                  let effectiveVariableCostAtBE = null;
                  let contributionMarginAtBE = null;
                  let step = Math.max(1, Math.floor(modelData.capacity / 200));
                  for (let v = 0; v <= modelData.capacity; v += step) {
                    const effectiveVC = calculateTotalVariableCost(v);
                    const revenue = v * weightedPrice;
                    const variableCosts = v * effectiveVC;
                    const contribution = revenue - variableCosts;
                    const profit = contribution - monthlyFixedCost;
                    if (profit > 0) {
                      breakEvenVolume = v;
                      breakEvenCapacity = (v / modelData.capacity) * 100;
                      effectiveVariableCostAtBE = effectiveVC;
                      contributionMarginAtBE = weightedPrice - effectiveVC;
                      break;
                    }
                  }
                  let breakEvenYear = 0;
                  if (breakEvenVolume !== null) {
                    for (let year = 0; year < yearConfig.duration; year++) {
                      const yearsSinceStart = year;
                      const baseUsage = capacityUsage;
                      const growth = capacityGrowth;
                      const projectedUsage = baseUsage * Math.pow(1 + growth / 100, yearsSinceStart);
                      const cappedUsage = Math.min(projectedUsage, 100);
                      const monthlyVolume = modelData.capacity * (cappedUsage / 100);
                      if (monthlyVolume >= breakEvenVolume) {
                        const prevYearVolume = year > 0 ? modelData.capacity * (Math.min(baseUsage * Math.pow(1 + growth / 100, yearsSinceStart - 1), 100) / 100) : 0;
                        const fraction = (breakEvenVolume - prevYearVolume) / (monthlyVolume - prevYearVolume);
                        breakEvenYear = year + fraction;
                        break;
                      }
                    }
                  }
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div className="border rounded p-4">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Monthly Fixed Costs:</span>
                            <span className="font-medium">{formatNumber(monthlyFixedCost)} THB</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Variable Cost per Ton (at BE):</span>
                            <span className="font-medium">{breakEvenVolume !== null ? formatNumber(effectiveVariableCostAtBE ?? 0) : 'N/A'} THB</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Average Price per Ton:</span>
                            <span className="font-medium">{formatNumber(weightedPrice)} THB</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Contribution Margin per Ton (at BE):</span>
                            <span className="font-medium">{breakEvenVolume !== null ? formatNumber(contributionMarginAtBE ?? 0) : 'N/A'} THB</span>
                          </div>
                          <div className="border-t pt-2 flex justify-between font-bold">
                            <span>Break-even Volume:</span>
                            <span>{breakEvenVolume !== null ? (breakEvenVolume as number).toFixed(1) + ' tons/month' : 'Not Achieved'}</span>
                          </div>
                          <div className="flex justify-between font-bold">
                            <span>Break-even Capacity Utilization:</span>
                            <span>{breakEvenVolume !== null && breakEvenCapacity !== null ? breakEvenCapacity.toFixed(1) + '%' : 'Not Achieved'}</span>
                          </div>
                          <div className="flex justify-between font-bold">
                            <span>Break-even Year:</span>
                            <span>{breakEvenVolume !== null && breakEvenYear > 0 ? `${(yearConfig.startYear + breakEvenYear).toFixed(1)}` : 'Not Achieved'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="border rounded p-4">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Current Monthly Volume:</span>
                            <span className="font-medium">{(modelData.capacity * (capacityUsage / 100)).toFixed(0)} tons</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Break-even Volume:</span>
                            <span className="font-medium">{breakEvenVolume !== null ? (breakEvenVolume as number).toFixed(0) : 'N/A'} tons</span>
                          </div>
                          <div className="flex justify-between font-bold">
                            <span>Safety Margin (Volume):</span>
                            <span>{breakEvenVolume !== null ? ((modelData.capacity * (capacityUsage / 100)) - (breakEvenVolume as number)).toFixed(0) : 'N/A'} tons</span>
                          </div>
                          <div className="flex justify-between font-bold">
                            <span>Safety Margin (%):</span>
                            <span>{breakEvenVolume !== null ? (100 * ((modelData.capacity * (capacityUsage / 100)) - (breakEvenVolume as number)) / (modelData.capacity * (capacityUsage / 100))).toFixed(1) : 'N/A'}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
              {/* Key Ratios Card */}
              <div className="card mb-8">
                <h3 className="font-bold mb-4">Key Ratios <span className="text-xs text-gray-500">(Projection Period)</span></h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">Gross Margin %</div>
                    <div className="text-2xl font-bold">
                      {(() => {
                        const totalRevenue = financialData.reduce((sum, year) => sum + year.revenue, 0);
                        const totalVariableCosts = financialData.reduce((sum, year) => sum + year.totalVariableCosts, 0);
                        return totalRevenue > 0 ? ((totalRevenue - totalVariableCosts) / totalRevenue * 100).toFixed(1) + '%' : 'N/A';
                      })()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Operating Margin %</div>
                    <div className="text-2xl font-bold">
                      {(() => {
                        const totalRevenue = financialData.reduce((sum, year) => sum + year.revenue, 0);
                        const totalOperatingProfit = financialData.reduce((sum, year) => sum + year.operatingProfit, 0);
                        return totalRevenue > 0 ? (totalOperatingProfit / totalRevenue * 100).toFixed(1) + '%' : 'N/A';
                      })()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Debt Service Coverage Ratio (DSCR)</div>
                    <div className="text-2xl font-bold">
                      {(() => {
                        const totalNetCashFlow = financialData.reduce((sum, year) => sum + year.netCashFlow, 0);
                        const totalLoanPayments = (() => {
                          // Sum all loan payments for the projection period
                          let total = 0;
                          for (let year of financialData) {
                            const loanPayments = (() => {
                              const schedule = generateAmortizationSchedule(loans).find(s => s.year === year.year);
                              return schedule ? schedule.totalPayment / 1000000 : 0;
                            })();
                            total += loanPayments;
                          }
                          return total;
                        })();
                        return totalLoanPayments > 0 ? (totalNetCashFlow / totalLoanPayments).toFixed(2) : 'N/A';
                      })()}
                    </div>
                  </div>
                </div>
              </div>
              {/* Cost Driver Pie Chart by Product Tier */}
              <div className="card mb-8">
                <h3 className="font-bold mb-4">Variable Cost Breakdown by Product Tier</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                  {priceTiers.map(tier => {
                    // Get all variable costs for this tier
                    const tierVariableCosts = variableCosts.filter(v => v.tier === tier.name || v.all);
                    const annualVolume = modelData.capacityAnnual * (tier.percentage / 100);
                    // Calculate total cost for each variable cost item
                    const costData = tierVariableCosts.map(v => ({
                      name: v.name,
                      value: v.unitCost * annualVolume
                    }));
                    const total = costData.reduce((sum, c) => sum + c.value, 0);
                    // Convert to percentage for each item
                    const pieData = costData.map(c => ({
                      name: c.name,
                      value: c.value,
                      percent: total > 0 ? (c.value / total * 100) : 0
                    }));
                    // Pie chart data: only top 5 + 'Other' if needed
                    let rankedPieData = [...pieData].sort((a, b) => b.percent - a.percent);
                    let visiblePieData = [];
                    if (rankedPieData.length > 5) {
                      visiblePieData = rankedPieData.slice(0, 5);
                      const otherPercent = rankedPieData.slice(5).reduce((sum, c) => sum + c.percent, 0);
                      visiblePieData.push({ name: 'Other', value: 0, percent: otherPercent });
                    } else {
                      visiblePieData = rankedPieData;
                    }
                    return (
                      <div key={tier.name} className="bg-white rounded shadow p-6 flex flex-col items-center w-full max-w-[400px] mx-auto">
                        <h4 className="font-bold mb-4 text-center text-lg">{tier.name}</h4>
                        <div className="flex flex-col items-center justify-center w-full">
                          <ResponsiveContainer width={320} height={320}>
                            <PieChart>
                              <Pie
                                data={visiblePieData}
                                dataKey="percent"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                innerRadius={90}
                                outerRadius={140}
                                isAnimationActive={false}
                                fill="#6366F1"
                                stroke="#fff"
                                strokeWidth={2}
                                label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                                  if (percent < 8) return null;
                                  // Calculate label position
                                  const RADIAN = Math.PI / 180;
                                  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                  const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                  const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                  return (
                                    <text
                                      x={x}
                                      y={y}
                                      textAnchor="middle"
                                      dominantBaseline="central"
                                      style={{ fontWeight: 'bold', fontSize: 18, fill: '#222' }}
                                    >
                                      {`${percent.toFixed(1)}%`}
                                    </text>
                                  );
                                }}
                                labelLine={false}
                              >
                                {visiblePieData.map((entry, idx) => (
                                  <Cell key={`cell-${idx}`} fill={pieColors[idx % pieColors.length]} filter="url(#pieShadow)" />
                                ))}
                              </Pie>
                              <defs>
                                <filter id="pieShadow" x="-20%" y="-20%" width="140%" height="140%">
                                  <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#888" floodOpacity="0.15" />
                                </filter>
                              </defs>
                              <Tooltip content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const { name, percent } = payload[0].payload;
                                  return (
                                    <div className="bg-white p-2 rounded shadow text-xs">
                                      <span className="font-bold">{name}</span><br />
                                      {percent.toFixed(1)}%
                                    </div>
                                  );
                                }
                                return null;
                              }} />
                            </PieChart>
                          </ResponsiveContainer>
                          {/* Legend: show all items, scroll after 6 */}
                          <ol className="mt-4 space-y-1 w-full px-2" style={{ maxHeight: '168px', overflowY: 'auto' }}>
                            {pieData.map((entry, idx) => (
                              <li key={entry.name} className="flex items-center gap-2 text-sm font-medium">
                                <span style={{ display: 'inline-block', width: 16, height: 16, background: pieColors[idx % pieColors.length], borderRadius: 2 }}></span>
                                <span className="font-bold">{idx + 1}.</span>
                                <span className="truncate max-w-[120px]">{entry.name}:</span>
                                <span className="ml-auto font-semibold">{entry.percent.toFixed(1)}%</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'costs' && (
            <div key={modelVersion}>
              <div className="bg-white p-4 rounded shadow mb-6">
                <h2 className="font-bold text-lg mb-4">Fixed Costs</h2>
                <p className="text-sm text-gray-600 mb-4">Monthly fixed costs that don't vary with production volume.</p>

                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white">
                    <thead>
                      <tr>
                        <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost Item</th>
                        <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount (THB)</th>
                        <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                        <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Years</th>
                        <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Equivalent</th>
                        <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fixedCosts.map((item, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                          <td className="py-2 px-4 border-b border-gray-200">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => {
                                const newCosts = [...fixedCosts];
                                newCosts[index].name = e.target.value;
                                setFixedCosts(newCosts);
                              }}
                              className="w-full border-none bg-transparent"
                            />
                          </td>
                          <td className="py-2 px-4 border-b border-gray-200 text-right">
                            <input
                              type="text"
                              value={formatInputNumber(item.cost.toString())}
                              onChange={(e) => {
                                const newCosts = [...fixedCosts];
                                newCosts[index].cost = parseFormattedNumber(e.target.value);
                                setFixedCosts(newCosts);
                              }}
                              className="w-full text-right border-none bg-transparent"
                            />
                          </td>
                          <td className="py-2 px-4 border-b border-gray-200 text-center">
                            <select
                              value={item.type || "regular"}
                              onChange={(e) => {
                                const newCosts = [...fixedCosts];
                                newCosts[index].type = e.target.value;
                                if (e.target.value === "depreciation" && !newCosts[index].years) {
                                  newCosts[index].years = 20;
                                  newCosts[index].startYear = 2023;
                                }
                                setFixedCosts(newCosts);
                              }}
                              className="bg-transparent border-none"
                            >
                              <option value="regular">Regular</option>
                              <option value="depreciation">Depreciation</option>
                            </select>
                          </td>
                          <td className="py-2 px-4 border-b border-gray-200 text-center">
                            <select
                              value={item.monthly ? "monthly" : "annual"}
                              onChange={(e) => {
                                const newCosts = [...fixedCosts];
                                newCosts[index].monthly = e.target.value === "monthly";
                                newCosts[index].annual = e.target.value === "annual";
                                setFixedCosts(newCosts);
                              }}
                              className="bg-transparent border-none"
                            >
                              <option value="monthly">Monthly</option>
                              <option value="annual">Annual</option>
                            </select>
                          </td>
                          <td className="py-2 px-4 border-b border-gray-200 text-center">
                            {item.type === "depreciation" ? (
                              <input
                                type="number"
                                value={item.years || 0}
                                onChange={(e) => {
                                  const newCosts = [...fixedCosts];
                                  newCosts[index].years = parseInt(e.target.value);
                                  setFixedCosts(newCosts);
                                }}
                                className="w-16 text-center border rounded bg-transparent"
                                min="1"
                              />
                            ) : "-"}
                          </td>
                          <td className="py-2 px-4 border-b border-gray-200 text-right">
                            {item.monthly ? item.cost.toLocaleString() : (item.cost / 12).toLocaleString()}
                          </td>
                          <td className="py-2 px-4 border-b border-gray-200 text-center">
                            <button
                              onClick={() => {
                                const newCosts = fixedCosts.filter((_, i) => i !== index);
                                setFixedCosts(newCosts);
                              }}
                              className="text-red-600 hover:text-red-800"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-blue-50">
                        <td className="py-2 px-4 border-t border-gray-300 font-medium">Total Monthly Fixed Costs</td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td className="py-2 px-4 border-t border-gray-300 text-right font-medium">
                          {metrics.monthlyFixedCost ? metrics.monthlyFixedCost.toLocaleString() : "0"} THB
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    className="bg-blue-100 hover:bg-blue-200 text-blue-700 py-1 px-3 rounded text-sm"
                    onClick={() => {
                      setFixedCosts([...fixedCosts, {
                        name: "New Cost Item",
                        cost: 0,
                        monthly: true,
                        type: "regular"
                      }]);
                    }}
                  >
                    + Add Cost Item
                  </button>
                </div>
              </div>

              <div className="bg-white p-4 rounded shadow">
                <h2 className="font-bold text-lg mb-4">Variable Costs</h2>
                <p className="text-sm text-gray-600 mb-4">Costs that vary with production volume, specified per ton.</p>

                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white">
                    <thead>
                      <tr>
                        <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost Item</th>
                        <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Base Unit Cost (THB/ton)</th>
                        <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Volume Reduction (% per 1000 tons)</th>
                        <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Effective Cost (THB/ton)</th>
                        <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Applies To</th>
                        <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {variableCosts.map((item, index) => {
                        const monthlyVolume = modelData.capacity * (capacityUsage / 100);
                        const effectiveCost = calculateEffectiveVariableCost(item, monthlyVolume);
                        
                        return (
                          <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                            <td className="py-2 px-4 border-b border-gray-200">
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => {
                                  const newCosts = [...variableCosts];
                                  newCosts[index].name = e.target.value;
                                  setVariableCosts(newCosts);
                                }}
                                className="w-full border-none bg-transparent"
                              />
                            </td>
                            <td className="py-2 px-4 border-b border-gray-200 text-right">
                              <input
                                type="text"
                                value={formatInputNumber(item.unitCost.toString())}
                                onChange={(e) => {
                                  const newCosts = [...variableCosts];
                                  newCosts[index].unitCost = parseFormattedNumber(e.target.value);
                                  setVariableCosts(newCosts);
                                }}
                                className="w-full text-right border-none bg-transparent"
                              />
                            </td>
                            <td className="py-2 px-4 border-b border-gray-200 text-right">
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                value={item.volumeReduction || 0}
                                onChange={(e) => {
                                  const newCosts = [...variableCosts];
                                  newCosts[index].volumeReduction = parseFloat(e.target.value);
                                  setVariableCosts(newCosts);
                                }}
                                className="w-full text-right border-none bg-transparent"
                              />
                            </td>
                            <td className="py-2 px-4 border-b border-gray-200 text-right">
                              {formatNumber(effectiveCost)}
                            </td>
                            <td className="py-2 px-4 border-b border-gray-200 text-center">
                              <select
                                value={item.all ? "all" : item.tier}
                                onChange={(e) => {
                                  const newCosts = [...variableCosts];
                                  if (e.target.value === "all") {
                                    newCosts[index].all = true;
                                    delete newCosts[index].tier;
                                  } else {
                                    newCosts[index].all = false;
                                    newCosts[index].tier = e.target.value;
                                  }
                                  setVariableCosts(newCosts);
                                }}
                                className="bg-transparent border-none"
                              >
                                <option value="all">All Products</option>
                                {priceTiers.map(tier => (
                                  <option key={tier.name} value={tier.name}>{tier.name}</option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2 px-4 border-b border-gray-200 text-center">
                              <button
                                onClick={() => {
                                  const newCosts = variableCosts.filter((_, i) => i !== index);
                                  setVariableCosts(newCosts);
                                }}
                                className="text-red-600 hover:text-red-800"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-blue-50">
                        <td className="py-2 px-4 border-t border-gray-300 font-medium">Weighted Variable Cost</td>
                        <td className="py-2 px-4 border-t border-gray-300 text-right font-medium">
                          {/* Weighted Base Unit Cost */}
                          {(() => {
                            // Weighted by product mix (for tiered) or equally for 'all'
                            const totalPercentage = priceTiers.reduce((sum, tier) => sum + tier.percentage, 0);
                            let weightedBase = 0;
                            variableCosts.forEach(item => {
                              if (item.all) {
                                weightedBase += item.unitCost;
                              } else {
                                const tier = priceTiers.find(t => t.name === item.tier);
                                if (tier) weightedBase += item.unitCost * (tier.percentage / totalPercentage);
                              }
                            });
                            return weightedBase ? weightedBase.toLocaleString() : "0";
                          })()} THB/ton
                        </td>
                        <td></td>
                        <td className="py-2 px-4 border-t border-gray-300 text-right font-medium">
                          {/* Weighted Effective Cost */}
                          {(() => {
                            const totalPercentage = priceTiers.reduce((sum, tier) => sum + tier.percentage, 0);
                            let weightedEff = 0;
                            const monthlyVolume = modelData.capacity * (capacityUsage / 100);
                            variableCosts.forEach(item => {
                              const eff = calculateEffectiveVariableCost(item, monthlyVolume);
                              if (item.all) {
                                weightedEff += eff;
                              } else {
                                const tier = priceTiers.find(t => t.name === item.tier);
                                if (tier) weightedEff += eff * (tier.percentage / totalPercentage);
                              }
                            });
                            return weightedEff ? weightedEff.toLocaleString() : "0";
                          })()} THB/ton
                        </td>
                        <td></td>
                      </tr>
                      <tr className="bg-green-50">
                        <td className="py-2 px-4 border-t border-gray-300 font-medium">Contribution Margin</td>
                        <td className="py-2 px-4 border-t border-gray-300 text-right font-medium">
                          {/* Margin for Base Unit Cost */}
                          {(() => {
                            const totalPercentage = priceTiers.reduce((sum, tier) => sum + tier.percentage, 0);
                            let weightedBase = 0;
                            variableCosts.forEach(item => {
                              if (item.all) {
                                weightedBase += item.unitCost;
                              } else {
                                const tier = priceTiers.find(t => t.name === item.tier);
                                if (tier) weightedBase += item.unitCost * (tier.percentage / totalPercentage);
                              }
                            });
                            const weightedPrice = priceTiers.reduce((sum, tier) => sum + (tier.price * (tier.percentage / 100)), 0);
                            const margin = weightedPrice - weightedBase;
                            return margin ? margin.toLocaleString() : "0";
                          })()} THB/ton
                        </td>
                        <td className="py-2 px-4 border-t border-gray-300 text-center font-medium">
                          {/* Margin % for Base Unit Cost */}
                          {(() => {
                            const totalPercentage = priceTiers.reduce((sum, tier) => sum + tier.percentage, 0);
                            let weightedBase = 0;
                            variableCosts.forEach(item => {
                              if (item.all) {
                                weightedBase += item.unitCost;
                              } else {
                                const tier = priceTiers.find(t => t.name === item.tier);
                                if (tier) weightedBase += item.unitCost * (tier.percentage / totalPercentage);
                              }
                            });
                            const weightedPrice = priceTiers.reduce((sum, tier) => sum + (tier.price * (tier.percentage / 100)), 0);
                            const margin = weightedPrice - weightedBase;
                            return weightedPrice ? ((margin / weightedPrice) * 100).toFixed(1) + '%' : '0%';
                          })()}
                        </td>
                        <td className="py-2 px-4 border-t border-gray-300 text-right font-medium">
                          {/* Margin for Effective Cost */}
                          {(() => {
                            const totalPercentage = priceTiers.reduce((sum, tier) => sum + tier.percentage, 0);
                            let weightedEff = 0;
                            const monthlyVolume = modelData.capacity * (capacityUsage / 100);
                            variableCosts.forEach(item => {
                              const eff = calculateEffectiveVariableCost(item, monthlyVolume);
                              if (item.all) {
                                weightedEff += eff;
                              } else {
                                const tier = priceTiers.find(t => t.name === item.tier);
                                if (tier) weightedEff += eff * (tier.percentage / totalPercentage);
                              }
                            });
                            const weightedPrice = priceTiers.reduce((sum, tier) => sum + (tier.price * (tier.percentage / 100)), 0);
                            const margin = weightedPrice - weightedEff;
                            return margin ? margin.toLocaleString() : "0";
                          })()} THB/ton
                        </td>
                        <td className="py-2 px-4 border-t border-gray-300 text-center font-medium">
                          {/* Margin % for Effective Cost */}
                          {(() => {
                            const totalPercentage = priceTiers.reduce((sum, tier) => sum + tier.percentage, 0);
                            let weightedEff = 0;
                            const monthlyVolume = modelData.capacity * (capacityUsage / 100);
                            variableCosts.forEach(item => {
                              const eff = calculateEffectiveVariableCost(item, monthlyVolume);
                              if (item.all) {
                                weightedEff += eff;
                              } else {
                                const tier = priceTiers.find(t => t.name === item.tier);
                                if (tier) weightedEff += eff * (tier.percentage / totalPercentage);
                              }
                            });
                            const weightedPrice = priceTiers.reduce((sum, tier) => sum + (tier.price * (tier.percentage / 100)), 0);
                            const margin = weightedPrice - weightedEff;
                            return weightedPrice ? ((margin / weightedPrice) * 100).toFixed(1) + '%' : '0%';
                          })()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    className="bg-blue-100 hover:bg-blue-200 text-blue-700 py-1 px-3 rounded text-sm"
                    onClick={() => {
                      setVariableCosts([...variableCosts, { name: "New Variable Cost", unitCost: 0, all: true, volumeReduction: 0 }]);
                    }}
                  >
                    + Add Variable Cost
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'financials' && (
            <div className="bg-white p-4 rounded shadow">
              <h2 className="font-bold text-lg mb-4">Financial Projections</h2>
              
              <div className="mb-6">
                <h3 className="font-medium text-lg mb-3">Yearly Financial Overview</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="py-2 px-4 border-b text-left">Year</th>
                        <th className="py-2 px-4 border-b text-right">Revenue (M THB)</th>
                        <th className="py-2 px-4 border-b text-right">Operating Profit (M THB)</th>
                        <th className="py-2 px-4 border-b text-right">Net Cash Flow (M THB)</th>
                        <th className="py-2 px-4 border-b text-right">Profit Margin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {financialData.map((year: { year: number; revenue: number; operatingProfit: number; netCashFlow: number }, index) => (
                        <tr key={year.year} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                          <td className="py-2 px-4 border-b">{year.year}</td>
                          <td className="py-2 px-4 border-b text-right">{formatNumber(year.revenue)}</td>
                          <td className={`py-2 px-4 border-b text-right ${year.operatingProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatNumber(year.operatingProfit)}
                          </td>
                          <td className={`py-2 px-4 border-b text-right ${year.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatNumber(year.netCashFlow)}
                          </td>
                          <td className="py-2 px-4 border-b text-right">
                            {year.revenue > 0 ? `${((year.operatingProfit / year.revenue) * 100).toFixed(1)}%` : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-blue-50">
                        <td className="py-2 px-4 border-t border-gray-300 font-medium">Total</td>
                        <td className="py-2 px-4 border-t border-gray-300 text-right font-medium">
                          {formatNumber(financialData.reduce((sum, year: {revenue: number}) => sum + year.revenue, 0))}
                        </td>
                        <td className="py-2 px-4 border-t border-gray-300 text-right font-medium">
                          {formatNumber(financialData.reduce((sum, year: {operatingProfit: number}) => sum + year.operatingProfit, 0))}
                        </td>
                        <td className="py-2 px-4 border-t border-gray-300 text-right font-medium">
                          {formatNumber(financialData.reduce((sum, year: {netCashFlow: number}) => sum + year.netCashFlow, 0))}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded shadow mb-6">
                <h3 className="font-bold mb-4">Revenue & Profit Trend</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={financialData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="year" 
                      interval={2}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#0EA5E9" 
                      strokeWidth={2}
                      dot={{ fill: '#0EA5E9' }}
                      name="Revenue (M THB)" 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="operatingProfit" 
                      stroke="#10B981" 
                      strokeWidth={2}
                      dot={{ fill: '#10B981' }}
                      name="Operating Profit (M THB)" 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="netCashFlow" 
                      stroke="#6366F1" 
                      strokeWidth={2}
                      dot={{ fill: '#6366F1' }}
                      name="Net Cash Flow (M THB)" 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeTab === 'loans' && (
            <div className="space-y-6">
              <div className="card">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold">Loan Configuration</h2>
                  <button 
                    className="btn btn-primary"
                    onClick={() => setLoans([...loans, {
                      name: "New Loan",
                      amount: 0,
                      bank: "",
                      interestRate: 5.0,
                      term: 60,
                      startDate: new Date().toISOString().slice(0, 7),
                      type: "other"
                    }])}
                  >
                    + Add Loan
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {loans.map((loan, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Loan Name */}
                <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Loan Name
                          </label>
                          <input
                            type="text"
                            value={loan.name}
                            onChange={(e) => {
                              const newLoans = [...loans];
                              newLoans[index].name = e.target.value;
                              setLoans(newLoans);
                            }}
                            className="input"
                          />
                  </div>

                        {/* Amount */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Amount (THB)
                          </label>
                          <input
                            type="text"
                            value={formatInputNumber(loan.amount.toString())}
                            onChange={(e) => {
                              const newLoans = [...loans];
                              newLoans[index].amount = parseFormattedNumber(e.target.value);
                              setLoans(newLoans);
                            }}
                            className="input"
                          />
                </div>

                        {/* Bank */}
                <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Bank
                          </label>
                          <input
                            type="text"
                            value={loan.bank}
                            onChange={(e) => {
                              const newLoans = [...loans];
                              newLoans[index].bank = e.target.value;
                              setLoans(newLoans);
                            }}
                            className="input"
                          />
                  </div>

                        {/* Interest Rate */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Interest Rate (%)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={loan.interestRate}
                            onChange={(e) => {
                              const newLoans = [...loans];
                              newLoans[index].interestRate = parseFloat(e.target.value);
                              setLoans(newLoans);
                            }}
                            className="input"
                          />
                </div>

                        {/* Term */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Term (months)
                          </label>
                          <input
                            type="number"
                            value={loan.term}
                            onChange={(e) => {
                              const newLoans = [...loans];
                              newLoans[index].term = parseInt(e.target.value);
                              setLoans(newLoans);
                            }}
                            className="input"
                          />
              </div>

                        {/* Start Date */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Start Date
                          </label>
                          <input
                            type="month"
                            value={loan.startDate}
                            onChange={(e) => {
                              const newLoans = [...loans];
                              newLoans[index].startDate = e.target.value;
                              setLoans(newLoans);
                            }}
                            className="input"
                          />
                        </div>
                      </div>

                      {/* Loan Summary */}
                      <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <div className="text-sm text-gray-500">Monthly Payment</div>
                          <div className="text-lg font-semibold">
                            {formatNumber(calculateMonthlyPayment(loan.amount, loan.interestRate, loan.term))} THB
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Total Interest</div>
                          <div className="text-lg font-semibold">
                            {formatNumber(calculateTotalInterest(loan.amount, loan.interestRate, loan.term))} THB
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Total Payment</div>
                          <div className="text-lg font-semibold">
                            {(loan.amount + calculateTotalInterest(loan.amount, loan.interestRate, loan.term)).toLocaleString()} THB
                          </div>
                        </div>
                      </div>

                      {/* Delete Button */}
                      <div className="mt-4 flex justify-end">
                        <button
                          className="text-red-600 hover:text-red-800"
                          onClick={() => {
                            const newLoans = loans.filter((_, i) => i !== index);
                            setLoans(newLoans);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Amortization Schedule */}
              <div className="card">
                <h3 className="text-lg font-bold mb-4">Combined Loan Payment Schedule</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr>
                        <th className="table-header">Year</th>
                        <th className="table-header text-right">Principal Payment</th>
                        <th className="table-header text-right">Interest Payment</th>
                        <th className="table-header text-right">Total Payment</th>
                        <th className="table-header text-right">Remaining Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {generateAmortizationSchedule(loans).map((year, index) => (
                        <tr key={index} className="border-b">
                          <td className="table-cell">{year.year}</td>
                          <td className="table-cell text-right">{formatNumber(year.principal)}</td>
                          <td className="table-cell text-right">{formatNumber(year.interest)}</td>
                          <td className="table-cell text-right">{formatNumber(year.totalPayment)}</td>
                          <td className="table-cell text-right">{formatNumber(year.remainingBalance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cashflow' && (
            <div className="space-y-6">
              <div className="card">
                <h2 className="text-xl font-bold mb-6">Cash Flow After Debt Service</h2>
                <p className="text-gray-600 mb-4">
                  This projection shows the company's cash flow after accounting for loan payments (principal and interest).
                </p>

                <div className="h-[400px] mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart 
                      data={financialData.map(yearData => {
                        const loanPayments = generateAmortizationSchedule(loans)
                          .find(schedule => schedule.year === yearData.year);
                        
                        const cashFlowData: CashFlowData = {
                          year: yearData.year,
                          revenue: yearData.revenue,
                          operatingProfit: yearData.operatingProfit,
                          netCashFlow: yearData.netCashFlow,
                          loanPayments: loanPayments ? loanPayments.totalPayment / 1000000 : 0,
                          netCashFlowAfterDebt: yearData.netCashFlow - (loanPayments ? loanPayments.totalPayment / 1000000 : 0)
                        };
                        
                        return cashFlowData;
                      })}
                      margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis 
                        dataKey="year"
                        tick={{ fill: '#6B7280' }}
                        interval={Math.floor(yearConfig.duration / 10)}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                        domain={[
                          yearConfig.startYear, 
                          yearConfig.startYear + yearConfig.duration - 1
                        ]}
                      />
                      <YAxis 
                        tick={{ fill: '#6B7280' }}
                        tickFormatter={(value) => {
                          if (value === 0) return '0';
                          if (Math.abs(value) >= 1000) return `${(value/1000).toFixed(1)}k`;
                          return value.toFixed(0);
                        }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                        formatter={(value: number) => [`${value.toFixed(2)} M THB`, '']}
                        labelFormatter={(year) => `Year ${year}`}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#0EA5E9" 
                        strokeWidth={2}
                        dot={{ fill: '#0EA5E9', r: 4 }}
                        name="Revenue (M THB)" 
                        isAnimationActive={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="operatingProfit" 
                        stroke="#10B981" 
                        strokeWidth={2}
                        dot={{ fill: '#10B981', r: 4 }}
                        name="Operating Profit (M THB)" 
                        isAnimationActive={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="netCashFlow" 
                        stroke="#6366F1" 
                        strokeWidth={2}
                        dot={{ fill: '#6366F1', r: 4 }}
                        name="Net Cash Flow (M THB)" 
                        isAnimationActive={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="loanPayments" 
                        stroke="#F59E0B" 
                        strokeWidth={2}
                        dot={{ fill: '#F59E0B', r: 4 }}
                        name="Loan Payments (M THB)" 
                        isAnimationActive={false}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="netCashFlowAfterDebt" 
                        stroke="#EF4444" 
                        strokeWidth={2}
                        dot={{ fill: '#EF4444', r: 4 }}
                        name="Net Cash Flow After Debt (M THB)" 
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="py-2 px-4 border-b text-left">Year</th>
                        <th className="py-2 px-4 border-b text-right">Revenue (M THB)</th>
                        <th className="py-2 px-4 border-b text-right">Operating Profit (M THB)</th>
                        <th className="py-2 px-4 border-b text-right">Net Cash Flow (M THB)</th>
                        <th className="py-2 px-4 border-b text-right">Loan Payments (M THB)</th>
                        <th className="py-2 px-4 border-b text-right">Net Cash Flow After Debt (M THB)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {financialData.map((yearData, index) => {
                        const loanPayments = generateAmortizationSchedule(loans)
                          .find(schedule => schedule.year === yearData.year);
                        const netCashFlowAfterDebt = yearData.netCashFlow - (loanPayments ? loanPayments.totalPayment / 1000000 : 0);
                        
                        return (
                          <tr key={yearData.year} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                            <td className="py-2 px-4 border-b">{yearData.year}</td>
                            <td className="py-2 px-4 border-b text-right">{formatNumber(yearData.revenue)}</td>
                            <td className={`py-2 px-4 border-b text-right ${yearData.operatingProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatNumber(yearData.operatingProfit)}
                            </td>
                            <td className={`py-2 px-4 border-b text-right ${yearData.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatNumber(yearData.netCashFlow)}
                            </td>
                            <td className="py-2 px-4 border-b text-right text-amber-600">
                              {formatNumber(loanPayments ? loanPayments.totalPayment / 1000000 : 0)}
                            </td>
                            <td className={`py-2 px-4 border-b text-right ${netCashFlowAfterDebt >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatNumber(netCashFlowAfterDebt)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-blue-50">
                        <td className="py-2 px-4 border-t border-gray-300 font-medium">Total</td>
                        <td className="py-2 px-4 border-t border-gray-300 text-right font-medium">
                          {formatNumber(financialData.reduce((sum, year) => sum + year.revenue, 0))}
                        </td>
                        <td className="py-2 px-4 border-t border-gray-300 text-right font-medium">
                          {formatNumber(financialData.reduce((sum, year) => sum + year.operatingProfit, 0))}
                        </td>
                        <td className="py-2 px-4 border-t border-gray-300 text-right font-medium">
                          {formatNumber(financialData.reduce((sum, year) => sum + year.netCashFlow, 0))}
                        </td>
                        <td className="py-2 px-4 border-t border-gray-300 text-right font-medium text-amber-600">
                          {formatNumber(generateAmortizationSchedule(loans).reduce((sum, year) => sum + year.totalPayment / 1000000, 0))}
                        </td>
                        <td className="py-2 px-4 border-t border-gray-300 text-right font-medium">
                          {formatNumber(financialData.reduce((sum, year) => {
                            const loanPayments = generateAmortizationSchedule(loans)
                              .find(schedule => schedule.year === year.year);
                            return sum + (year.netCashFlow - (loanPayments ? loanPayments.totalPayment / 1000000 : 0));
                          }, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'breakeven' && (
            <div className="bg-white p-4 rounded shadow">
              <h2 className="font-bold text-lg mb-4">Break-even Analysis</h2>
              <p className="mb-6">
                Based on your current cost structure and pricing, here's a detailed break-even analysis.
              </p>

              {/* Dynamic break-even calculation (first positive profit) */}
              {(() => {
                const weightedPrice = priceTiers.reduce((sum, tier) => sum + (tier.price * (tier.percentage / 100)), 0);
                const monthlyFixedCost = fixedCosts.reduce((sum, item) => {
                  if (item.monthly) return sum + item.cost;
                  if (item.annual) return sum + (item.cost / 12);
                  return sum;
                }, 0);
                const calculateTotalVariableCost = (volume: number) => {
                  return variableCosts.reduce((sum, cost) => {
                    const effectiveUnitCost = calculateEffectiveVariableCost(cost, volume);
                    if (cost.all) {
                      return sum + effectiveUnitCost;
                    } else {
                      const matchingTier = priceTiers.find(tier => tier.name === cost.tier);
                      if (matchingTier) {
                        return sum + (effectiveUnitCost * (matchingTier.percentage / 100));
                      }
                    }
                    return sum;
                  }, 0);
                };
                let breakEvenVolume = null;
                let breakEvenProfit = null;
                let breakEvenCapacity = null;
                let effectiveVariableCostAtBE = null;
                let contributionMarginAtBE = null;
                let step = Math.max(1, Math.floor(modelData.capacity / 200));
                for (let v = 0; v <= modelData.capacity; v += step) {
                  const effectiveVC = calculateTotalVariableCost(v);
                  const revenue = v * weightedPrice;
                  const variableCosts = v * effectiveVC;
                  const contribution = revenue - variableCosts;
                  const profit = contribution - monthlyFixedCost;
                  if (profit > 0) {
                    breakEvenVolume = v;
                    breakEvenProfit = profit;
                    breakEvenCapacity = (v / modelData.capacity) * 100;
                    effectiveVariableCostAtBE = effectiveVC;
                    contributionMarginAtBE = weightedPrice - effectiveVC;
                    break;
                  }
                }
                let breakEvenYear = 0;
                if (breakEvenVolume !== null) {
                  for (let year = 0; year < yearConfig.duration; year++) {
                    const yearsSinceStart = year;
                    const baseUsage = capacityUsage;
                    const growth = capacityGrowth;
                    const projectedUsage = baseUsage * Math.pow(1 + growth / 100, yearsSinceStart);
                    const cappedUsage = Math.min(projectedUsage, 100);
                    const monthlyVolume = modelData.capacity * (cappedUsage / 100);
                    if (monthlyVolume >= breakEvenVolume) {
                      const prevYearVolume = year > 0 ? modelData.capacity * (Math.min(baseUsage * Math.pow(1 + growth / 100, yearsSinceStart - 1), 100) / 100) : 0;
                      const fraction = (breakEvenVolume - prevYearVolume) / (monthlyVolume - prevYearVolume);
                      breakEvenYear = year + fraction;
                      break;
                    }
                  }
                }
                return (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div className="border rounded p-4">
                        <h3 className="font-medium text-lg mb-3">Break-even Summary</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Monthly Fixed Costs:</span>
                            <span className="font-medium">{formatNumber(monthlyFixedCost)} THB</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Variable Cost per Ton (at BE):</span>
                            <span className="font-medium">{breakEvenVolume !== null ? formatNumber(effectiveVariableCostAtBE ?? 0) : 'N/A'} THB</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Average Price per Ton:</span>
                            <span className="font-medium">{formatNumber(weightedPrice)} THB</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Contribution Margin per Ton (at BE):</span>
                            <span className="font-medium">{breakEvenVolume !== null ? formatNumber(contributionMarginAtBE ?? 0) : 'N/A'} THB</span>
                          </div>
                          <div className="border-t pt-2 flex justify-between font-bold">
                            <span>Break-even Volume:</span>
                            <span>{breakEvenVolume !== null ? (breakEvenVolume as number).toFixed(1) + ' tons/month' : 'Not Achieved'}</span>
                          </div>
                          <div className="flex justify-between font-bold">
                            <span>Break-even Capacity Utilization:</span>
                            <span>{breakEvenVolume !== null && breakEvenCapacity !== null ? breakEvenCapacity.toFixed(1) + '%' : 'Not Achieved'}</span>
                          </div>
                          <div className="flex justify-between font-bold">
                            <span>Break-even Year:</span>
                            <span>{breakEvenVolume !== null && breakEvenYear > 0 ? `${(yearConfig.startYear + breakEvenYear).toFixed(1)}` : 'Not Achieved'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="border rounded p-4">
                        <h3 className="font-medium text-lg mb-3">Margin of Safety</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Current Monthly Volume:</span>
                            <span className="font-medium">{(modelData.capacity * (capacityUsage / 100)).toFixed(0)} tons</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Break-even Volume:</span>
                            <span className="font-medium">{breakEvenVolume !== null ? (breakEvenVolume as number).toFixed(0) : 'N/A'} tons</span>
                          </div>
                          <div className="flex justify-between font-bold">
                            <span>Safety Margin (Volume):</span>
                            <span>{breakEvenVolume !== null ? ((modelData.capacity * (capacityUsage / 100)) - (breakEvenVolume as number)).toFixed(0) : 'N/A'} tons</span>
                          </div>
                          <div className="flex justify-between font-bold">
                            <span>Safety Margin (%):</span>
                            <span>{breakEvenVolume !== null ? (100 * ((modelData.capacity * (capacityUsage / 100)) - (breakEvenVolume as number)) / (modelData.capacity * (capacityUsage / 100))).toFixed(1) : 'N/A'}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mb-6">
                      <h3 className="font-medium text-lg mb-3">Break-even Sensitivity Analysis</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        This table shows how changes in capacity utilization affect profitability, using the effective variable cost at each volume.
                      </p>
                      <div className="overflow-x-auto">
                        <table className="min-w-full bg-white border">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="py-2 px-4 border-b text-left">Capacity %</th>
                              <th className="py-2 px-4 border-b text-right">Monthly Volume</th>
                              <th className="py-2 px-4 border-b text-right">Monthly Revenue</th>
                              <th className="py-2 px-4 border-b text-right">Variable Costs</th>
                              <th className="py-2 px-4 border-b text-right">Contribution</th>
                              <th className="py-2 px-4 border-b text-right">Fixed Costs</th>
                              <th className="py-2 px-4 border-b text-right">Profit/Loss</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[40, 50, 60, 70, 80, 90, 100].map(cap => {
                              const volume = modelData.capacity * (cap / 100);
                              const effectiveVC = (() => {
                                // Use the same calculateTotalVariableCost as above
                                return variableCosts.reduce((sum, cost) => {
                                  const effectiveUnitCost = calculateEffectiveVariableCost(cost, volume);
                                  if (cost.all) {
                                    return sum + effectiveUnitCost;
                                  } else {
                                    const matchingTier = priceTiers.find(tier => tier.name === cost.tier);
                                    if (matchingTier) {
                                      return sum + (effectiveUnitCost * (matchingTier.percentage / 100));
                                    }
                                  }
                                  return sum;
                                }, 0);
                              })();
                              const revenue = volume * priceTiers.reduce((sum, tier) => sum + (tier.price * (tier.percentage / 100)), 0);
                              const variableCostsTotal = volume * effectiveVC;
                              const contribution = revenue - variableCostsTotal;
                              const profit = contribution - fixedCosts.reduce((sum, item) => {
                                if (item.monthly) return sum + item.cost;
                                if (item.annual) return sum + (item.cost / 12);
                                return sum;
                              }, 0);
                              return (
                                <tr key={cap} className={breakEvenVolume !== null && Math.abs(volume - (breakEvenVolume as number)) < step ? 'bg-blue-50' : (profit >= 0 ? 'bg-green-50' : 'bg-red-50')}>
                                  <td className="py-2 px-4 border-b">{cap}%</td>
                                  <td className="py-2 px-4 border-b text-right">{volume.toFixed(0)}</td>
                                  <td className="py-2 px-4 border-b text-right">{revenue.toLocaleString()}</td>
                                  <td className="py-2 px-4 border-b text-right">{variableCostsTotal.toLocaleString()}</td>
                                  <td className="py-2 px-4 border-b text-right">{contribution.toLocaleString()}</td>
                                  <td className="py-2 px-4 border-b text-right">{fixedCosts.reduce((sum, item) => {if (item.monthly) return sum + item.cost;if (item.annual) return sum + (item.cost / 12);return sum;}, 0).toLocaleString()}</td>
                                  <td className={`py-2 px-4 border-b text-right font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{profit.toLocaleString()}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-medium text-lg mb-3">Notes</h3>
                      <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600">
                        <li>Break-even point is where total revenue equals total costs (fixed + variable).</li>
                        <li>The break-even calculation uses weighted average prices and costs based on your product mix.</li>
                        <li>To lower your break-even point, you can either reduce fixed costs, reduce variable costs, increase prices, or improve your product mix toward higher-margin products.</li>
                        <li>The margin of safety indicates how much sales can drop before reaching the break-even point.</li>
                      </ul>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {activeTab === 'breakevenWithDebt' && (
            <div className="bg-white p-4 rounded shadow">
              <h2 className="font-bold text-lg mb-4">Break-even Analysis with Debt Service</h2>
              <p className="mb-6">
                This analysis includes loan payments in the break-even calculation, showing the volume needed to cover both operating costs and debt service.
              </p>

              {/* Dynamic break-even with debt calculation (first positive profit after debt) */}
              {(() => {
                const weightedPrice = priceTiers.reduce((sum, tier) => sum + (tier.price * (tier.percentage / 100)), 0);
                const monthlyFixedCost = fixedCosts.reduce((sum, item) => {
                  if (item.monthly) return sum + item.cost;
                  if (item.annual) return sum + (item.cost / 12);
                  return sum;
                }, 0);
                const monthlyLoanPayment = loans.reduce((sum, loan) => sum + calculateMonthlyPayment(loan.amount, loan.interestRate, loan.term), 0);
                const totalMonthlyFixedCost = monthlyFixedCost + monthlyLoanPayment;
                const calculateTotalVariableCost = (volume: number) => {
                  return variableCosts.reduce((sum, cost) => {
                    const effectiveUnitCost = calculateEffectiveVariableCost(cost, volume);
                    if (cost.all) {
                      return sum + effectiveUnitCost;
                    } else {
                      const matchingTier = priceTiers.find(tier => tier.name === cost.tier);
                      if (matchingTier) {
                        return sum + (effectiveUnitCost * (matchingTier.percentage / 100));
                      }
                    }
                    return sum;
                  }, 0);
                };
                let breakEvenVolume = null;
                let breakEvenProfit = null;
                let breakEvenCapacity = null;
                let effectiveVariableCostAtBE = null;
                let contributionMarginAtBE = null;
                let step = Math.max(1, Math.floor(modelData.capacity / 200));
                for (let v = 0; v <= modelData.capacity; v += step) {
                  const effectiveVC = calculateTotalVariableCost(v);
                  const revenue = v * weightedPrice;
                  const variableCosts = v * effectiveVC;
                  const contribution = revenue - variableCosts;
                  const profit = contribution - totalMonthlyFixedCost;
                  if (profit > 0) {
                    breakEvenVolume = v;
                    breakEvenProfit = profit;
                    breakEvenCapacity = (v / modelData.capacity) * 100;
                    effectiveVariableCostAtBE = effectiveVC;
                    contributionMarginAtBE = weightedPrice - effectiveVC;
                    break;
                  }
                }
                let breakEvenYear = 0;
                if (breakEvenVolume !== null) {
                  for (let year = 0; year < yearConfig.duration; year++) {
                    const yearsSinceStart = year;
                    const baseUsage = capacityUsage;
                    const growth = capacityGrowth;
                    const projectedUsage = baseUsage * Math.pow(1 + growth / 100, yearsSinceStart);
                    const cappedUsage = Math.min(projectedUsage, 100);
                    const monthlyVolume = modelData.capacity * (cappedUsage / 100);
                    if (monthlyVolume >= breakEvenVolume) {
                      const prevYearVolume = year > 0 ? modelData.capacity * (Math.min(baseUsage * Math.pow(1 + growth / 100, yearsSinceStart - 1), 100) / 100) : 0;
                      const fraction = (breakEvenVolume - prevYearVolume) / (monthlyVolume - prevYearVolume);
                      breakEvenYear = year + fraction;
                      break;
                    }
                  }
                }
                return (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div className="border rounded p-4">
                        <h3 className="font-medium text-lg mb-3">Break-even Summary with Debt</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Monthly Fixed Costs:</span>
                            <span className="font-medium">{formatNumber(monthlyFixedCost)} THB</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Monthly Loan Payments:</span>
                            <span className="font-medium">{formatNumber(monthlyLoanPayment)} THB</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Monthly Fixed Costs:</span>
                            <span className="font-medium">{formatNumber(totalMonthlyFixedCost)} THB</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Variable Cost per Ton (at BE):</span>
                            <span className="font-medium">{breakEvenVolume !== null ? formatNumber(effectiveVariableCostAtBE ?? 0) : 'N/A'} THB</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Average Price per Ton:</span>
                            <span className="font-medium">{formatNumber(weightedPrice)} THB</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Contribution Margin per Ton (at BE):</span>
                            <span className="font-medium">{breakEvenVolume !== null ? formatNumber(contributionMarginAtBE ?? 0) : 'N/A'} THB</span>
                          </div>
                          <div className="border-t pt-2 flex justify-between font-bold">
                            <span>Break-even Volume with Debt:</span>
                            <span>{breakEvenVolume !== null ? (breakEvenVolume as number).toFixed(1) + ' tons/month' : 'Not Achieved'}</span>
                          </div>
                          <div className="flex justify-between font-bold">
                            <span>Break-even Capacity with Debt:</span>
                            <span>{breakEvenVolume !== null && breakEvenCapacity !== null ? breakEvenCapacity.toFixed(1) + '%' : 'Not Achieved'}</span>
                          </div>
                          <div className="flex justify-between font-bold">
                            <span>Break-even Year with Debt:</span>
                            <span>{breakEvenVolume !== null && breakEvenYear > 0 ? `${(yearConfig.startYear + breakEvenYear).toFixed(1)}` : 'Not Achieved'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="border rounded p-4">
                        <h3 className="font-medium text-lg mb-3">Margin of Safety with Debt</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Current Monthly Volume:</span>
                            <span className="font-medium">{(modelData.capacity * (capacityUsage / 100)).toFixed(0)} tons</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Break-even Volume with Debt:</span>
                            <span className="font-medium">{breakEvenVolume !== null ? (breakEvenVolume as number).toFixed(0) : 'N/A'} tons</span>
                          </div>
                          <div className="flex justify-between font-bold">
                            <span>Safety Margin (Volume):</span>
                            <span>{breakEvenVolume !== null ? ((modelData.capacity * (capacityUsage / 100)) - (breakEvenVolume as number)).toFixed(0) : 'N/A'} tons</span>
                          </div>
                          <div className="flex justify-between font-bold">
                            <span>Safety Margin (%):</span>
                            <span>{breakEvenVolume !== null ? (100 * ((modelData.capacity * (capacityUsage / 100)) - (breakEvenVolume as number)) / (modelData.capacity * (capacityUsage / 100))).toFixed(1) : 'N/A'}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mb-6">
                      <h3 className="font-medium text-lg mb-3">Break-even Sensitivity Analysis with Debt</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        This table shows how changes in capacity utilization affect profitability, using the effective variable cost at each volume.
                      </p>
                      <div className="overflow-x-auto">
                        <table className="min-w-full bg-white border">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="py-2 px-4 border-b text-left">Capacity %</th>
                              <th className="py-2 px-4 border-b text-right">Monthly Volume</th>
                              <th className="py-2 px-4 border-b text-right">Monthly Revenue</th>
                              <th className="py-2 px-4 border-b text-right">Variable Costs</th>
                              <th className="py-2 px-4 border-b text-right">Contribution</th>
                              <th className="py-2 px-4 border-b text-right">Fixed Costs + Loan Payments</th>
                              <th className="py-2 px-4 border-b text-right">Profit/Loss</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[40, 50, 60, 70, 80, 90, 100].map(cap => {
                              const volume = modelData.capacity * (cap / 100);
                              const effectiveVC = (() => {
                                return variableCosts.reduce((sum, cost) => {
                                  const effectiveUnitCost = calculateEffectiveVariableCost(cost, volume);
                                  if (cost.all) {
                                    return sum + effectiveUnitCost;
                                  } else {
                                    const matchingTier = priceTiers.find(tier => tier.name === cost.tier);
                                    if (matchingTier) {
                                      return sum + (effectiveUnitCost * (matchingTier.percentage / 100));
                                    }
                                  }
                                  return sum;
                                }, 0);
                              })();
                              const revenue = volume * priceTiers.reduce((sum, tier) => sum + (tier.price * (tier.percentage / 100)), 0);
                              const variableCostsTotal = volume * effectiveVC;
                              const contribution = revenue - variableCostsTotal;
                              const totalFixedCosts = fixedCosts.reduce((sum, item) => {
                                if (item.monthly) return sum + item.cost;
                                if (item.annual) return sum + (item.cost / 12);
                                return sum;
                              }, 0) + loans.reduce((sum, loan) => sum + calculateMonthlyPayment(loan.amount, loan.interestRate, loan.term), 0);
                              const profit = contribution - totalFixedCosts;
                              return (
                                <tr key={cap} className={breakEvenVolume !== null && Math.abs(volume - (breakEvenVolume as number)) < step ? 'bg-blue-50' : (profit >= 0 ? 'bg-green-50' : 'bg-red-50')}>
                                  <td className="py-2 px-4 border-b">{cap}%</td>
                                  <td className="py-2 px-4 border-b text-right">{volume.toFixed(0)}</td>
                                  <td className="py-2 px-4 border-b text-right">{revenue.toLocaleString()}</td>
                                  <td className="py-2 px-4 border-b text-right">{variableCostsTotal.toLocaleString()}</td>
                                  <td className="py-2 px-4 border-b text-right">{contribution.toLocaleString()}</td>
                                  <td className="py-2 px-4 border-b text-right">{totalFixedCosts.toLocaleString()}</td>
                                  <td className={`py-2 px-4 border-b text-right font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{profit.toLocaleString()}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-medium text-lg mb-3">Notes</h3>
                      <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600">
                        <li>Break-even point with debt is where total revenue equals total costs (fixed + variable + loan payments).</li>
                        <li>The break-even calculation uses weighted average prices and costs based on your product mix.</li>
                        <li>Including loan payments in the break-even calculation typically results in a higher break-even point than the regular break-even analysis.</li>
                        <li>The margin of safety indicates how much sales can drop before reaching the break-even point with debt service.</li>
                        <li>To lower your break-even point with debt, you can either reduce fixed costs, reduce variable costs, increase prices, improve your product mix, or restructure your loans.</li>
                      </ul>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {activeTab === 'statistics' && (
            <div className="p-4">
              <h2 className="text-xl font-bold mb-6">Financial Metrics Calculation Methods</h2>
              
              <div className="space-y-6">
                {/* NPV Section */}
                <div className="card">
                  <h3 className="text-lg font-bold mb-4">Net Present Value (NPV)</h3>
                  <div className="space-y-4">
                    <p className="text-gray-600">
                      NPV is calculated by discounting all future cash flows to present value using a 10% discount rate:
                    </p>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <pre className="text-sm">
                        NPV = -Initial Investment + Σ(Cash Flow_t / (1 + r)^t)
                        where:
                        - t = year number (0 to {yearConfig.duration - 1})
                        - r = discount rate (10%)
                        - Cash Flow_t = Operating Profit + Depreciation
                      </pre>
                    </div>
                    <p className="text-gray-600">
                      Current NPV: {formatNumber(metrics.npv)} M THB
                    </p>
                  </div>
                </div>

                {/* IRR Section */}
                <div className="card">
                  <h3 className="text-lg font-bold mb-4">Internal Rate of Return (IRR)</h3>
                  <div className="space-y-4">
                    <p className="text-gray-600">
                      IRR is the discount rate that makes NPV equal to zero, calculated using binary search method:
                    </p>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <pre className="text-sm">
                        0 = -Initial Investment + Σ(Cash Flow_t / (1 + IRR)^t)
                        where:
                        - t = year number (0 to {irrTimeframe - 1})
                        - Cash flows include initial investment and operating cash flows
                      </pre>
                    </div>
                    <p className="text-gray-600">
                      Current IRR ({irrTimeframe}-year): {metrics.irr ? `${formatNumber(metrics.irr)}%` : 'Not Calculable'}
                    </p>
                  </div>
                </div>

                {/* Payback Period Section */}
                <div className="card">
                  <h3 className="text-lg font-bold mb-4">Payback Period</h3>
                  <div className="space-y-4">
                    <p className="text-gray-600">
                      Time required to recover the initial investment through cumulative cash flows:
                    </p>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <pre className="text-sm">
                        Payback Period = Year + (Remaining Investment / Cash Flow in Following Year)
                        where:
                        - Year = Last year with negative cumulative cash flow
                        - Remaining Investment = Absolute value of cumulative cash flow at that year
                        - Following Year Cash Flow = Cash flow in the next year
                      </pre>
                    </div>
                    <p className="text-gray-600">
                      Current Payback Period: {metrics.paybackPeriod ? `${formatNumber(metrics.paybackPeriod)} years` : 'No Payback'}
                    </p>
                  </div>
                </div>

                {/* Break-even Analysis Section */}
                <div className="card">
                  <h3 className="text-lg font-bold mb-4">Break-even Analysis</h3>
                  <div className="space-y-4">
                    <p className="text-gray-600">
                      Calculation of volume and capacity required to cover fixed costs:
                    </p>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <pre className="text-sm">
                        Break-even Volume = Monthly Fixed Costs / Contribution Margin per Unit
                        where:
                        - Monthly Fixed Costs = {formatNumber(metrics.monthlyFixedCost)} THB
                        - Contribution Margin = Price - Variable Cost = {formatNumber(metrics.contributionMargin)} THB/ton
                        
                        Break-even Capacity = (Break-even Volume / Monthly Capacity) × 100
                        where:
                        - Monthly Capacity = {formatNumber(modelData.capacity)} tons
                      </pre>
                    </div>
                    <p className="text-gray-600">
                      Current Break-even Volume: {formatNumber(metrics.breakEvenVolume)} tons/month
                      <br />
                      Current Break-even Capacity: {formatNumber(metrics.breakEvenCapacity)}%
                    </p>
                  </div>
                </div>

                {/* Operating Metrics Section */}
                <div className="card">
                  <h3 className="text-lg font-bold mb-4">Operating Metrics</h3>
                  <div className="space-y-4">
                    <p className="text-gray-600">
                      Key operating metrics calculations:
                    </p>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <pre className="text-sm">
                        Revenue = Monthly Volume × 12 × Weighted Price × (1 + Price Growth)^Year
                        
                        Operating Profit = Revenue - Variable Costs - Fixed Costs
                        
                        Net Cash Flow = Operating Profit + Depreciation - Initial Investment (Year 1 only)
                        
                        Weighted Price = Σ(Product Price × Sales Mix %)
                        Current: {formatNumber(metrics.weightedPrice)} THB/ton
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmpowerModel;