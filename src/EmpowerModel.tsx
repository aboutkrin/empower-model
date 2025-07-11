import { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ModelConfig } from './types';
import { defaultParameters } from './config/defaultParameters';
import { Parameters, FixedCost, VariableCost, Loan } from './types/parameters';
import ModelParametersModal from './ModelParametersModal';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import autoTable from 'jspdf-autotable';

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
  loans: Loan[];
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

// Add this constant at the top of the file, after the imports
const AVAILABLE_PRODUCT_TIERS = [
  'Em-Unic',
  'Em-One',
  'Em-Pro',
  'Em-Star'
];

// Add these interfaces near the top of the file with other interfaces
interface ProductCostBreakdown {
  productName: string;
  price: number;
  volume: number;
  variableCosts: Array<{
    name: string;
    unitCost: number;
    totalCost: number;
    percentageOfPrice: number;
  }>;
  allocatedFixedCosts: Array<{
    name: string;
    allocatedCost: number;
    percentageOfPrice: number;
  }>;
  totalCost: number;
  margin: number;
  marginPercentage: number;
}

// Add TypeScript interfaces for better type safety
type TabType = 'dashboard' | 'financials' | 'cashflow' | 'breakeven' | 'breakevenWithDebt' | 'productCostAnalysis' | 'costing' | 'loans' | 'statistics' | 'financialModel';

