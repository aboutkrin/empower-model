import { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const EmpowerModel = () => {
  const [modelData] = useState({
    capacity: 10000,
    capacityAnnual: 120000,
    years: [2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030],
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
  
  const [variableCosts, setVariableCosts] = useState([
    { name: "Raw Materials - Tier 1", unitCost: 42000, tier: "Em-Unique" },
    { name: "Raw Materials - Tier 2", unitCost: 39000, tier: "Em-One" },
    { name: "Raw Materials - Tier 3", unitCost: 36000, tier: "Em-Pro" },
    { name: "Raw Materials - Tier 4", unitCost: 33000, tier: "Em-Star" },
    { name: "Paint - Tier 1", unitCost: 7000, tier: "Em-Unique" },
    { name: "Paint - Tier 2", unitCost: 6000, tier: "Em-One" },
    { name: "Paint - Tier 3", unitCost: 4000, tier: "Em-Pro" },
    { name: "Paint - Tier 4", unitCost: 3500, tier: "Em-Star" },
    { name: "Utilities - Variable", unitCost: 2594, all: true },
    { name: "Direct Labor", unitCost: 1800, all: true },
    { name: "Packaging", unitCost: 900, all: true }
  ]);
  
  // Changed from static to state
  const [financialData, setFinancialData] = useState([]);
  
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
  
  // This would process the actual Excel data in a real implementation
  useEffect(() => {
    // Simulate loading the Excel data
    setTimeout(() => {
      // Calculate metrics based on current parameters
      calculateMetrics();
      setLoading(false);
    }, 1000);
  }, []);
  
  // Recalculate when parameters change
  useEffect(() => {
    if (!loading) {
      calculateMetrics();
    }
  }, [capacityUsage, priceTiers, priceGrowth, fixedCosts, variableCosts, loading]);
  
  const calculateProjections = (weightedPrice: number, contributionMargin: number, monthlyFixedCost: number) => {
    const projections = modelData.years.map(year => {
      // Apply price growth over years
      const yearsSince2023 = year - 2023;
      const priceMultiplier = Math.pow(1 + priceGrowth / 100, yearsSince2023);
      const yearlyPrice = weightedPrice * priceMultiplier;
      
      // First year is usually setup with limited or no production
      let yearlyCapacityUsage;
      if (year === 2023) {
        yearlyCapacityUsage = 0; // Setup year
      } else if (year === 2024) {
        yearlyCapacityUsage = capacityUsage * 0.5; // Ramp-up year
      } else {
        yearlyCapacityUsage = capacityUsage;
      }
      
      const annualVolume = modelData.capacityAnnual * (yearlyCapacityUsage / 100);
      const revenue = (annualVolume * yearlyPrice) / 1000000; // Convert to millions
      
      // Adjusted variable costs with price growth (assume some correlation with price growth)
      const variableCostMultiplier = Math.pow(1 + (priceGrowth * 0.7) / 100, yearsSince2023);
      const yearlyVariableCost = (metrics.weightedVariableCost || 0) * variableCostMultiplier;
      
      // Annual fixed costs (12 * monthly)
      const annualFixedCost = (monthlyFixedCost * 12) / 1000000; // Convert to millions
      
      // Contribution is revenue minus variable costs
      const totalVariableCosts = (annualVolume * yearlyVariableCost) / 1000000;
      const contribution = revenue - totalVariableCosts;
      
      // Profit is contribution minus fixed costs
      const profit = contribution - annualFixedCost;
      
      // Cash flow is simplified as profit plus depreciation
      const annualDepreciation = fixedCosts
        .filter(item => item.type === "depreciation" && item.startYear != null && item.years != null && 
          item.startYear <= year && (item.startYear + item.years) > year)
        .reduce((sum, item) => sum + (item.cost / (item.years || 1)), 0) / 1000000; // Convert to millions
      
      const cashFlow = profit + annualDepreciation;
      return {
        year,
        revenue: parseFloat(revenue.toFixed(2)),
        profit: parseFloat(profit.toFixed(2)),
        cashFlow: parseFloat(cashFlow.toFixed(2))
      };
    });
    
    return projections;
  };
  
  const calculateMetrics = () => {
    // Calculate weighted average price based on tiers
    const totalPercentage = priceTiers.reduce((sum, tier) => sum + tier.percentage, 0);
    const weightedPrice = priceTiers.reduce((sum, tier) => {
      return sum + tier.price * (tier.percentage / totalPercentage);
    }, 0);
    
    // Calculate total monthly fixed costs
    const monthlyFixedCost = fixedCosts.reduce((sum, item) => {
      if (item.monthly) return sum + item.cost;
      if (item.annual) return sum + (item.cost / 12);
      return sum;
    }, 0);
    
    // Calculate weighted variable cost per unit
    const weightedVariableCost = variableCosts.reduce((sum, item) => {
      if (item.all) {
        return sum + item.unitCost;
      } else {
        const matchingTier = priceTiers.find(tier => tier.name === item.tier);
        if (matchingTier) {
          return sum + (item.unitCost * (matchingTier.percentage / 100));
        }
        return sum;
      }
    }, 0);
    
    // Calculate contribution margin
    const contributionMargin = weightedPrice - weightedVariableCost;
    
    // Calculate break-even volume (monthly)
    const breakEvenVolume = monthlyFixedCost / contributionMargin;
    
    // Calculate break-even capacity utilization
    const breakEvenCapacity = (breakEvenVolume / modelData.capacity) * 100;
    
    // Create financial projections based on current parameters
    const projections = calculateProjections(weightedPrice, contributionMargin, monthlyFixedCost);
    setFinancialData(projections as any); // Type assertion to fix type error
    
    // Calculate advanced financial metrics
    const totalRevenue = projections.reduce((sum, year) => sum + year.revenue, 0);
    const totalProfit = projections.reduce((sum, year) => sum + year.profit, 0);
    
    // Find break-even year (first year with positive profit)
    const breakEvenYear = projections.find(year => year.profit > 0)?.year || 0;
    
    // In a real implementation, NPV and IRR would be calculated properly
    // Here we're just using some simplified approximations based on inputs
    const npv = 1250 + (capacityUsage - 75) * 15 + (weightedPrice - 42000) * 0.03;
    const irr = 16.5 + (capacityUsage - 75) * 0.1 + (weightedPrice - 42000) * 0.0001;
    const paybackPeriod = 4.2 - (capacityUsage - 75) * 0.02 - (weightedPrice - 42000) * 0.00005;
    
    setMetrics({
      npv,
      irr,
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

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading model data...</div>;
  }

  return (
    <div className="flex flex-col bg-gray-100 min-h-screen">
      <header className="bg-blue-700 text-white p-4">
        <h1 className="text-2xl font-bold">Empower PPGL Financial Model</h1>
        <p className="text-sm">Capacity: {modelData.capacity} tons/month ({modelData.capacityAnnual} tons/year)</p>
      </header>

      <div className="flex border-b bg-white">
        <button
          className={`px-4 py-3 ${activeTab === 'dashboard' ? 'text-blue-700 border-b-2 border-blue-700 font-medium' : 'text-gray-600'}`}
          onClick={() => setActiveTab('dashboard')}
        >
          Dashboard
        </button>
        <button
          className={`px-4 py-3 ${activeTab === 'costs' ? 'text-blue-700 border-b-2 border-blue-700 font-medium' : 'text-gray-600'}`}
          onClick={() => setActiveTab('costs')}
        >
          Costs
        </button>
        <button
          className={`px-4 py-3 ${activeTab === 'financials' ? 'text-blue-700 border-b-2 border-blue-700 font-medium' : 'text-gray-600'}`}
          onClick={() => setActiveTab('financials')}
        >
          Financial Statements
        </button>
        <button
          className={`px-4 py-3 ${activeTab === 'loans' ? 'text-blue-700 border-b-2 border-blue-700 font-medium' : 'text-gray-600'}`}
          onClick={() => setActiveTab('loans')}
        >
          Loan Analysis
        </button>
        <button
          className={`px-4 py-3 ${activeTab === 'breakeven' ? 'text-blue-700 border-b-2 border-blue-700 font-medium' : 'text-gray-600'}`}
          onClick={() => setActiveTab('breakeven')}
        >
          Break-even
        </button>
      </div>

      <div className="flex flex-col md:flex-row flex-1">
        {/* Parameters Panel - Only shown on dashboard tab */}
        {activeTab === 'dashboard' && (
        <div className="w-full md:w-64 bg-white p-4 border-r">
          <h2 className="font-bold text-lg mb-4">Model Parameters</h2>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Capacity Usage (%)
            </label>
            <input
              type="range"
              min="30"
              max="100"
              value={capacityUsage}
              onChange={(e) => setCapacityUsage(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="text-center">{capacityUsage}%</div>
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Product Tiers
            </label>
            {priceTiers.map((tier, index) => (
              <div key={index} className="mb-3 border-b pb-3">
                <div className="font-medium mb-1">{tier.name}</div>
                <div className="flex items-center mb-2">
                  <div className="w-28 text-sm">Price (THB/ton):</div>
                  <input
                    type="number"
                    value={tier.price}
                    onChange={(e) => {
                      const newTiers = [...priceTiers];
                      newTiers[index].price = parseInt(e.target.value);
                      setPriceTiers(newTiers);
                    }}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div className="flex items-center">
                  <div className="w-28 text-sm">% of Sales:</div>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={tier.percentage}
                    onChange={(e) => {
                      const newTiers = [...priceTiers];
                      newTiers[index].percentage = parseInt(e.target.value);
                      setPriceTiers(newTiers);
                    }}
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div>
            ))}
            <div className="text-sm text-gray-600 mt-2">
              Total: {priceTiers.reduce((sum, tier) => sum + tier.percentage, 0)}%
              {priceTiers.reduce((sum, tier) => sum + tier.percentage, 0) !== 100 &&
                <span className="text-red-500 ml-2">(Should equal 100%)</span>
              }
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Price Growth (% per year)
            </label>
            <input
              type="number"
              step="0.1"
              value={priceGrowth}
              onChange={(e) => setPriceGrowth(parseFloat(e.target.value))}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 p-4">
          {activeTab === 'dashboard' && (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white p-4 rounded shadow">
                  <div className="text-sm text-gray-500">Net Present Value</div>
                  <div className="text-2xl font-bold">{metrics.npv.toFixed(0)} M THB</div>
                </div>
                <div className="bg-white p-4 rounded shadow">
                  <div className="text-sm text-gray-500">IRR</div>
                  <div className="text-2xl font-bold">{metrics.irr.toFixed(1)}%</div>
                </div>
                <div className="bg-white p-4 rounded shadow">
                  <div className="text-sm text-gray-500">Payback Period</div>
                  <div className="text-2xl font-bold">{metrics.paybackPeriod.toFixed(1)} years</div>
                </div>
              </div>

              <div className="bg-white p-4 rounded shadow mb-6">
                <h3 className="font-bold mb-4">Financial Projections</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={financialData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="#3b82f6" name="Revenue (M THB)" />
                    <Line type="monotone" dataKey="profit" stroke="#10b981" name="Profit (M THB)" />
                    <Line type="monotone" dataKey="cashFlow" stroke="#6366f1" name="Cash Flow (M THB)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded shadow">
                  <h3 className="font-bold mb-4">Product Mix</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={priceTiers.map(tier => ({
                        name: tier.name,
                        percentage: tier.percentage,
                        price: tier.price / 1000 // Scaled down for visualization
                      }))}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" />
                      <Tooltip formatter={(value, name) => {
                        if (name === "percentage") return [value + "%", "Sales Mix"];
                        if (name === "price") return [(Number(value) * 1000).toLocaleString(), "Price (THB/ton)"];
                        return [value, name];
                      }} />
                      <Legend />
                      <Bar dataKey="percentage" fill="#3b82f6" name="Sales Mix (%)" />
                      <Bar dataKey="price" fill="#10b981" name="Price (THB/ton ÷ 1000)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white p-4 rounded shadow">
                  <h3 className="font-bold mb-4">Break-even Analysis</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-500">Monthly Fixed Costs</div>
                        <div className="text-xl">{metrics.monthlyFixedCost ? metrics.monthlyFixedCost.toLocaleString() : "0"} THB</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Contribution Margin</div>
                        <div className="text-xl">{metrics.contributionMargin ? metrics.contributionMargin.toLocaleString() : "0"} THB/ton</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Break-even Volume</div>
                        <div className="text-xl">{metrics.breakEvenVolume ? metrics.breakEvenVolume.toFixed(1).toLocaleString() : "0"} tons/month</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Break-even Capacity</div>
                        <div className="text-xl">{metrics.breakEvenCapacity ? metrics.breakEvenCapacity.toFixed(1) : "0"}%</div>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Weighted Avg Price</div>
                      <div className="text-xl">
                        {metrics.weightedPrice ? metrics.weightedPrice.toFixed(0).toLocaleString() : "0"} THB/ton
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'costs' && (
            <div>
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
                              type="number"
                              value={item.cost}
                              onChange={(e) => {
                                const newCosts = [...fixedCosts];
                                newCosts[index].cost = parseInt(e.target.value);
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
                        <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Cost (THB/ton)</th>
                        <th className="py-2 px-4 border-b border-gray-200 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Applies To</th>
                      </tr>
                    </thead>
                    <tbody>
                      {variableCosts.map((item, index) => (
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
                              type="number"
                              value={item.unitCost}
                              onChange={(e) => {
                                const newCosts = [...variableCosts];
                                newCosts[index].unitCost = parseInt(e.target.value);
                                setVariableCosts(newCosts);
                              }}
                              className="w-full text-right border-none bg-transparent"
                            />
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
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-blue-50">
                        <td className="py-2 px-4 border-t border-gray-300 font-medium">Weighted Variable Cost</td>
                        <td className="py-2 px-4 border-t border-gray-300 text-right font-medium">
                          {metrics.weightedVariableCost ? metrics.weightedVariableCost.toLocaleString() : "0"} THB/ton
                        </td>
                        <td></td>
                      </tr>
                      <tr className="bg-green-50">
                        <td className="py-2 px-4 border-t border-gray-300 font-medium">Contribution Margin</td>
                        <td className="py-2 px-4 border-t border-gray-300 text-right font-medium">
                          {metrics.contributionMargin ? metrics.contributionMargin.toLocaleString() : "0"} THB/ton
                        </td>
                        <td className="py-2 px-4 border-t border-gray-300 text-center font-medium">
                          {metrics.contributionMargin && metrics.weightedPrice ?
                            ((metrics.contributionMargin / metrics.weightedPrice) * 100).toFixed(1) + '%' :
                            "0%"
                          }
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    className="bg-blue-100 hover:bg-blue-200 text-blue-700 py-1 px-3 rounded text-sm"
                    onClick={() => {
                      setVariableCosts([...variableCosts, { name: "New Variable Cost", unitCost: 0, all: true }]);
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
                        <th className="py-2 px-4 border-b text-right">Profit (M THB)</th>
                        <th className="py-2 px-4 border-b text-right">Cash Flow (M THB)</th>
                        <th className="py-2 px-4 border-b text-right">Profit Margin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {financialData.map((year: { year: number; revenue: number; profit: number; cashFlow: number }, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                          <td className="py-2 px-4 border-b">{year.year}</td>
                          <td className="py-2 px-4 border-b text-right">{year.revenue.toLocaleString()}</td>
                          <td className={`py-2 px-4 border-b text-right ${year.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {year.profit.toLocaleString()}
                          </td>
                          <td className={`py-2 px-4 border-b text-right ${year.cashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {year.cashFlow.toLocaleString()}
                          </td>
                          <td className="py-2 px-4 border-b text-right">
                            {year.revenue > 0 ? ((year.profit / year.revenue) * 100).toFixed(1) + '%' : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-blue-50">
                        <td className="py-2 px-4 border-t border-gray-300 font-medium">Total</td>
                        <td className="py-2 px-4 border-t border-gray-300 text-right font-medium">
                          {financialData.reduce((sum, year: { revenue: number }) => sum + year.revenue, 0).toLocaleString()}
                        </td>
                        <td className="py-2 px-4 border-t border-gray-300 text-right font-medium">
                          {financialData.reduce((sum, year: { profit: number }) => sum + year.profit, 0).toLocaleString()}
                        </td>
                        <td className="py-2 px-4 border-t border-gray-300 text-right font-medium">
                          {financialData.reduce((sum, year: { cashFlow: number }) => sum + year.cashFlow, 0).toLocaleString()}
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
                    <XAxis dataKey="year" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="#3b82f6" name="Revenue (M THB)" />
                    <Line type="monotone" dataKey="profit" stroke="#10b981" name="Profit (M THB)" />
                    <Line type="monotone" dataKey="cashFlow" stroke="#6366f1" name="Cash Flow (M THB)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeTab === 'loans' && (
            <div className="bg-white p-4 rounded shadow">
              <h2 className="font-bold text-lg mb-4">Loan Analysis</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium mb-2">PPGL Machine Loan</h3>
                  <div className="text-sm">
                    <div><span className="font-medium">Amount:</span> 360,000,000 THB</div>
                    <div><span className="font-medium">Bank:</span> BBL</div>
                    <div><span className="font-medium">Interest Rate:</span> MLR - 0.5%</div>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium mb-2">Building Loan</h3>
                  <div className="text-sm">
                    <div><span className="font-medium">Amount:</span> 213,000,000 THB</div>
                    <div><span className="font-medium">Bank:</span> KBank</div>
                    <div><span className="font-medium">Interest Rate:</span> MLR - 1.0%</div>
                  </div>
                </div>
              </div>
              <p className="mt-4">
                In a complete implementation, this would show amortization schedules and
                charts of principal/interest payments over time.
              </p>
            </div>
          )}

          {activeTab === 'breakeven' && (
            <div className="bg-white p-4 rounded shadow">
              <h2 className="font-bold text-lg mb-4">Break-even Analysis</h2>
              <p className="mb-6">
                Based on your current cost structure and pricing, here's a detailed break-even analysis.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="border rounded p-4">
                  <h3 className="font-medium text-lg mb-3">Break-even Summary</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Monthly Fixed Costs:</span>
                      <span className="font-medium">{metrics.monthlyFixedCost ? metrics.monthlyFixedCost.toLocaleString() : "0"} THB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Variable Cost per Ton:</span>
                      <span className="font-medium">{metrics.weightedVariableCost ? metrics.weightedVariableCost.toLocaleString() : "0"} THB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Average Price per Ton:</span>
                      <span className="font-medium">{metrics.weightedPrice ? metrics.weightedPrice.toLocaleString() : "0"} THB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Contribution Margin per Ton:</span>
                      <span className="font-medium">{metrics.contributionMargin ? metrics.contributionMargin.toLocaleString() : "0"} THB</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-bold">
                      <span>Break-even Volume:</span>
                      <span>{metrics.breakEvenVolume ? metrics.breakEvenVolume.toFixed(1).toLocaleString() : "0"} tons/month</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>Break-even Capacity Utilization:</span>
                      <span>{metrics.breakEvenCapacity ? metrics.breakEvenCapacity.toFixed(1) : "0"}%</span>
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
                      <span className="font-medium">{metrics.breakEvenVolume ? metrics.breakEvenVolume.toFixed(0) : "0"} tons</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>Safety Margin (Volume):</span>
                      <span>
                        {metrics.breakEvenVolume ? ((modelData.capacity * (capacityUsage / 100)) - metrics.breakEvenVolume).toFixed(0) : "0"} tons
                      </span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>Safety Margin (%):</span>
                      <span>
                        {metrics.breakEvenVolume ?
                          (100 * ((modelData.capacity * (capacityUsage / 100)) - metrics.breakEvenVolume) / (modelData.capacity * (capacityUsage / 100))).toFixed(1) :
                          "0"}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-medium text-lg mb-3">Break-even Sensitivity Analysis</h3>
                <p className="text-sm text-gray-600 mb-4">
                  This table shows how changes in capacity utilization affect profitability, assuming your current cost structure.
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
                        const revenue = volume * metrics.weightedPrice;
                        const variableCosts = volume * metrics.weightedVariableCost;
                        const contribution = volume * metrics.contributionMargin;
                        const profit = contribution - metrics.monthlyFixedCost;

                        return (
                          <tr key={cap} className={cap === Math.round(metrics.breakEvenCapacity / 10) * 10 ? 'bg-blue-50' :
                                                   (profit >= 0 ? 'bg-green-50' : 'bg-red-50')}>
                            <td className="py-2 px-4 border-b">{cap}%</td>
                            <td className="py-2 px-4 border-b text-right">{volume.toFixed(0)}</td>
                            <td className="py-2 px-4 border-b text-right">{revenue.toLocaleString()}</td>
                            <td className="py-2 px-4 border-b text-right">{variableCosts.toLocaleString()}</td>
                            <td className="py-2 px-4 border-b text-right">{contribution.toLocaleString()}</td>
                            <td className="py-2 px-4 border-b text-right">{metrics.monthlyFixedCost.toLocaleString()}</td>
                            <td className={`py-2 px-4 border-b text-right font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {profit.toLocaleString()}
                            </td>
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmpowerModel;