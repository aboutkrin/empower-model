import React, { useState, useEffect } from 'react';
import { Parameters, FixedCost, VariableCost, Loan } from './types/parameters';

interface ModelParametersModalProps {
  isOpen: boolean;
  onClose: () => void;
  modelData: Parameters['modelData'];
  setModelData: React.Dispatch<React.SetStateAction<Parameters['modelData']>>;
  yearConfig: Parameters['yearConfig'];
  setYearConfig: React.Dispatch<React.SetStateAction<Parameters['yearConfig']>>;
  capacityUsage: number;
  setCapacityUsage: React.Dispatch<React.SetStateAction<number>>;
  capacityGrowth: number;
  setCapacityGrowth: React.Dispatch<React.SetStateAction<number>>;
  priceTiers: Parameters['priceTiers'];
  setPriceTiers: React.Dispatch<React.SetStateAction<Parameters['priceTiers']>>;
  priceGrowth: number;
  setPriceGrowth: React.Dispatch<React.SetStateAction<number>>;
  fixedCosts: FixedCost[];
  setFixedCosts: React.Dispatch<React.SetStateAction<FixedCost[]>>;
  variableCosts: VariableCost[];
  setVariableCosts: React.Dispatch<React.SetStateAction<VariableCost[]>>;
  loans: Loan[];
  setLoans: React.Dispatch<React.SetStateAction<Loan[]>>;
  durationInput: string;
  setDurationInput: React.Dispatch<React.SetStateAction<string>>;
  handleDurationChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  updateYearRange: (startYear: number, duration: number) => void;
  formatInputNumber: (value: string) => string;
  parseFormattedNumber: (str: string) => number;
  formatNumber: (num: number) => string;
  yieldLoss: number;
  setYieldLoss: React.Dispatch<React.SetStateAction<number>>;
}