const EmpowerModel = () => {
  // Model state
  const [modelData, setModelData] = useState<Parameters['modelData']>(defaultParameters.modelData);
  const [yearConfig, setYearConfig] = useState<Parameters['yearConfig']>(defaultParameters.yearConfig);
  const [capacityUsage, setCapacityUsage] = useState<Parameters['capacityUsage']>(defaultParameters.capacityUsage);
  const [capacityGrowth, setCapacityGrowth] = useState<Parameters['capacityGrowth']>(defaultParameters.capacityGrowth);
  const [priceTiers, setPriceTiers] = useState<Parameters['priceTiers']>(defaultParameters.priceTiers);
  const [priceGrowth, setPriceGrowth] = useState<Parameters['priceGrowth']>(defaultParameters.priceGrowth);
  const [fixedCosts, setFixedCosts] = useState<Parameters['fixedCosts']>(defaultParameters.fixedCosts);
  const [variableCosts, setVariableCosts] = useState<Parameters['variableCosts']>(defaultParameters.variableCosts);
  const [loans, setLoans] = useState<Parameters['loans']>(defaultParameters.loans);
  const [irrTimeframe, setIrrTimeframe] = useState(defaultParameters.yearConfig.duration);
  const [durationInput, setDurationInput] = useState(yearConfig.duration.toString());

  // UI state
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [activeSubTab, setActiveSubTab] = useState('costs');
  const [activeProductTier, setActiveProductTier] = useState<'all' | string>('all');
  const [loading, setLoading] = useState(true);
  const [modelVersion, setModelVersion] = useState(0);

  // Financial state
  const [financialData, setFinancialData] = useState<FinancialData[]>([]);
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
  
  // Scenario state
  const [scenario, setScenario] = useState<'base' | 'optimistic' | 'pessimistic'>('base');
  const [originalParams, setOriginalParams] = useState<any>(null);
  const [whatIf, setWhatIf] = useState({ price: 0, variable: 0, fixed: 0 });
  const [scenarioBaseValues, setScenarioBaseValues] = useState<{
    priceTiers: typeof priceTiers,
    variableCosts: typeof variableCosts,
    fixedCosts: typeof fixedCosts
  } | null>(null);

  // Add state for simulated volume in Product Cost Analysis
  const [simulatedVolume, setSimulatedVolume] = useState<{ [tier: string]: number | null }>({});
  
  // Add this with the other state declarations
  const [yieldLoss, setYieldLoss] = useState<number>(defaultParameters.yieldLoss);
  
  // Add state for financial model utilization rate
  const [financialModelUtilization, setFinancialModelUtilization] = useState<number>(capacityUsage);
  
  // Add this function to update years when configuration changes
  const updateYearRange = (startYear: number, duration: number) => {
    setYearConfig({ startYear, duration });
    // Generate array of years from start year to start year + duration
    const years = Array.from({ length: duration }, (_, i) => startYear + i);
    setModelData(prev => ({
      ...prev,
      years
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
    loading,
    yieldLoss  // Add yieldLoss to dependencies
  ]);
  
  // Add this useEffect
  useEffect(() => {
    // Ensure IRR timeframe doesn't exceed the projection duration
    if (irrTimeframe > yearConfig.duration) {
      setIrrTimeframe(yearConfig.duration);
    }
  }, [yearConfig.duration]);

  // Add this useEffect to sync durationInput with yearConfig.duration
  useEffect(() => {
    setDurationInput(yearConfig.duration.toString());
  }, [yearConfig.duration]);

  // Add this useEffect to reset to default values
  useEffect(() => {
    // Reset all states using defaultParameters
    setModelData(defaultParameters.modelData);
    setYearConfig(defaultParameters.yearConfig);
    setCapacityUsage(defaultParameters.capacityUsage);
    setCapacityGrowth(defaultParameters.capacityGrowth);
    setPriceTiers(defaultParameters.priceTiers);
    setPriceGrowth(defaultParameters.priceGrowth);
    setFixedCosts(defaultParameters.fixedCosts);
    setVariableCosts(defaultParameters.variableCosts);
    setLoans(defaultParameters.loans);
    setIrrTimeframe(defaultParameters.yearConfig.duration);

    // Show success message
    setSaveStatus({
      show: true,
      message: 'Model reset to default values successfully!',
      type: 'success'
    });
    setTimeout(() => setSaveStatus(prev => ({ ...prev, show: false })), 3000);
  }, [defaultParameters.modelData, defaultParameters.yearConfig, defaultParameters.capacityUsage, defaultParameters.capacityGrowth, defaultParameters.priceTiers, defaultParameters.priceGrowth, defaultParameters.fixedCosts, defaultParameters.variableCosts, defaultParameters.loans, defaultParameters.yearConfig.duration]);
  
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
      // Apply yield loss to the volume first
      const effectiveVolume = volume / (1 - yieldLoss / 100);
      
      return variableCosts.reduce((total, cost) => {
        // Calculate effective cost per unit including yield loss
        const effectiveUnitCost = calculateEffectiveVariableCost(cost, effectiveVolume);
        
        // Calculate total cost for this variable cost item
        let costTotal = 0;
        
        if (cost.all) {
          // If cost applies to all tiers, apply to total volume
          costTotal = effectiveUnitCost * effectiveVolume;
        } else if (cost.tier) {
          // If cost applies to specific tier, find the tier's volume
          const tier = priceTiers.find(t => t.name === cost.tier);
          if (tier) {
            const tierVolume = (volume * tier.percentage) / 100;
            const effectiveTierVolume = tierVolume / (1 - yieldLoss / 100);
            costTotal = effectiveUnitCost * effectiveTierVolume;
          }
        }
        
        return total + costTotal;
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
    return num.toLocaleString();
  };

  // Add this helper function for input number formatting
  const formatInputNumber = (value: string) => {
    // Remove all non-numeric characters except decimal point
    const numericValue = value.replace(/[^\d.]/g, '');
    // Format with commas
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // Add this helper function to parse formatted number back to numeric value
  const parseFormattedNumber = (str: string) => {
    return parseFloat(str.replace(/,/g, '')) || 0;
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

  const calculateMonthlyFixedCost = (costs: typeof fixedCosts) => {
    return costs.reduce((sum, item) => {
      if (item.monthly) return sum + item.cost;
      if (item.annual && item.type === "depreciation") {
        return sum + (item.cost / (item.years || 1) / 12);
      }
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

  // Add this helper function to calculate effective variable cost
  const calculateEffectiveVariableCost = (cost: SavedModel['variableCosts'][0], monthlyVolume: number) => {
    // First apply volume-based reduction if applicable
    let reducedCost = cost.unitCost;
    if (cost.volumeReduction && cost.volumeReduction > 0) {
      const volumeReduction = cost.volumeReduction * (monthlyVolume / 1000);
      reducedCost = cost.unitCost * (1 - volumeReduction / 100);
    }
    
    // Then apply yield loss to the reduced cost
    return reducedCost / (1 - yieldLoss / 100);
  };

  // Scenario handler
  const handleScenarioChange = (newScenario: 'base' | 'optimistic' | 'pessimistic') => {
    if (newScenario === scenario && newScenario !== 'base') return;
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
      setWhatIf({ price: 0, variable: 0, fixed: 0 });
    } else if (newScenario === 'optimistic') {
      setPriceGrowth((originalParams?.priceGrowth ?? priceGrowth) + 2);
      setCapacityGrowth((originalParams?.capacityGrowth ?? capacityGrowth) + 5);
      setVariableCosts((originalParams?.variableCosts ?? variableCosts).map((v: any) => ({ 
        ...v, 
        unitCost: Number((v.unitCost * 0.95).toFixed(2))
      })));
      setFixedCosts((originalParams?.fixedCosts ?? fixedCosts).map((f: any) => ({ 
        ...f, 
        cost: Number((f.cost * 0.97).toFixed(2))
      })));
      setWhatIf({ price: 0, variable: -5, fixed: -3 });
    } else if (newScenario === 'pessimistic') {
      setPriceGrowth((originalParams?.priceGrowth ?? priceGrowth) - 1);
      setCapacityGrowth((originalParams?.capacityGrowth ?? capacityGrowth) - 3);
      setVariableCosts((originalParams?.variableCosts ?? variableCosts).map((v: any) => ({ 
        ...v, 
        unitCost: Number((v.unitCost * 1.07).toFixed(2))
      })));
      setFixedCosts((originalParams?.fixedCosts ?? fixedCosts).map((f: any) => ({ 
        ...f, 
        cost: Number((f.cost * 1.05).toFixed(2))
      })));
      setWhatIf({ price: 0, variable: 7, fixed: 5 });
    }
    setScenario(newScenario);
  };

  // Update scenario base values when scenario changes
  useEffect(() => {
    setScenarioBaseValues({
      priceTiers: JSON.parse(JSON.stringify(priceTiers)),
      variableCosts: JSON.parse(JSON.stringify(variableCosts)),
      fixedCosts: JSON.parse(JSON.stringify(fixedCosts))
    });
  }, [scenario]);

  const applyWhatIf = () => {
    if (!scenarioBaseValues) return;
    
    // Apply changes from scenario base values to prevent compounding
    setPriceTiers(scenarioBaseValues.priceTiers.map(tier => ({ 
      ...tier, 
      price: Number((tier.price * (1 + whatIf.price / 100)).toFixed(2))
    })));
    
    setVariableCosts(scenarioBaseValues.variableCosts.map(v => ({ 
      ...v, 
      unitCost: Number((v.unitCost * (1 + whatIf.variable / 100)).toFixed(2))
    })));
    
    setFixedCosts(scenarioBaseValues.fixedCosts.map(f => ({ 
      ...f, 
      cost: Number((f.cost * (1 + whatIf.fixed / 100)).toFixed(2))
    })));
  };

  const resetWhatIf = () => {
    // Reset to current scenario's base values
    if (scenarioBaseValues) {
      setPriceTiers(JSON.parse(JSON.stringify(scenarioBaseValues.priceTiers)));
      setVariableCosts(JSON.parse(JSON.stringify(scenarioBaseValues.variableCosts)));
      setFixedCosts(JSON.parse(JSON.stringify(scenarioBaseValues.fixedCosts)));
    }
    
    // Reset what-if values based on current scenario
    if (scenario === 'base') {
      setWhatIf({ price: 0, variable: 0, fixed: 0 });
    } else if (scenario === 'optimistic') {
      setWhatIf({ price: 0, variable: -5, fixed: -3 });
    } else if (scenario === 'pessimistic') {
      setWhatIf({ price: 0, variable: 7, fixed: 5 });
    }
  };

  // Add this function to reset to default values
  const resetToDefault = () => {
    // Reset all states using defaultParameters
    setModelData(defaultParameters.modelData);
    setYearConfig(defaultParameters.yearConfig);
    setCapacityUsage(defaultParameters.capacityUsage);
    setCapacityGrowth(defaultParameters.capacityGrowth);
    setPriceTiers(defaultParameters.priceTiers);
    setPriceGrowth(defaultParameters.priceGrowth);
    setFixedCosts(defaultParameters.fixedCosts);
    setVariableCosts(defaultParameters.variableCosts);
    setLoans(defaultParameters.loans);
    setIrrTimeframe(defaultParameters.yearConfig.duration);

    // Show success message
    setSaveStatus({
      show: true,
      message: 'Model reset to default values successfully!',
      type: 'success'
    });
    setTimeout(() => setSaveStatus(prev => ({ ...prev, show: false })), 3000);
  };

  const [isParamsModalOpen, setParamsModalOpen] = useState(false);

  if (loading) {
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading model data...</div>;
  }

  // Helper function to export a DOM node as PDF
  const exportTabToPDF = async (tabName: string) => {
    const content = document.getElementById('main-content-area');
    if (!content) return;
    const canvas = await html2canvas(content, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    // Fit image to page
    const imgWidth = pageWidth - 40;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.text(`${tabName} - EM-FinCast`, 30, 30);
    pdf.addImage(imgData, 'PNG', 20, 40, imgWidth, imgHeight);
    pdf.save(`EM-FinCast-${tabName.replace(/\s+/g, '-')}.pdf`);
  };

  // Helper function to generate a professional PDF report
  const generateReportPDF = async () => {
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    let y = 40;

    // 1. Cover Page
    pdf.setFontSize(28);
    pdf.text('EM-FinCast Financial Model Report', pageWidth / 2, y, { align: 'center' });
    pdf.setFontSize(16);
    y += 40;
    pdf.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth / 2, y, { align: 'center' });
    y += 30;
    pdf.setFontSize(12);
    pdf.text('This report summarizes the key results, projections, and cost analysis for your financial model.', pageWidth / 2, y, { align: 'center' });
    pdf.addPage();
    y = 40;

    // 2. Key Metrics
    pdf.setFontSize(18);
    pdf.text('Key Metrics', 40, y);
    y += 20;
    pdf.setFontSize(12);
    autoTable(pdf, {
      startY: y,
      head: [['NPV (M THB)', 'IRR (%)', 'Payback Period (Years)', 'Break-even Year', 'Weighted Price (THB/ton)', 'Contribution Margin (THB/ton)']],
      body: [[
        metrics.npv.toLocaleString(),
        metrics.irr ? metrics.irr.toFixed(2) : 'N/A',
        metrics.paybackPeriod && isFinite(metrics.paybackPeriod) ? metrics.paybackPeriod.toFixed(2) : 'No Payback',
        metrics.breakEvenYear ? Math.ceil(yearConfig.startYear + metrics.breakEvenYear) : 'N/A',
        metrics.weightedPrice.toLocaleString(),
        metrics.contributionMargin.toLocaleString()
      ]],
      theme: 'grid',
      styles: { fontSize: 11 },
      margin: { left: 40, right: 40 }
    });
    y = (pdf as any).lastAutoTable ? (pdf as any).lastAutoTable.finalY + 30 : y + 30;

    // 3. Financial Projections Table
    pdf.setFontSize(16);
    pdf.text('Financial Projections', 40, y);
    y += 10;
    autoTable(pdf, {
      startY: y,
      head: [['Year', 'Revenue (M THB)', 'Operating Profit (M THB)', 'Net Cash Flow (M THB)']],
      body: financialData.map(row => [
        row.year,
        row.revenue.toLocaleString(),
        row.operatingProfit.toLocaleString(),
        row.netCashFlow.toLocaleString()
      ]),
      theme: 'striped',
      styles: { fontSize: 10 },
      margin: { left: 40, right: 40 }
    });
    y = (pdf as any).lastAutoTable ? (pdf as any).lastAutoTable.finalY + 30 : y + 30;

    // 4. Product Cost Analysis (all products)
    pdf.setFontSize(16);
    pdf.text('Product Cost Analysis', 40, y);
    y += 10;
    priceTiers.forEach((tier, idx) => {
      const monthlyVolume = modelData.capacity * (capacityUsage / 100) * (tier.percentage / 100);
      const productVariableCosts = variableCosts
        .filter(cost => cost.tier === tier.name || cost.all)
        .map(cost => {
          const unitCost = calculateEffectiveVariableCost(cost, monthlyVolume);
          return {
            name: cost.name,
            unitCost,
            totalCost: unitCost * monthlyVolume,
            percentageOfPrice: (unitCost / tier.price) * 100
          };
        });
      const totalFixedCosts = fixedCosts.reduce((sum, cost) => {
        if (cost.monthly) return sum + cost.cost;
        if (cost.annual) return sum + (cost.cost / 12);
        return sum;
      }, 0);
      const allocatedFixedCost = (totalFixedCosts * (tier.percentage / 100)) / monthlyVolume;
      const totalVariableCost = productVariableCosts.reduce((sum, cost) => sum + cost.unitCost, 0);
      const contributionMargin = tier.price - totalVariableCost;
      const totalCost = totalVariableCost + allocatedFixedCost;
      const margin = tier.price - totalCost;
      const marginPercentage = (margin / tier.price) * 100;
      y = (pdf as any).lastAutoTable ? (pdf as any).lastAutoTable.finalY + 20 : y + 20;
      pdf.setFontSize(13);
      pdf.text(`${tier.name} (Monthly Volume: ${monthlyVolume.toLocaleString()} tons)`, 50, y);
      y += 10;
      autoTable(pdf, {
        startY: y,
        head: [['Price', 'Variable Cost', 'Allocated Fixed Cost', 'Total Cost', 'Margin', 'Margin %']],
        body: [[
          tier.price.toLocaleString(),
          totalVariableCost.toLocaleString(),
          allocatedFixedCost.toLocaleString(),
          totalCost.toLocaleString(),
          margin.toLocaleString(),
          marginPercentage.toFixed(1) + '%'
        ]],
        theme: 'plain',
        styles: { fontSize: 10 },
        margin: { left: 50, right: 40 }
      });
      y = (pdf as any).lastAutoTable ? (pdf as any).lastAutoTable.finalY + 5 : y + 5;
      autoTable(pdf, {
        startY: y,
        head: [['Cost Component', 'Unit Cost', 'Total Cost', '% of Price']],
        body: productVariableCosts.map(cost => [
          cost.name,
          cost.unitCost.toLocaleString(),
          cost.totalCost.toLocaleString(),
          cost.percentageOfPrice.toFixed(1) + '%'
        ]),
        theme: 'striped',
        styles: { fontSize: 9 },
        margin: { left: 60, right: 40 }
      });
      y = (pdf as any).lastAutoTable ? (pdf as any).lastAutoTable.finalY + 10 : y + 10;
    });

    // 5. (Optional) Add a chart image (e.g., Financial Projections)
    // Try to find a chart by id and add as image
    const chartNode = document.querySelector('.recharts-wrapper');
    if (chartNode) {
      const chartCanvas = await html2canvas(chartNode as HTMLElement, { scale: 2 });
      const imgData = chartCanvas.toDataURL('image/png');
      pdf.addPage();
      pdf.setFontSize(16);
      pdf.text('Key Chart Example', 40, 40);
      pdf.addImage(imgData, 'PNG', 40, 60, 700, 300);
    }

    // 6. Appendix: Model Parameters
    pdf.addPage();
    y = 40;
    pdf.setFontSize(16);
    pdf.text('Appendix: Model Parameters', 40, y);
    y += 10;
    autoTable(pdf, {
      startY: y,
      head: [['Parameter', 'Value']],
      body: [
        ['Capacity (tons/month)', modelData.capacity.toLocaleString()],
        ['Capacity Usage (%)', capacityUsage],
        ['Capacity Growth (%)', capacityGrowth],
        ['Price Growth (%)', priceGrowth],
        ['Projection Duration (years)', yearConfig.duration],
        ['Start Year', yearConfig.startYear],
        ['IRR Timeframe (years)', irrTimeframe],
      ],
      theme: 'plain',
      styles: { fontSize: 10 },
      margin: { left: 40, right: 40 }
    });

    pdf.save(`EM-FinCast-Report.pdf`);
  };

  const calculateYieldLossImpact = (baseVolume: number, baseCost: number) => {
    const scenarios = [
      { yieldLoss: 0, label: 'No Yield Loss' },
      { yieldLoss: yieldLoss, label: 'Current Yield Loss' },
      { yieldLoss: yieldLoss * 2, label: 'Double Current Loss' }
    ];

    return scenarios.map(scenario => {
      const effectiveVolume = baseVolume / (1 - scenario.yieldLoss / 100);
      const effectiveCost = baseCost / (1 - scenario.yieldLoss / 100);
      const totalCost = effectiveVolume * effectiveCost;
      const costIncrease = ((effectiveCost - baseCost) / baseCost) * 100;

      return {
        scenario: scenario.label,
        baseVolume,
        effectiveVolume: Math.round(effectiveVolume * 100) / 100,
        baseCost,
        effectiveCost: Math.round(effectiveCost * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        costIncrease: Math.round(costIncrease * 100) / 100
      };
    });
  };

  // Add this to your component's JSX where you want to display the impact
  const YieldLossImpactCard = () => {
    const baseVolume = modelData.capacity * (capacityUsage / 100); // Use actual monthly volume
    const baseCost = variableCosts.reduce((sum, cost) => {
      if (cost.all) return sum + cost.unitCost;
      return sum;
    }, 0) / variableCosts.length; // Average unit cost

    const impact = calculateYieldLossImpact(baseVolume, baseCost);

    return (
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Yield Loss Impact Analysis</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left">Scenario</th>
                <th className="px-4 py-2 text-right">Base Volume (tons)</th>
                <th className="px-4 py-2 text-right">Effective Volume (tons)</th>
                <th className="px-4 py-2 text-right">Base Cost (THB/ton)</th>
                <th className="px-4 py-2 text-right">Effective Cost (THB/ton)</th>
                <th className="px-4 py-2 text-right">Total Cost (THB)</th>
                <th className="px-4 py-2 text-right">Cost Increase (%)</th>
              </tr>
            </thead>
            <tbody>
              {impact.map((row, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-2">{row.scenario}</td>
                  <td className="px-4 py-2 text-right">{formatNumber(row.baseVolume)}</td>
                  <td className="px-4 py-2 text-right">{formatNumber(row.effectiveVolume)}</td>
                  <td className="px-4 py-2 text-right">{formatNumber(row.baseCost)}</td>
                  <td className="px-4 py-2 text-right">{formatNumber(row.effectiveCost)}</td>
                  <td className="px-4 py-2 text-right">{formatNumber(row.totalCost)}</td>
                  <td className="px-4 py-2 text-right">{row.costIncrease}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          <p>* Effective Volume represents the amount of material needed to achieve the base volume after yield loss</p>
          <p>* Cost Increase shows how much more expensive each unit becomes due to yield loss</p>
          <p>* Current yield loss is set to {yieldLoss}%</p>
        </div>
      </div>
    );
  };

  // Financial Model calculations for GP, EBITDA, and Net Profit (single year only)
  const calculateFinancialModelProjections = (utilizationRate: number) => {
    const weightedPrice = priceTiers.reduce((sum, tier) => 
      sum + (tier.price * (tier.percentage / 100)), 0);

    // Calculate for current year only (no future projections)
    const year = yearConfig.startYear;
    
    // Calculate volumes based on the financial model utilization rate
    const monthlyVolume = modelData.capacity * (utilizationRate / 100);
    const annualVolume = monthlyVolume * 12;
    
    // Calculate revenue (no price growth for single year)
    const yearlyPrice = weightedPrice;
    const revenue = (annualVolume * yearlyPrice) / 1000000;
    
    // Calculate variable costs with yield loss (same method as break-even analysis)
    const effectiveVolume = monthlyVolume / (1 - yieldLoss / 100);
    const cogs = variableCosts.reduce((sum, cost) => {
      const effectiveUnitCost = calculateEffectiveVariableCost(cost, effectiveVolume);
      if (cost.all) {
        return sum + (effectiveVolume * effectiveUnitCost * 12);
      } else {
        const matchingTier = priceTiers.find(tier => tier.name === cost.tier);
        if (matchingTier) {
          const tierVolume = (monthlyVolume * (matchingTier.percentage / 100));
          const effectiveTierVolume = tierVolume / (1 - yieldLoss / 100);
          return sum + (effectiveTierVolume * effectiveUnitCost * 12);
        }
      }
      return sum;
    }, 0) / 1000000;
    
    // Gross Profit = Revenue - COGS
    const grossProfit = revenue - cogs;
    const grossProfitMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
    
    // Calculate ALL fixed costs (same method as break-even analysis)
    const monthlyFixedCosts = fixedCosts.reduce((sum, item) => {
      if (item.monthly) return sum + item.cost;
      if (item.annual) return sum + (item.cost / 12);
      return sum;
    }, 0);
    const operatingExpenses = (monthlyFixedCosts * 12) / 1000000;
    
    // For consistency with break-even analysis, treat all fixed costs as operating expenses
    // EBITDA = Gross Profit - Operating Expenses (which includes all fixed costs)
    const ebitda = grossProfit - operatingExpenses;
    const ebitdaMargin = revenue > 0 ? (ebitda / revenue) * 100 : 0;
    
    // EBIT = EBITDA (since operating expenses already include all fixed costs including depreciation)
    const ebit = ebitda;
    const ebitMargin = revenue > 0 ? (ebit / revenue) * 100 : 0;
    
    // Set depreciation to 0 since it's already included in operating expenses
    const depreciation = 0;
    
    // Calculate interest expense from loans
    const amortizationSchedule = generateAmortizationSchedule(loans);
    const yearSchedule = amortizationSchedule.find(s => s.year === year);
    const interestExpense = yearSchedule ? yearSchedule.interest / 1000000 : 0;
    
    // Net Profit = EBIT - Interest Expense
    const netProfit = ebit - interestExpense;
    const netProfitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

    // Return single year as array for consistency with existing code
    return [{
      year,
      revenue,
      cogs,
      grossProfit,
      grossProfitMargin,
      operatingExpenses,
      ebitda,
      ebitdaMargin,
      depreciation,
      ebit,
      ebitMargin,
      interestExpense,
      netProfit,
      netProfitMargin,
      monthlyVolume,
      annualVolume
    }];
  };

  const MetricsCard = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Key Metrics</h3>
      <div className="space-y-4">
        <div>
          <div className="text-sm text-gray-500">NPV</div>
          <div className="text-2xl font-bold">{formatNumber(metrics.npv)} M THB</div>
          <div className="text-sm text-gray-500">{`${yearConfig.duration} year projection`}</div>
        </div>
      </div>
    </div>
  );

  const IRRCard = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">IRR</h3>
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
  );

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
            <button
              className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium shadow-sm"
              onClick={() => setParamsModalOpen(true)}
            >
              Model Parameters
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
            <button
              onClick={generateReportPDF}
              className="btn btn-secondary"
            >
              Export PDF
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
          className={`px-4 py-3 ${activeTab === 'productCostAnalysis' ? 'text-blue-700 border-b-2 border-blue-700 font-medium' : 'text-gray-600'}`}
          onClick={() => setActiveTab('productCostAnalysis')}
        >
          Product Cost Analysis
        </button>
        <button
          className={`px-4 py-3 ${activeTab === 'costing' ? 'text-blue-700 border-b-2 border-blue-700 font-medium' : 'text-gray-600'}`}
          onClick={() => {
            setActiveTab('costing');
            setActiveSubTab('costs');
          }}
        >
          Costing
        </button>
        <button
          className={`px-4 py-3 ${activeTab === 'financialModel' ? 'text-blue-700 border-b-2 border-blue-700 font-medium' : 'text-gray-600'}`}
          onClick={() => setActiveTab('financialModel')}
        >
          Financial Model
        </button>
      </div>

      <div className="flex flex-col md:flex-row flex-1" id="main-content-area">
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <MetricsCard />
                <PaybackPeriodCard />
                <IRRCard />
              </div>
              <YieldLossImpactCard />
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
                {/* Explanatory Note under Financial Projections */}
                <div className="mt-4 mb-6 p-3 bg-blue-50 border-l-4 border-blue-400 text-blue-900 rounded">
                  <strong>Note:</strong> All figures on this dashboard include variable costs, fixed costs, loan payments, and other relevant expenses. 
                  The financial metrics and projections reflect the full cost structure of your business.
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
                    // Apply yield loss to the volume first
                    const effectiveVolume = volume / (1 - yieldLoss / 100);
                    
                    return variableCosts.reduce((total, cost) => {
                      // Calculate effective cost per unit including yield loss
                      const effectiveUnitCost = calculateEffectiveVariableCost(cost, effectiveVolume);
                      
                      // Calculate total cost for this variable cost item
                      let costTotal = 0;
                      
                      if (cost.all) {
                        // If cost applies to all tiers, apply to total volume
                        costTotal = effectiveUnitCost * effectiveVolume;
                      } else if (cost.tier) {
                        // If cost applies to specific tier, find the tier's volume
                        const tier = priceTiers.find(t => t.name === cost.tier);
                        if (tier) {
                          const tierVolume = (volume * tier.percentage) / 100;
                          const effectiveTierVolume = tierVolume / (1 - yieldLoss / 100);
                          costTotal = effectiveUnitCost * effectiveTierVolume;
                        }
                      }
                      
                      return total + costTotal;
                    }, 0);
                  };
                  let breakEvenVolume = null;
                  let breakEvenCapacity = null;
                  let effectiveVariableCostAtBE = null;
                  let contributionMarginAtBE = null;
                  let step = Math.max(1, Math.floor(modelData.capacity / 1000));
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
                            <span>{breakEvenVolume !== null && breakEvenYear > 0 ? Math.ceil(yearConfig.startYear + breakEvenYear) : 'Not Achieved'}</span>
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

          {activeTab === 'costing' && (
            <div className="space-y-6">
              {/* Sub-tabs */}
              <div className="border-b">
                <div className="flex space-x-4">
                  <button
                    className={`px-4 py-2 ${activeSubTab === 'costs' ? 'text-blue-700 border-b-2 border-blue-700 font-medium' : 'text-gray-600'}`}
                    onClick={() => setActiveSubTab('costs')}
                  >
                    Costs
                  </button>
                  <button
                    className={`px-4 py-2 ${activeSubTab === 'loans' ? 'text-blue-700 border-b-2 border-blue-700 font-medium' : 'text-gray-600'}`}
                    onClick={() => setActiveSubTab('loans')}
                  >
                    Loan Analysis
                  </button>
                  <button
                    className={`px-4 py-2 ${activeSubTab === 'statistics' ? 'text-blue-700 border-b-2 border-blue-700 font-medium' : 'text-gray-600'}`}
                    onClick={() => setActiveSubTab('statistics')}
                  >
                    Statistics
                  </button>
                </div>
              </div>

              {/* Sub-tab content */}
              {activeSubTab === 'costs' && (
            <div key={modelVersion}>
              <div className="bg-white p-4 rounded shadow mb-6">
                <h2 className="font-bold text-lg mb-4">Fixed Costs</h2>
                    
                    {/* PP&E Section */}
                    <div className="mb-8">
                      <h3 className="font-semibold text-md mb-4 text-gray-700">Property, Plant, and Equipment (PP&E)</h3>
                      <p className="text-sm text-gray-600 mb-4">Depreciation of physical assets and equipment.</p>

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
                            {fixedCosts
                              .filter(item => item.type === "depreciation")
                              .map((item, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                          <td className="py-2 px-4 border-b border-gray-200">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => {
                                const newCosts = [...fixedCosts];
                                        const realIndex = fixedCosts.findIndex(cost => cost === item);
                                        newCosts[realIndex].name = e.target.value;
                                setFixedCosts(newCosts);
                              }}
                                      className="bg-transparent border-none w-full"
                            />
                          </td>
                                  <td className="py-2 px-4 border-b border-gray-200">
                            <input
                              type="text"
                                      value={formatNumber(item.cost)}
                              onChange={(e) => {
                                const newCosts = [...fixedCosts];
                                        const realIndex = fixedCosts.findIndex(cost => cost === item);
                                        newCosts[realIndex].cost = parseFormattedNumber(e.target.value);
                                setFixedCosts(newCosts);
                              }}
                                      className="bg-transparent border-none w-full text-right"
                            />
                          </td>
                                  <td className="py-2 px-4 border-b border-gray-200 text-center">Depreciation</td>
                                  <td className="py-2 px-4 border-b border-gray-200 text-center">Annual</td>
                          <td className="py-2 px-4 border-b border-gray-200 text-center">
                                    <input
                                      type="number"
                                      value={item.years || 0}
                              onChange={(e) => {
                                const newCosts = [...fixedCosts];
                                        const realIndex = fixedCosts.findIndex(cost => cost === item);
                                        newCosts[realIndex].years = parseInt(e.target.value);
                                setFixedCosts(newCosts);
                              }}
                                      className="w-16 text-center border rounded bg-transparent"
                                      min="1"
                                    />
                                  </td>
                                  <td className="py-2 px-4 border-b border-gray-200 text-right">
                                    {((item.cost / (item.years || 1)) / 12).toLocaleString()}
                                  </td>
                                  <td className="py-2 px-4 border-b border-gray-200 text-center">
                                    <button
                                      onClick={() => {
                                        const newCosts = fixedCosts.filter(cost => cost !== item);
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
                              <td className="py-2 px-4 border-t border-gray-300 font-medium">Total PP&E Monthly Cost</td>
                              <td></td>
                              <td></td>
                              <td></td>
                              <td></td>
                              <td className="py-2 px-4 border-t border-gray-300 text-right font-medium">
                                {fixedCosts
                                  .filter(item => item.type === "depreciation")
                                  .reduce((sum, item) => sum + ((item.cost / (item.years || 1)) / 12), 0)
                                  .toLocaleString()} THB
                              </td>
                              <td></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>

                      <div className="mt-4 flex justify-end">
                        <button
                          className="bg-blue-100 hover:bg-blue-200 text-blue-700 py-1 px-3 rounded text-sm"
                          onClick={() => {
                            setFixedCosts([...fixedCosts, {
                              name: "New PP&E Item",
                              cost: 0,
                              annual: true,
                              type: "depreciation",
                              years: 20,
                              startYear: new Date().getFullYear()
                            }]);
                          }}
                        >
                          + Add PP&E Item
                        </button>
                      </div>
                    </div>

                    {/* SG&A Section */}
                    <div className="mb-4">
                      <h3 className="font-semibold text-md mb-4 text-gray-700">Selling, General, and Administrative (SG&A)</h3>
                      <p className="text-sm text-gray-600 mb-4">Regular operational and administrative expenses.</p>

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
                            {fixedCosts
                              .filter(item => item.type === "regular")
                              .map((item, index) => (
                                <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                                  <td className="py-2 px-4 border-b border-gray-200">
                                    <input
                                      type="text"
                                      value={item.name}
                                      onChange={(e) => {
                                        const newCosts = [...fixedCosts];
                                        const realIndex = fixedCosts.findIndex(cost => cost === item);
                                        newCosts[realIndex].name = e.target.value;
                                        setFixedCosts(newCosts);
                                      }}
                                      className="bg-transparent border-none w-full"
                                    />
                                  </td>
                                  <td className="py-2 px-4 border-b border-gray-200">
                                    <input
                                      type="text"
                                      value={formatNumber(item.cost)}
                                      onChange={(e) => {
                                        const newCosts = [...fixedCosts];
                                        const realIndex = fixedCosts.findIndex(cost => cost === item);
                                        newCosts[realIndex].cost = parseFormattedNumber(e.target.value);
                                        setFixedCosts(newCosts);
                                      }}
                                      className="bg-transparent border-none w-full text-right"
                                    />
                                  </td>
                                  <td className="py-2 px-4 border-b border-gray-200 text-center">Regular</td>
                          <td className="py-2 px-4 border-b border-gray-200 text-center">
                            <select
                              value={item.monthly ? "monthly" : "annual"}
                              onChange={(e) => {
                                const newCosts = [...fixedCosts];
                                        const realIndex = fixedCosts.findIndex(cost => cost === item);
                                        newCosts[realIndex].monthly = e.target.value === "monthly";
                                        newCosts[realIndex].annual = e.target.value === "annual";
                                setFixedCosts(newCosts);
                              }}
                              className="bg-transparent border-none"
                            >
                              <option value="monthly">Monthly</option>
                              <option value="annual">Annual</option>
                            </select>
                          </td>
                                  <td className="py-2 px-4 border-b border-gray-200 text-center">-</td>
                          <td className="py-2 px-4 border-b border-gray-200 text-right">
                            {item.monthly ? item.cost.toLocaleString() : (item.cost / 12).toLocaleString()}
                          </td>
                          <td className="py-2 px-4 border-b border-gray-200 text-center">
                            <button
                              onClick={() => {
                                        const newCosts = fixedCosts.filter(cost => cost !== item);
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
                              <td className="py-2 px-4 border-t border-gray-300 font-medium">Total SG&A Monthly Cost</td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td className="py-2 px-4 border-t border-gray-300 text-right font-medium">
                                {fixedCosts
                                  .filter(item => item.type === "regular")
                                  .reduce((sum, item) => sum + (item.monthly ? item.cost : item.cost / 12), 0)
                                  .toLocaleString()} THB
                        </td>
                              <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    className="bg-blue-100 hover:bg-blue-200 text-blue-700 py-1 px-3 rounded text-sm"
                    onClick={() => {
                      setFixedCosts([...fixedCosts, {
                              name: "New SG&A Item",
                        cost: 0,
                        monthly: true,
                        type: "regular"
                      }]);
                    }}
                  >
                          + Add SG&A Item
                  </button>
                      </div>
                    </div>

                    {/* Total Fixed Costs */}
                    <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold">Total Monthly Fixed Costs</span>
                        <span className="text-lg font-bold">
                          {fixedCosts.reduce((sum, item) => {
                            const monthlyAmount = item.monthly 
                              ? item.cost 
                              : (item.type === "depreciation" 
                                ? (item.cost / (item.years || 1)) / 12 
                                : item.cost / 12);
                            return sum + monthlyAmount;
                          }, 0).toLocaleString()} THB
                        </span>
                      </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded shadow">
                <h2 className="font-bold text-lg mb-4">Variable Costs</h2>
                <p className="text-sm text-gray-600 mb-4">Costs that vary with production volume, specified per ton.</p>

                    {/* Add tabs for different views */}
                    <div className="border-b mb-4">
                      <div className="flex space-x-4">
                        <button
                          className={`px-4 py-2 ${activeProductTier === 'all' ? 'text-blue-700 border-b-2 border-blue-700 font-medium' : 'text-gray-600'}`}
                          onClick={() => setActiveProductTier('all')}
                        >
                          All Costs
                        </button>
                        {priceTiers.map(tier => (
                          <button
                            key={tier.name}
                            className={`px-4 py-2 ${activeProductTier === tier.name ? 'text-blue-700 border-b-2 border-blue-700 font-medium' : 'text-gray-600'}`}
                            onClick={() => setActiveProductTier(tier.name)}
                          >
                            {tier.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Quick Add Section */}
                    <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-4">
                        <input
                          type="text"
                          placeholder="Cost Item Name"
                          className="input flex-1"
                          id="newCostName"
                        />
                        <input
                          type="number"
                          placeholder="Unit Cost"
                          className="input w-32"
                          id="newCostAmount"
                        />
                        <select
                          className="input w-40"
                          id="newCostTier"
                        >
                          <option value="all">All Products</option>
                          {priceTiers.map(tier => (
                            <option key={tier.name} value={tier.name}>{tier.name}</option>
                          ))}
                        </select>
                        <button
                          className="btn btn-primary"
                          onClick={() => {
                            const name = (document.getElementById('newCostName') as HTMLInputElement).value;
                            const cost = parseFloat((document.getElementById('newCostAmount') as HTMLInputElement).value);
                            const tier = (document.getElementById('newCostTier') as HTMLSelectElement).value;
                            
                            if (name && !isNaN(cost)) {
                              const newCost = {
                                name,
                                unitCost: cost,
                                volumeReduction: 0,
                                ...(tier === 'all' ? { all: true } : { tier })
                              };
                              setVariableCosts([...variableCosts, newCost]);
                              
                              // Reset inputs
                              (document.getElementById('newCostName') as HTMLInputElement).value = '';
                              (document.getElementById('newCostAmount') as HTMLInputElement).value = '';
                              (document.getElementById('newCostTier') as HTMLSelectElement).value = 'all';
                            }
                          }}
                        >
                          + Add Cost
                        </button>
                      </div>
                    </div>

                <div className="overflow-x-auto">
                      <table className="min-w-full">
                    <thead>
                      <tr>
                        <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost Item</th>
                            <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Base Cost (THB/ton)</th>
                            <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Volume Reduction (%/1000t)</th>
                            <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Effective Cost</th>
                            <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Product Tier</th>
                        <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                          {variableCosts
                            .filter(item => 
                              activeProductTier === 'all' 
                                ? item.all // Only show universal costs in All Costs tab
                                : (item.tier === activeProductTier || item.all) // Show both specific and universal costs in product tabs
                            )
                            .map((item, index) => {
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
                                    const actualIndex = variableCosts.findIndex(cost => cost === item);
                                    newCosts[actualIndex].name = e.target.value;
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
                                    const actualIndex = variableCosts.findIndex(cost => cost === item);
                                    newCosts[actualIndex].unitCost = parseFormattedNumber(e.target.value);
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
                                    const actualIndex = variableCosts.findIndex(cost => cost === item);
                                    newCosts[actualIndex].volumeReduction = parseFloat(e.target.value);
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
                                    const actualIndex = variableCosts.findIndex(cost => cost === item);
                                if (e.target.value === "all") {
                                      newCosts[actualIndex].all = true;
                                      delete newCosts[actualIndex].tier;
                                } else {
                                      newCosts[actualIndex].all = false;
                                      newCosts[actualIndex].tier = e.target.value;
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
                                    const actualIndex = variableCosts.findIndex(cost => cost === item);
                                    const newCosts = variableCosts.filter((_, i) => i !== actualIndex);
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
                  </table>
                </div>

                    {/* Cost Summary for Selected Tab */}
                    {activeProductTier !== 'all' && (
                      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                        <h3 className="font-bold mb-4">{activeProductTier} Cost Summary</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-sm text-gray-600">Total Variable Cost per Ton</div>
                            <div className="text-xl font-semibold">
                              {(() => {
                                const monthlyVolume = modelData.capacity * (capacityUsage / 100);
                                const tierCosts = variableCosts
                                  .filter(cost => cost.tier === activeProductTier || cost.all)
                                  .reduce((sum, cost) => sum + calculateEffectiveVariableCost(cost, monthlyVolume), 0);
                                return formatNumber(tierCosts);
                              })()} THB
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Contribution Margin per Ton</div>
                            <div className="text-xl font-semibold">
                              {(() => {
                                const monthlyVolume = modelData.capacity * (capacityUsage / 100);
                                const tierCosts = variableCosts
                                  .filter(cost => cost.tier === activeProductTier || cost.all)
                                  .reduce((sum, cost) => sum + calculateEffectiveVariableCost(cost, monthlyVolume), 0);
                                const price = priceTiers.find(tier => tier.name === activeProductTier)?.price || 0;
                                return formatNumber(price - tierCosts);
                              })()} THB
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Margin %</div>
                            <div className="text-xl font-semibold">
                              {(() => {
                                const monthlyVolume = modelData.capacity * (capacityUsage / 100);
                                const tierCosts = variableCosts
                                  .filter(cost => cost.tier === activeProductTier || cost.all)
                                  .reduce((sum, cost) => sum + calculateEffectiveVariableCost(cost, monthlyVolume), 0);
                                const price = priceTiers.find(tier => tier.name === activeProductTier)?.price || 0;
                                return price ? ((price - tierCosts) / price * 100).toFixed(1) + '%' : '0%';
                              })()}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Monthly Volume</div>
                            <div className="text-xl font-semibold">
                              {(() => {
                                const tier = priceTiers.find(t => t.name === activeProductTier);
                                if (!tier) return '0';
                                const monthlyVolume = modelData.capacity * (capacityUsage / 100);
                                return formatNumber(monthlyVolume * (tier.percentage / 100));
                              })()} tons
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeSubTab === 'loans' && (
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

              {activeSubTab === 'statistics' && (
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
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={financialData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatNumber(value)} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" name="Revenue (M THB)" stroke="#2563eb" dot={false} />
                  <Line type="monotone" dataKey="operatingProfit" name="Operating Profit (M THB)" stroke="#16a34a" dot={false} />
                  <Line type="monotone" dataKey="netCashFlow" name="Net Cash Flow (M THB)" stroke="#7c3aed" dot={false} />
                </LineChart>
              </ResponsiveContainer>
              <div className="text-sm text-gray-600 mt-4 mb-6 text-center">
                Note: All figures on this dashboard include variable costs, fixed costs, loan payments, and other relevant expenses. 
                The financial metrics and projections reflect the full cost structure of your business.
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
                const monthlyFixedCost = calculateMonthlyFixedCost(fixedCosts);
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
                let step = Math.max(1, Math.floor(modelData.capacity / 2000)); // More precise step size
                for (let v = 0; v <= modelData.capacity; v += step) {
                  const effectiveVC = calculateTotalVariableCost(v);
                  const revenue = v * weightedPrice;
                  const variableCosts = v * effectiveVC;
                  const contribution = revenue - variableCosts;
                  const profit = contribution - monthlyFixedCost;
                  
                  if (profit >= 0) {
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
                            <span>{breakEvenVolume !== null && breakEvenYear > 0 ? Math.ceil(yearConfig.startYear + breakEvenYear) : 'Not Achieved'}</span>
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

              {/* Dynamic break-even with debt calculation */}
              {(() => {
                const weightedPrice = priceTiers.reduce((sum, tier) => 
                  sum + (tier.price * (tier.percentage / 100)), 0);
                
                const monthlyFixedCost = calculateMonthlyFixedCost(fixedCosts);
                const monthlyLoanPayment = loans.reduce((sum, loan) => 
                  sum + calculateMonthlyPayment(loan.amount, loan.interestRate, loan.term), 0);
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

                // Calculate break-even point by scanning through volumes
                let breakEvenVolume = null;
                let breakEvenCapacity = null;
                let effectiveVariableCostAtBE = null;
                let contributionMarginAtBE = null;
                
                // Use smaller steps for more precise calculation
                let step = Math.max(1, Math.floor(modelData.capacity / 2000)); // More precise step size
                
                // Start from a low volume and increase until we find break-even
                for (let v = 0; v <= modelData.capacity; v += step) {
                  const effectiveVC = calculateTotalVariableCost(v);
                  const revenue = v * weightedPrice;
                  const variableCosts = v * effectiveVC;
                  const contribution = revenue - variableCosts;
                  const profit = contribution - totalMonthlyFixedCost;
                  
                  if (profit >= 0) {
                    // Found break-even point
                    breakEvenVolume = v;
                    breakEvenCapacity = (v / modelData.capacity) * 100;
                    effectiveVariableCostAtBE = effectiveVC;
                    contributionMarginAtBE = weightedPrice - effectiveVC;
                    break;
                  }
                }

                // Calculate break-even year if we found a break-even volume
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
                      if (year === 0) {
                        breakEvenYear = (breakEvenVolume / monthlyVolume) * year;
                      } else {
                        const prevYearVolume = modelData.capacity * 
                          (Math.min(baseUsage * Math.pow(1 + growth / 100, yearsSinceStart - 1), 100) / 100);
                        const fraction = (breakEvenVolume - prevYearVolume) / (monthlyVolume - prevYearVolume);
                        breakEvenYear = year + fraction;
                      }
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
                            <span>{breakEvenVolume !== null && breakEvenYear > 0 ? Math.ceil(yearConfig.startYear + breakEvenYear) : 'Not Achieved'}</span>
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

          {activeTab === 'productCostAnalysis' && (
            <div className="space-y-6 p-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Product Cost Analysis</h2>
                <div className="flex gap-4 items-center">
                  {/* Product Selection */}
                  <select
                    className="input text-sm"
                    value={activeProductTier === 'all' ? 'all' : activeProductTier}
                    onChange={(e) => setActiveProductTier(e.target.value)}
                  >
                    <option value="all">All Products</option>
                    {priceTiers.map(tier => (
                      <option key={tier.name} value={tier.name}>{tier.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Volume Simulation Controls (only for single product view) */}
              {activeProductTier !== 'all' && (() => {
                const tier = priceTiers.find(t => t.name === activeProductTier);
                if (!tier) return null;
                const baseMonthlyVolume = modelData.capacity * (capacityUsage / 100) * (tier.percentage / 100);
                const minVolume = Math.max(1, Math.floor(baseMonthlyVolume * 0.5));
                const maxVolume = Math.ceil(baseMonthlyVolume * 1.5);
                const value = simulatedVolume[tier.name] ?? baseMonthlyVolume;
                return (
                  <div className="flex items-center gap-4 mb-4 bg-blue-50 p-3 rounded">
                    <label className="font-medium">Simulate Monthly Volume:</label>
                    <input
                      type="range"
                      min={minVolume}
                      max={maxVolume}
                      value={value}
                      onChange={e => setSimulatedVolume(v => ({ ...v, [tier.name]: Number(e.target.value) }))}
                      style={{ width: 200 }}
                    />
                    <input
                      type="number"
                      min={minVolume}
                      max={maxVolume}
                      value={value}
                      onChange={e => setSimulatedVolume(v => ({ ...v, [tier.name]: Number(e.target.value) }))}
                      className="w-24"
                    />
                    <span className="ml-2 text-gray-500">tons</span>
                    <button
                      onClick={() => setSimulatedVolume(v => ({ ...v, [tier.name]: null }))}
                      className="btn btn-secondary ml-2"
                      disabled={simulatedVolume[tier.name] == null}
                    >
                      Reset
                    </button>
                    {simulatedVolume[tier.name] != null && (
                      <span className="ml-2 text-blue-600 font-semibold">Simulation Mode</span>
                    )}
                  </div>
                );
              })()}

              {/* Rest of the Product Cost Analysis content */}
              {priceTiers
                .filter(tier => activeProductTier === 'all' || activeProductTier === tier.name)
                .map(tier => {
                  // Use simulated volume if set
                  const monthlyVolume = (activeProductTier === tier.name && simulatedVolume[tier.name] != null)
                    ? simulatedVolume[tier.name]!
                    : modelData.capacity * (capacityUsage / 100) * (tier.percentage / 100);
                  // Calculate cost breakdown for the product
                  const productVariableCosts = variableCosts
                    .filter(cost => cost.tier === tier.name || cost.all)
                    .map(cost => {
                      const unitCost = calculateEffectiveVariableCost(cost, monthlyVolume);
                      return {
                        name: cost.name,
                        unitCost,
                        totalCost: unitCost * monthlyVolume,
                        percentageOfPrice: (unitCost / tier.price) * 100
                      };
                    });

                  // Calculate allocated fixed costs
                  const totalFixedCosts = fixedCosts.reduce((sum, cost) => {
                    if (cost.monthly) return sum + cost.cost;
                    if (cost.annual) return sum + (cost.cost / 12);
                    return sum;
                  }, 0);
                  const allocatedFixedCosts = [{
                    name: 'Allocated Fixed Costs',
                    allocatedCost: (totalFixedCosts * (tier.percentage / 100)) / monthlyVolume,
                    percentageOfPrice: ((totalFixedCosts * (tier.percentage / 100)) / monthlyVolume / tier.price) * 100
                  }];

                  // Contribution margin (variable only)
                  const totalVariableCost = productVariableCosts.reduce((sum, cost) => sum + cost.unitCost, 0);
                  const contributionMargin = tier.price - totalVariableCost;
                  const contributionMarginPercentage = (contributionMargin / tier.price) * 100;

                  // Full cost (variable + allocated fixed)
                  const totalAllocatedFixedCost = allocatedFixedCosts[0].allocatedCost;
                  const totalCost = totalVariableCost + totalAllocatedFixedCost;
                  const margin = tier.price - totalCost;
                  const marginPercentage = (margin / tier.price) * 100;

                  return (
                    <div key={tier.name} className="card mt-6">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-semibold">{tier.name} Cost Analysis</h3>
                        <div className="text-sm text-gray-500">
                          Monthly Volume: {formatNumber(monthlyVolume)} tons
                        </div>
                      </div>

                      {/* Contribution Margin Only */}
                      <div className="mb-6">
                        <h4 className="text-md font-semibold mb-2">Contribution Margin (Variable Costs Only)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                          <div className="text-sm text-gray-500">Price</div>
                          <div className="text-xl font-bold">{formatNumber(tier.price)} THB</div>
                        </div>
                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                            <div className="text-sm text-gray-500">Variable Cost</div>
                            <div className="text-xl font-bold">{formatNumber(totalVariableCost)} THB</div>
                        </div>
                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                            <div className="text-sm text-gray-500">Contribution Margin</div>
                            <div className="text-xl font-bold">{formatNumber(contributionMargin)} THB</div>
                        </div>
                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                          <div className="text-sm text-gray-500">Margin %</div>
                            <div className="text-xl font-bold">{contributionMarginPercentage.toFixed(1)}%</div>
                          </div>
                        </div>
                      </div>

                      {/* Full Cost (Variable + Allocated Fixed) */}
                      <div className="mb-6">
                        <h4 className="text-md font-semibold mb-2">Full Cost (Variable + Allocated Fixed)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                          <div className="bg-white p-4 rounded-lg border border-gray-200">
                            <div className="text-sm text-gray-500">Price</div>
                            <div className="text-xl font-bold">{formatNumber(tier.price)} THB</div>
                            </div>
                          <div className="bg-white p-4 rounded-lg border border-gray-200">
                            <div className="text-sm text-gray-500">Total Cost</div>
                            <div className="text-xl font-bold">{formatNumber(totalCost)} THB</div>
                            </div>
                          <div className="bg-white p-4 rounded-lg border border-gray-200">
                            <div className="text-sm text-gray-500">Margin</div>
                            <div className="text-xl font-bold">{formatNumber(margin)} THB</div>
                            </div>
                          <div className="bg-white p-4 rounded-lg border border-gray-200">
                            <div className="text-sm text-gray-500">Margin %</div>
                            <div className="text-xl font-bold">{marginPercentage.toFixed(1)}%</div>
                          </div>
                        </div>
                      </div>

                      {/* Cost Breakdown */}
                      <div className="mb-6">
                        <h4 className="text-md font-semibold mb-4">Cost Breakdown</h4>
                        {/* Sorting Options */}
                        <div className="flex justify-end mb-4">
                          <select
                            className="input text-sm"
                            defaultValue="percentage"
                            onChange={(e) => {
                              setModelVersion(prev => prev + 1);
                            }}
                            id="costSortOption"
                          >
                            <option value="percentage">Sort by % of Price</option>
                            <option value="unitCost">Sort by Unit Cost</option>
                            <option value="totalCost">Sort by Total Cost</option>
                          </select>
                        </div>
                        {/* Product Cost Analysis Table */}
                        <div className="overflow-x-auto">
                          <table className="min-w-full">
                            <thead>
                              <tr className="bg-gray-50">
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cost Component</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Unit Cost (THB)</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total Cost (THB)</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">% of Cost</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">% of Price</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                const sortOption = (document.getElementById('costSortOption') as HTMLSelectElement)?.value || 'percentage';
                                const sortedCosts = [...productVariableCosts].sort((a, b) => {
                                  switch(sortOption) {
                                    case 'percentage':
                                      return b.percentageOfPrice - a.percentageOfPrice;
                                    case 'unitCost':
                                      return b.unitCost - a.unitCost;
                                    case 'totalCost':
                                      return b.totalCost - a.totalCost;
                                    default:
                                      return b.percentageOfPrice - a.percentageOfPrice;
                                  }
                                });
                                const totalCostValue = sortedCosts.reduce((sum, cost) => sum + cost.totalCost, 0) + 
                                  (allocatedFixedCosts[0]?.allocatedCost || 0) * monthlyVolume;
                                const getIndicatorColor = (index: number) => {
                                  switch(index) {
                                    case 0: return 'text-red-500';
                                    case 1: return 'text-orange-500';
                                    case 2: return 'text-yellow-500';
                                    default: return '';
                                  }
                                };
                                return sortedCosts.map((cost, index) => {
                                  const isTopThree = index < 3;
                                  const percentageOfTotalCost = (cost.totalCost / totalCostValue) * 100;
                                  return (
                                    <tr key={cost.name} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                      <td className="px-4 py-2">
                                        <div className="flex items-center">
                                          <span className={`font-medium ${getIndicatorColor(index)}`}>
                                            {index + 1}.
                                          </span>
                                          <span className="ml-2">{cost.name}</span>
                                          {isTopThree && (
                                            <span className={`ml-2 text-xs font-medium ${getIndicatorColor(index)}`}>
                                              {index === 0 ? '(Highest Impact)' : 
                                               index === 1 ? '(High Impact)' : 
                                               '(Significant)'}
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-4 py-2 text-right">
                                        {formatNumber(cost.unitCost)}
                                        {isTopThree && (
                                          <span className={`ml-1 text-xs ${getIndicatorColor(index)}`}>
                                            ▲
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-4 py-2 text-right">
                                        {formatNumber(cost.totalCost)}
                                        {isTopThree && (
                                          <span className={`ml-1 text-xs ${getIndicatorColor(index)}`}>
                                            ▲
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-4 py-2 text-right">
                                        <span className={`font-medium ${isTopThree ? getIndicatorColor(index) : ''}`}>
                                          {percentageOfTotalCost.toFixed(1)}%
                                        </span>
                                        {isTopThree && (
                                          <span className={`ml-1 text-xs ${getIndicatorColor(index)}`}>
                                            ▲
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-4 py-2 text-right">
                                        <span className={`font-medium ${isTopThree ? getIndicatorColor(index) : ''}`}>
                                          {cost.percentageOfPrice.toFixed(1)}%
                                        </span>
                                        {isTopThree && (
                                          <span className={`ml-1 text-xs ${getIndicatorColor(index)}`}>
                                            ▲
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                });
                              })()}
                              {allocatedFixedCosts.map((cost, index) => {
                                const totalCostValue = productVariableCosts.reduce((sum, cost) => sum + cost.totalCost, 0) + 
                                  cost.allocatedCost * monthlyVolume;
                                const percentageOfTotalCost = ((cost.allocatedCost * monthlyVolume) / totalCostValue) * 100;
                                return (
                                  <tr key={cost.name} className="bg-blue-50">
                                    <td className="px-4 py-2">
                                      <span className="font-medium">{productVariableCosts.length + index + 1}.</span>
                                      <span className="ml-2">{cost.name}</span>
                                    </td>
                                    <td className="px-4 py-2 text-right">{formatNumber(cost.allocatedCost)}</td>
                                    <td className="px-4 py-2 text-right">{formatNumber(cost.allocatedCost * monthlyVolume)}</td>
                                    <td className="px-4 py-2 text-right font-medium">{percentageOfTotalCost.toFixed(1)}%</td>
                                    <td className="px-4 py-2 text-right font-medium">{cost.percentageOfPrice.toFixed(1)}%</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        {/* Legend for Top Costs */}
                        <div className="mt-4 text-sm text-gray-600">
                          <div className="flex items-center gap-6">
                            <div className="flex items-center">
                              <span className="inline-block w-3 h-3 bg-red-500 mr-2"></span>
                              Highest Impact
                            </div>
                            <div className="flex items-center">
                              <span className="inline-block w-3 h-3 bg-orange-500 mr-2"></span>
                              High Impact
                            </div>
                            <div className="flex items-center">
                              <span className="inline-block w-3 h-3 bg-yellow-500 mr-2"></span>
                              Significant
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* Cost Optimization Opportunities (moved below breakdown) */}
                      <div className="mb-6">
                        <h4 className="text-md font-semibold mb-4">Cost Optimization Opportunities</h4>
                        <div className="space-y-4">
                          {/* Volume-based Savings */}
                          {productVariableCosts.some(cost => cost.percentageOfPrice > 15) && (
                            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                              <h5 className="font-medium text-yellow-800 mb-2">High Cost Components</h5>
                              <ul className="list-disc list-inside text-sm text-yellow-700">
                                {productVariableCosts
                                  .filter(cost => cost.percentageOfPrice > 15)
                                  .map(cost => (
                                    <li key={cost.name}>
                                      {cost.name} represents {cost.percentageOfPrice.toFixed(1)}% of the price. 
                                      Consider negotiating better rates or finding alternative suppliers.
                                    </li>
                                  ))}
                              </ul>
                            </div>
                          )}

                          {/* Volume Optimization */}
                          {marginPercentage < 20 && (
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                              <h5 className="font-medium text-blue-800 mb-2">Margin Improvement Opportunities</h5>
                              <ul className="list-disc list-inside text-sm text-blue-700">
                                <li>Current margin ({marginPercentage.toFixed(1)}%) is below target. Consider:</li>
                                <li>Increasing production volume to benefit from economies of scale</li>
                                <li>Reviewing pricing strategy</li>
                                <li>Optimizing fixed cost allocation</li>
                              </ul>
                            </div>
                          )}

                          {/* Fixed Cost Allocation */}
                          {allocatedFixedCosts[0].percentageOfPrice > 10 && (
                            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                              <h5 className="font-medium text-green-800 mb-2">Fixed Cost Optimization</h5>
                              <ul className="list-disc list-inside text-sm text-green-700">
                                <li>
                                  Fixed costs represent {allocatedFixedCosts[0].percentageOfPrice.toFixed(1)}% of the price.
                                  Consider increasing production volume to better absorb fixed costs.
                                </li>
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {activeTab === 'financialModel' && (
            <div className="space-y-6 p-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Financial Model - GP, EBITDA & Net Profit</h2>
                <div className="flex gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Utilization Rate:</label>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="1"
                      value={financialModelUtilization}
                      onChange={(e) => setFinancialModelUtilization(Number(e.target.value))}
                      className="w-32"
                    />
                    <input
                      type="number"
                      min="10"
                      max="100"
                      value={financialModelUtilization}
                      onChange={(e) => setFinancialModelUtilization(Number(e.target.value))}
                      className="w-20 px-2 py-1 border rounded text-center"
                    />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                  <button
                    onClick={() => setFinancialModelUtilization(capacityUsage)}
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                  >
                    Reset to Main Model
                  </button>
                </div>
              </div>

              {(() => {
                const projections = calculateFinancialModelProjections(financialModelUtilization);
                
                // Single year metrics (no averaging needed)
                const currentYear = projections.length > 0 ? projections[0] : null;
                const avgMetrics = currentYear ? {
                  revenue: currentYear.revenue,
                  grossProfit: currentYear.grossProfit,
                  ebitda: currentYear.ebitda,
                  netProfit: currentYear.netProfit,
                  grossMargin: currentYear.grossProfitMargin,
                  ebitdaMargin: currentYear.ebitdaMargin,
                  netMargin: currentYear.netProfitMargin
                } : { revenue: 0, grossProfit: 0, ebitda: 0, netProfit: 0, grossMargin: 0, ebitdaMargin: 0, netMargin: 0 };

                return (
                  <>
                    {/* Key Financial Metrics Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      <div className="card">
                        <h3 className="text-lg font-semibold mb-4">Gross Profit</h3>
                        <div className="text-3xl font-bold text-green-600 mb-2">
                          {formatNumber(avgMetrics.grossProfit)} M THB
                        </div>
                                                 <div className="text-sm text-gray-500">
                           Margin: {avgMetrics.grossMargin.toFixed(1)}%
                         </div>
                         <div className="text-xs text-gray-400 mt-2">
                           Current Year at {financialModelUtilization}% Utilization
                         </div>
                      </div>

                      <div className="card">
                        <h3 className="text-lg font-semibold mb-4">EBITDA</h3>
                        <div className="text-3xl font-bold text-blue-600 mb-2">
                          {formatNumber(avgMetrics.ebitda)} M THB
                        </div>
                                                 <div className="text-sm text-gray-500">
                           Margin: {avgMetrics.ebitdaMargin.toFixed(1)}%
                         </div>
                        <div className="text-xs text-gray-400 mt-2">
                          Earnings Before Interest, Taxes, Depreciation & Amortization
                        </div>
                      </div>

                      <div className="card">
                        <h3 className="text-lg font-semibold mb-4">Net Profit</h3>
                        <div className="text-3xl font-bold text-purple-600 mb-2">
                          {formatNumber(avgMetrics.netProfit)} M THB
                        </div>
                                                 <div className="text-sm text-gray-500">
                           Margin: {avgMetrics.netMargin.toFixed(1)}%
                         </div>
                        <div className="text-xs text-gray-400 mt-2">
                          After interest and taxes
                        </div>
                      </div>
                    </div>

                                         {/* Financial Performance Chart */}
                     <div className="card">
                       <h3 className="text-lg font-bold mb-6">Financial Performance at {financialModelUtilization}% Utilization</h3>
                      <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={projections} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis 
                              dataKey="year" 
                              tick={{ fill: '#6B7280' }}
                              angle={-45}
                              textAnchor="end"
                              height={60}
                            />
                            <YAxis 
                              tick={{ fill: '#6B7280' }}
                              tickFormatter={(value) => `${value.toFixed(0)}M`}
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
                              name="Revenue" 
                              isAnimationActive={false}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="grossProfit" 
                              stroke="#10B981" 
                              strokeWidth={2}
                              dot={{ fill: '#10B981', r: 4 }}
                              name="Gross Profit" 
                              isAnimationActive={false}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="ebitda" 
                              stroke="#3B82F6" 
                              strokeWidth={2}
                              dot={{ fill: '#3B82F6', r: 4 }}
                              name="EBITDA" 
                              isAnimationActive={false}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="netProfit" 
                              stroke="#8B5CF6" 
                              strokeWidth={2}
                              dot={{ fill: '#8B5CF6', r: 4 }}
                              name="Net Profit" 
                              isAnimationActive={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Margin Analysis Chart */}
                    <div className="card">
                      <h3 className="text-lg font-bold mb-6">Margin Analysis</h3>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={projections} margin={{ top: 5, right: 30, left: 20, bottom: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                            <XAxis dataKey="year" tick={{ fill: '#6B7280' }} />
                            <YAxis 
                              tick={{ fill: '#6B7280' }}
                              tickFormatter={(value) => `${value.toFixed(0)}%`}
                            />
                            <Tooltip 
                              formatter={(value: number) => [`${value.toFixed(1)}%`, '']}
                              labelFormatter={(year) => `Year ${year}`}
                            />
                            <Legend />
                            <Line 
                              type="monotone" 
                              dataKey="grossProfitMargin" 
                              stroke="#10B981" 
                              strokeWidth={2}
                              dot={{ fill: '#10B981', r: 3 }}
                              name="Gross Margin %" 
                              isAnimationActive={false}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="ebitdaMargin" 
                              stroke="#3B82F6" 
                              strokeWidth={2}
                              dot={{ fill: '#3B82F6', r: 3 }}
                              name="EBITDA Margin %" 
                              isAnimationActive={false}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="netProfitMargin" 
                              stroke="#8B5CF6" 
                              strokeWidth={2}
                              dot={{ fill: '#8B5CF6', r: 3 }}
                              name="Net Margin %" 
                              isAnimationActive={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                                         {/* Detailed Financial Table */}
                     <div className="card">
                       <h3 className="text-lg font-bold mb-6">Financial Breakdown for {currentYear?.year || yearConfig.startYear}</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="px-4 py-2 text-left">Year</th>
                              <th className="px-4 py-2 text-right">Revenue (M THB)</th>
                              <th className="px-4 py-2 text-right">COGS (M THB)</th>
                              <th className="px-4 py-2 text-right">Gross Profit (M THB)</th>
                              <th className="px-4 py-2 text-right">Operating Exp (M THB)</th>
                              <th className="px-4 py-2 text-right">EBITDA (M THB)</th>
                              <th className="px-4 py-2 text-right">Depreciation (M THB)</th>
                              <th className="px-4 py-2 text-right">EBIT (M THB)</th>
                              <th className="px-4 py-2 text-right">Interest (M THB)</th>
                              <th className="px-4 py-2 text-right">Net Profit (M THB)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {projections.map((year, index) => (
                              <tr key={year.year} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="px-4 py-2 font-medium">{year.year}</td>
                                <td className="px-4 py-2 text-right">{formatNumber(year.revenue)}</td>
                                <td className="px-4 py-2 text-right text-red-600">{formatNumber(year.cogs)}</td>
                                <td className="px-4 py-2 text-right text-green-600 font-medium">{formatNumber(year.grossProfit)}</td>
                                <td className="px-4 py-2 text-right text-red-600">{formatNumber(year.operatingExpenses)}</td>
                                <td className="px-4 py-2 text-right text-blue-600 font-medium">{formatNumber(year.ebitda)}</td>
                                <td className="px-4 py-2 text-right text-gray-600">{formatNumber(year.depreciation)}</td>
                                <td className="px-4 py-2 text-right text-indigo-600 font-medium">{formatNumber(year.ebit)}</td>
                                <td className="px-4 py-2 text-right text-red-600">{formatNumber(year.interestExpense)}</td>
                                <td className="px-4 py-2 text-right text-purple-600 font-bold">{formatNumber(year.netProfit)}</td>
                              </tr>
                            ))}
                                                         {/* Summary Row */}
                             <tr className="bg-gray-100 font-bold border-t-2">
                               <td className="px-4 py-2">TOTAL</td>
                                                             <td className="px-4 py-2 text-right">{formatNumber(avgMetrics.revenue)}</td>
                               <td className="px-4 py-2 text-right text-red-600">{formatNumber(currentYear?.cogs || 0)}</td>
                               <td className="px-4 py-2 text-right text-green-600">{formatNumber(avgMetrics.grossProfit)}</td>
                               <td className="px-4 py-2 text-right text-red-600">{formatNumber(currentYear?.operatingExpenses || 0)}</td>
                               <td className="px-4 py-2 text-right text-blue-600">{formatNumber(avgMetrics.ebitda)}</td>
                               <td className="px-4 py-2 text-right text-gray-600">{formatNumber(currentYear?.depreciation || 0)}</td>
                               <td className="px-4 py-2 text-right text-indigo-600">{formatNumber(currentYear?.ebit || 0)}</td>
                               <td className="px-4 py-2 text-right text-red-600">{formatNumber(currentYear?.interestExpense || 0)}</td>
                               <td className="px-4 py-2 text-right text-purple-600">{formatNumber(avgMetrics.netProfit)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    
                     {/* Financial Insights */}
                     <div className="card">
                       <h3 className="text-lg font-bold mb-4">Financial Insights</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-semibold mb-3 text-green-700">Profitability Analysis</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>Gross Profit Margin:</span>
                              <span className="font-medium">{avgMetrics.grossMargin.toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span>EBITDA Margin:</span>
                              <span className="font-medium">{avgMetrics.ebitdaMargin.toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Net Profit Margin:</span>
                              <span className="font-medium">{avgMetrics.netMargin.toFixed(1)}%</span>
                            </div>
                                                         <div className="flex justify-between border-t pt-2">
                               <span>Annual Revenue:</span>
                               <span className="font-bold">{formatNumber(avgMetrics.revenue)} M THB</span>
                             </div>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold mb-3 text-blue-700">Utilization Impact</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>Current Utilization:</span>
                              <span className="font-medium">{financialModelUtilization}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Monthly Volume:</span>
                              <span className="font-medium">{formatNumber(modelData.capacity * (financialModelUtilization / 100))} tons</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Annual Volume:</span>
                              <span className="font-medium">{formatNumber(modelData.capacity * (financialModelUtilization / 100) * 12)} tons</span>
                            </div>
                            <div className="flex justify-between border-t pt-2">
                              <span>Revenue per Ton:</span>
                              <span className="font-bold">{formatNumber(avgMetrics.revenue * 1000000 / (modelData.capacity * (financialModelUtilization / 100) * 12))} THB</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {avgMetrics.netMargin < 5 && (
                        <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                          <p className="text-yellow-800 text-sm">
                            <strong>Warning:</strong> Net profit margin is below 5%. Consider reviewing pricing strategy, cost optimization, or increasing utilization rate.
                          </p>
                        </div>
                      )}
                      
                      {avgMetrics.ebitdaMargin > 20 && (
                        <div className="mt-4 p-3 bg-green-50 border-l-4 border-green-400 rounded">
                          <p className="text-green-800 text-sm">
                            <strong>Excellent:</strong> EBITDA margin above 20% indicates strong operational efficiency.
                          </p>
                        </div>
                      )}

                      {/* Break-even consistency note */}
                      <div className="mt-4 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                        <p className="text-blue-800 text-sm">
                          <strong>Note:</strong> Based on the break-even analysis, you need approximately 40.8% capacity utilization to break even. 
                          Utilization rates below this should show losses, while rates above should show profits. 
                          This Financial Model is now consistent with the break-even calculations.
                        </p>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Model Parameters Modal */}
      <ModelParametersModal
        isOpen={isParamsModalOpen}
        onClose={() => setParamsModalOpen(false)}
        modelData={modelData}
        setModelData={setModelData}
        yearConfig={yearConfig}
        setYearConfig={setYearConfig}
        capacityUsage={capacityUsage}
        setCapacityUsage={setCapacityUsage}
        capacityGrowth={capacityGrowth}
        setCapacityGrowth={setCapacityGrowth}
        priceTiers={priceTiers}
        setPriceTiers={setPriceTiers}
        priceGrowth={priceGrowth}
        setPriceGrowth={setPriceGrowth}
        fixedCosts={fixedCosts}
        setFixedCosts={setFixedCosts}
        variableCosts={variableCosts}
        setVariableCosts={setVariableCosts}
        loans={loans}
        setLoans={setLoans}
        durationInput={durationInput}
        setDurationInput={setDurationInput}
        handleDurationChange={handleDurationChange}
        updateYearRange={updateYearRange}
        formatInputNumber={formatInputNumber}
        parseFormattedNumber={parseFormattedNumber}
        formatNumber={formatNumber}
        yieldLoss={yieldLoss}
        setYieldLoss={setYieldLoss}
      />
    </div>
  );
};

export default EmpowerModel;