const ModelParametersModal: React.FC<ModelParametersModalProps> = ({
  isOpen, onClose,
  modelData, setModelData,
  yearConfig, setYearConfig,
  capacityUsage, setCapacityUsage,
  capacityGrowth, setCapacityGrowth,
  priceTiers, setPriceTiers,
  priceGrowth, setPriceGrowth,
  fixedCosts, setFixedCosts,
  variableCosts, setVariableCosts,
  loans, setLoans,
  durationInput, setDurationInput,
  handleDurationChange, updateYearRange,
  formatInputNumber, parseFormattedNumber, formatNumber,
  yieldLoss, setYieldLoss
}) => {
  const [useCustomGrowthRates, setUseCustomGrowthRates] = useState(false);
  const [customGrowthRates, setCustomGrowthRates] = useState<number[]>(() => Array(yearConfig.duration).fill(capacityGrowth));
  const [useCustomMonthlyVolumes, setUseCustomMonthlyVolumes] = useState(false);
  const [customMonthlyVolumes, setCustomMonthlyVolumes] = useState<number[]>(() => Array(yearConfig.duration).fill(modelData.capacity * (capacityUsage / 100)));

  // Keep customGrowthRates in sync with duration
  useEffect(() => {
    setCustomGrowthRates((prev) => {
      if (yearConfig.duration > prev.length) {
        return [...prev, ...Array(yearConfig.duration - prev.length).fill(capacityGrowth)];
      } else if (yearConfig.duration < prev.length) {
        return prev.slice(0, yearConfig.duration);
      }
      return prev;
    });
    setCustomMonthlyVolumes((prev) => {
      if (yearConfig.duration > prev.length) {
        return [...prev, ...Array(yearConfig.duration - prev.length).fill(modelData.capacity * (capacityUsage / 100))];
      } else if (yearConfig.duration < prev.length) {
        return prev.slice(0, yearConfig.duration);
      }
      return prev;
    });
  }, [yearConfig.duration, capacityGrowth, modelData.capacity, capacityUsage]);

  // If switching from custom to single, update capacityGrowth to match first custom value
  useEffect(() => {
    if (!useCustomGrowthRates && customGrowthRates.length > 0) {
      setCapacityGrowth(customGrowthRates[0]);
    }
  }, [useCustomGrowthRates]);

  // If switching from single to custom, fill customGrowthRates with the single value
  useEffect(() => {
    if (useCustomGrowthRates) {
      setCustomGrowthRates(Array(yearConfig.duration).fill(capacityGrowth));
    }
    // eslint-disable-next-line
  }, [useCustomGrowthRates, yearConfig.duration]);

  // If switching to custom monthly volumes, fill with current calculated values
  useEffect(() => {
    if (useCustomMonthlyVolumes) {
      setCustomMonthlyVolumes(Array.from({ length: yearConfig.duration }, (_, index) => {
        let yearlyCapacityUsage = capacityUsage;
        if (useCustomGrowthRates) {
          for (let y = 0; y < index; y++) {
            yearlyCapacityUsage *= 1 + (customGrowthRates[y] || 0) / 100;
          }
        } else {
          yearlyCapacityUsage = capacityUsage * Math.pow(1 + capacityGrowth / 100, index);
        }
        yearlyCapacityUsage = Math.min(yearlyCapacityUsage, 100);
        return modelData.capacity * (yearlyCapacityUsage / 100);
      }));
    }
    // eslint-disable-next-line
  }, [useCustomMonthlyVolumes, yearConfig.duration, capacityUsage, capacityGrowth, useCustomGrowthRates, customGrowthRates, modelData.capacity]);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 relative overflow-y-auto max-h-[90vh]">
        <button className="absolute top-4 right-4 text-gray-500 hover:text-gray-700" onClick={onClose}>&times;</button>
        <h2 className="text-2xl font-bold mb-6">Model Parameters</h2>
        {/* Capacity Configuration */}
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 mb-4">
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
                disabled={useCustomMonthlyVolumes}
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
                disabled={useCustomMonthlyVolumes}
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
                  disabled={useCustomMonthlyVolumes}
                />
                <span className="text-sm font-medium text-gray-900">%</span>
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {yearConfig.startYear} Volume: {formatNumber(modelData.capacity * (capacityUsage / 100))} tons/month
            </div>
          </div>
          {/* Custom Monthly Volume Toggle */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Monthly Volume Mode
            </label>
            <div className="flex items-center gap-4 mb-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={!useCustomMonthlyVolumes}
                  onChange={() => setUseCustomMonthlyVolumes(false)}
                />
                <span>Auto-calculate monthly volume</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={useCustomMonthlyVolumes}
                  onChange={() => setUseCustomMonthlyVolumes(true)}
                />
                <span>Set monthly volume for each year</span>
              </label>
            </div>
            {useCustomMonthlyVolumes && (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border mt-2">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="py-1 px-2 text-left">Year</th>
                      <th className="py-1 px-2 text-right">Monthly Volume (tons)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: yearConfig.duration }, (_, i) => yearConfig.startYear + i).map((year, idx) => (
                      <tr key={year} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="py-1 px-2">{year}</td>
                        <td className="py-1 px-2 text-right">
                          <input
                            type="number"
                            min="0"
                            value={customMonthlyVolumes[idx] || 0}
                            onChange={e => {
                              const newVolumes = [...customMonthlyVolumes];
                              newVolumes[idx] = parseFloat(e.target.value);
                              setCustomMonthlyVolumes(newVolumes);
                            }}
                            className="input w-28 text-right"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {/* Growth Rate Toggle */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Capacity Growth Rate
            </label>
            <div className="flex items-center gap-4 mb-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={!useCustomGrowthRates}
                  onChange={() => setUseCustomGrowthRates(false)}
                  disabled={useCustomMonthlyVolumes}
                />
                <span>Annual Capacity Growth Rate</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={useCustomGrowthRates}
                  onChange={() => setUseCustomGrowthRates(true)}
                  disabled={useCustomMonthlyVolumes}
                />
                <span>Set growth rate for each year</span>
              </label>
            </div>
            {!useCustomGrowthRates ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={capacityGrowth}
                  onChange={(e) => setCapacityGrowth(parseFloat(e.target.value))}
                  className="input text-right"
                  disabled={useCustomMonthlyVolumes}
                />
                <span className="text-sm text-gray-500">% per year</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border mt-2">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="py-1 px-2 text-left">Year</th>
                      <th className="py-1 px-2 text-right">Growth Rate (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: yearConfig.duration }, (_, i) => yearConfig.startYear + i).map((year, idx) => (
                      <tr key={year} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="py-1 px-2">{year}</td>
                        <td className="py-1 px-2 text-right">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={customGrowthRates[idx] || 0}
                            onChange={e => {
                              const newRates = [...customGrowthRates];
                              newRates[idx] = parseFloat(e.target.value);
                              setCustomGrowthRates(newRates);
                            }}
                            className="input w-20 text-right"
                            disabled={useCustomMonthlyVolumes}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
                  className="input text-right"
                  min="1"
                  max="50"
                  step="1"
                />
              </div>
            </div>
          </div>
          {/* Yield Loss */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Yield Loss (%)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={yieldLoss}
                onChange={(e) => setYieldLoss(parseFloat(e.target.value))}
                className="input text-right"
                min="0"
                max="100"
                step="0.1"
              />
              <span className="text-sm text-gray-500">%</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Percentage of material lost during production
            </p>
          </div>
        </div>
        {/* Projected Capacity Table */}
        <div className="mt-4 mb-4">
          <h4 className="text-sm font-medium text-gray-600 mb-2">Projected Capacity Usage</h4>
          <div className="bg-white rounded border border-gray-200 overflow-x-auto max-h-64">
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
                {Array.from({ length: yearConfig.duration }, (_, i) => yearConfig.startYear + i).map((year, index) => {
                  let yearlyCapacityUsage = capacityUsage;
                  let monthlyVolume = 0;
                  if (useCustomMonthlyVolumes) {
                    monthlyVolume = customMonthlyVolumes[index] || 0;
                    yearlyCapacityUsage = modelData.capacity > 0 ? Math.min((monthlyVolume / modelData.capacity) * 100, 100) : 0;
                  } else if (useCustomGrowthRates) {
                    for (let y = 0; y < index; y++) {
                      yearlyCapacityUsage *= 1 + (customGrowthRates[y] || 0) / 100;
                    }
                    yearlyCapacityUsage = Math.min(yearlyCapacityUsage, 100);
                    monthlyVolume = modelData.capacity * (yearlyCapacityUsage / 100);
                  } else {
                    yearlyCapacityUsage = capacityUsage * Math.pow(1 + capacityGrowth / 100, index);
                    yearlyCapacityUsage = Math.min(yearlyCapacityUsage, 100);
                    monthlyVolume = modelData.capacity * (yearlyCapacityUsage / 100);
                  }
                  const annualVolume = monthlyVolume * 12;
                  return (
                    <tr key={year} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="py-2 px-3 sticky left-0 font-medium" style={{ backgroundColor: index % 2 === 0 ? '#f9fafb' : '#ffffff' }}>{year}</td>
                      <td className="py-2 px-3 text-right">{formatNumber(yearlyCapacityUsage)}%</td>
                      <td className="py-2 px-3 text-right">{formatNumber(monthlyVolume)}</td>
                      <td className="py-2 px-3 text-right">{formatNumber(annualVolume)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        {/* Product Tiers */}
        <div className="mb-4">
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
                <span className={priceTiers.reduce((sum, tier) => sum + tier.percentage, 0) > 100 ? "text-red-600 font-bold" : "text-green-700 font-semibold"}>
                  {priceTiers.reduce((sum, tier) => sum + tier.percentage, 0)}%
                </span>
                {priceTiers.reduce((sum, tier) => sum + tier.percentage, 0) > 100 && (
                  <span className="ml-2 text-xs text-red-500 font-semibold">
                    (Should not exceed 100%)
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>
        {/* Price Growth */}
        <div className="mb-4">
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
    </div>
  );
};

export default ModelParametersModal; 