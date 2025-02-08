'use client';

import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
} from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LabelList,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Label,
} from 'recharts';

/** Helper to format numbers in thousands (e.g., 200 → "$200K") */
const formatThousands = (num: number): string => {
  return `$${num.toFixed(0)}K`;
};

/** Custom type for Y-Axis ticks */
interface CustomTickProps {
  x: number;
  y: number;
  payload: { value: string | number };
}

/** Render a tick label on the Y-axis */
const CustomYAxisTick = (props: CustomTickProps): React.ReactElement => {
  const { x, y, payload } = props;
  return (
    <text x={x} y={y} dy={16} textAnchor="end" fill="#666">
      {payload.value}
    </text>
  );
};

/**
 * ContractorProfitLabel is our custom label renderer for the contractor profit segment.
 *
 * We define it as a function (rather than a React.FC) so Recharts recognizes it
 * correctly as a label callback. We also optionally use a ref + useEffect to
 * re-append its <text> node to the end of its parent so it’s on top visually.
 */
function ContractorProfitLabel(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  value?: number;
}) {
  const { x, y, width, height, value } = props;
  const textRef = useRef<SVGTextElement>(null);

  // Bring this element to the front after it mounts.
  useEffect(() => {
    if (textRef.current && textRef.current.parentNode) {
      // Append it to the end of its parent’s children.
      textRef.current.parentNode.appendChild(textRef.current);
    }
  }, []);

  // If any required coordinate or value prop is missing, return an empty group so we don't crash.
  if (
    x === undefined ||
    y === undefined ||
    width === undefined ||
    height === undefined ||
    value === undefined
  ) {
    return <g />;
  }

  // For positive values, the “top” of the rectangle is at posY;
  // for negative values (which extend downward) we use posY + posHeight.
  const labelY = value < 0 ? y + height : y;
  const displayedValue = `${value >= 0 ? '+' : ''}${formatThousands(value)}`;

  return (
    <text
      ref={textRef}
      x={x + width / 2}
      y={labelY - 5}
      textAnchor="middle"
      fill="#000"
      style={{ pointerEvents: 'none' }}
    >
      {displayedValue}
    </text>
  );
}

/** Reusable Card component with a title */
type CardProps = {
  title: string;
  children: React.ReactNode;
  className?: string;
};

const Card: React.FC<CardProps> = ({ title, children, className = '' }) => (
  <div className={`border rounded p-4 bg-white ${className}`}>
    <h2 className="text-base font-semibold mb-2">{title}</h2>
    <div>{children}</div>
  </div>
);

/** Generic cost control (number input + slider) */
type CostControlProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
};

const CostControl: React.FC<CostControlProps> = ({
  label,
  value,
  onChange,
  min,
  max,
  step = 5,
}) => (
  <div className="flex flex-col space-y-1">
    <label className="text-sm font-medium">{label}</label>
    <div className="flex items-center space-x-2">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-16 border rounded p-1 text-center"
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1"
      />
    </div>
  </div>
);

/** Custom Sale Price Slider */
type SalePriceSliderProps = {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  baseCost: number;
};

const SalePriceSlider: React.FC<SalePriceSliderProps> = ({
  value,
  onChange,
  min,
  max,
  step = 1,
  baseCost,
}) => {
  const sliderRange = max - min;
  const salePricePercent = ((value - min) / sliderRange) * 100;
  const baseCostPercent = ((baseCost - min) / sliderRange) * 100;
  const profitPercentage = ((value - baseCost) / baseCost) * 100;

  return (
    <div className="flex items-center">
      {/* Sale Price display */}
      <div className="mr-4 text-md font-semibold text-slate-700">
        Sale Price: {formatThousands(value)}
      </div>
      <div className="relative flex-1">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full"
        />
        {/* Base Cost Marker */}
        <div
          style={{
            position: 'absolute',
            left: `${baseCostPercent}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="w-1 h-4 bg-red-500" />
        </div>
        {/* Profit Percentage Label */}
        <div
          style={{
            position: 'absolute',
            left: `${salePricePercent}%`,
            top: '-24px',
            transform: 'translate(-50%, 0)',
            whiteSpace: 'nowrap',
          }}
          className="text-sm font-medium text-gray-700"
        >
          {profitPercentage >= 0 ? '+' : ''}
          {profitPercentage.toFixed(0)}%
        </div>
      </div>
    </div>
  );
};

/** Calculation logic */
interface Metrics {
  investorProfit: number;
  contractorProfit: number;
  investorProfitPercent: number;
  contractorProfitPercent: number;
  totalBaseCost: number;
  investorRatio: string;
  contractorRatio: string;
}

const calculateMetrics = (
  price: number,
  acquisition: number,
  labor: number,
  material: number
): Metrics => {
  const totalBaseCost = acquisition + labor + material;
  const investorCosts = acquisition + material;
  const contractorCosts = labor;
  const investorRatio = investorCosts / totalBaseCost;
  const contractorRatio = contractorCosts / totalBaseCost;
  const margin = price - totalBaseCost;

  // Split the margin by the same ratio as each party's contribution
  const investorDistribution = investorCosts + investorRatio * margin;
  const contractorDistribution = contractorCosts + contractorRatio * margin;

  const investorProfit = investorDistribution - investorCosts;
  const contractorProfit = contractorDistribution - contractorCosts;

  return {
    investorProfit,
    contractorProfit,
    investorProfitPercent: (investorProfit / investorCosts) * 100,
    contractorProfitPercent: (contractorProfit / contractorCosts) * 100,
    totalBaseCost,
    investorRatio: (investorRatio * 100).toFixed(1),
    contractorRatio: (contractorRatio * 100).toFixed(1),
  };
};

const ProfitSharingDashboard: React.FC = () => {
  // All values are in "thousands"
  const [salePrice, setSalePrice] = useState<number>(200);
  const [acquisitionCost, setAcquisitionCost] = useState<number>(80);
  const [laborCost, setLaborCost] = useState<number>(40);
  const [materialCost, setMaterialCost] = useState<number>(40);

  // Compute metrics
  const metrics = calculateMetrics(
    salePrice,
    acquisitionCost,
    laborCost,
    materialCost
  );
  const totalBaseCost = metrics.totalBaseCost;

  // For Contractor: labor cost + contractor profit = total contractor revenue
  const contractorRevenue = laborCost + metrics.contractorProfit;

  // Investor capital at risk
  const investorCapitalAtRisk = acquisitionCost + materialCost;

  // If salePrice < totalBaseCost, there's a (negative) margin or 'loss'
  const totalLoss = salePrice - totalBaseCost;

  // Define slider range for sale price
  const salePriceMin = totalBaseCost * 0.8;
  const salePriceMax = totalBaseCost * 1.5;

  // Build trend data for the line chart
  const trendData = useMemo(() => {
    const totalCost = acquisitionCost + laborCost + materialCost;
    const minPrice = totalCost * 0.5;
    const maxPrice = totalCost * 2;
    const steps = 20;
    const stepSize = (maxPrice - minPrice) / steps;
    return Array.from({ length: steps + 1 }, (_, i) => {
      const price = minPrice + i * stepSize;
      const m = calculateMetrics(price, acquisitionCost, laborCost, materialCost);
      return {
        salePrice: price,
        investorProfit: m.investorProfit,
        contractorProfit: m.contractorProfit,
        investorProfitPercent: m.investorProfitPercent,
        contractorProfitPercent: m.contractorProfitPercent,
        contractorRevenue: laborCost + m.contractorProfit,
      };
    });
  }, [acquisitionCost, laborCost, materialCost]);

  // Combined data for the Current Profit Amount ($) chart.
  const combinedProfitData = [
    {
      name: 'Investor',
      investorProfit: metrics.investorProfit,
      contractorProfit: 0,
      laborCost: 0,
      contractorRevenue: 0,
    },
    {
      name: 'Contractor',
      investorProfit: 0,
      contractorProfit: metrics.contractorProfit,
      laborCost: laborCost,
      contractorRevenue: contractorRevenue,
    },
  ];

  // Data for the Current Profit Percentage (%) chart
  const percentageData = [
    { name: 'Investor', percentage: metrics.investorProfitPercent },
    { name: 'Contractor', percentage: metrics.contractorProfitPercent },
  ];

  return (
    <div className="p-8 space-y-4 bg-gray-50">
      {/* Controls Card */}
      <Card title="Price & Cost Controls">
        <div className="mb-4">
          <SalePriceSlider
            value={salePrice}
            onChange={setSalePrice}
            min={salePriceMin}
            max={salePriceMax}
            step={1}
            baseCost={totalBaseCost}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          <CostControl
            label="Acquisition Cost"
            value={acquisitionCost}
            onChange={setAcquisitionCost}
            min={10}
            max={120}
          />
          <CostControl
            label="Labor Cost"
            value={laborCost}
            onChange={setLaborCost}
            min={20}
            max={80}
          />
          <CostControl
            label="Material Cost"
            value={materialCost}
            onChange={setMaterialCost}
            min={20}
            max={80}
          />
        </div>
        <div className="mt-4 bg-blue-50 rounded p-2 flex flex-wrap items-center justify-around text-sm">
          <div>
            Total Base Cost:{' '}
            <span className="font-semibold">
              {formatThousands(totalBaseCost)}
            </span>
          </div>
          <div>
            Total Loss:{' '}
            <span className="font-semibold">
              {formatThousands(totalLoss)}
            </span>
          </div>
          <div>
            Contractor Revenue:{' '}
            <span className="font-semibold">
              {formatThousands(contractorRevenue)}
            </span>
          </div>
          <div>
            Contractor Share:{' '}
            <span className="font-semibold">
              {metrics.contractorRatio}%
            </span>
          </div>
          <div>
            Investor Share:{' '}
            <span className="font-semibold">
              {metrics.investorRatio}%
            </span>
          </div>
          <div>
            Investor Capital at Risk:{' '}
            <span className="font-semibold">
              {formatThousands(investorCapitalAtRisk)}
            </span>
          </div>
        </div>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Current Profit Amount ($) Chart */}
        <Card title="Current Profit Amount ($)">
          <ResponsiveContainer width="100%" aspect={1}>
            <BarChart
              data={combinedProfitData}
              margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis
                domain={[
                  (dataMin: number) => Math.min(0, dataMin),
                  (dataMax: number) => Math.max(0, dataMax),
                ]}
                tick={(tickProps) => <CustomYAxisTick {...tickProps} />}
              >
                <Label
                  value="Profit ($)"
                  angle={-90}
                  position="insideLeft"
                  style={{ textAnchor: 'middle' }}
                />
              </YAxis>
              <Tooltip formatter={(value: number) => formatThousands(value)} />

              {/* Investor Profit Bar – render its label only if nonzero */}
              <Bar dataKey="investorProfit" fill="#8884d8">
                <LabelList
                  dataKey="investorProfit"
                  position="top"
                  formatter={(value: number) =>
                    value === 0 ? '' : formatThousands(value)
                  }
                />
              </Bar>

              {/* Contractor Stacked Bars */}
              <Bar
                dataKey="contractorProfit"
                fill="#FF9933"
                stackId="contractor"
                label={ContractorProfitLabel}
              />
              <Bar
                dataKey="laborCost"
                fill="#82ca9d"
                stackId="contractor"
              >
                <LabelList
                  dataKey="contractorRevenue"
                  position="top"
                  formatter={(value: number) =>
                    value === 0 ? '' : formatThousands(value)
                  }
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Current Profit Percentage (%) Chart */}
        <Card title="Current Profit Percentage (%)">
          <ResponsiveContainer width="100%" aspect={1}>
            <BarChart
              data={percentageData}
              margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis
                tickFormatter={(value: number) => `${value}%`}
                domain={[0, 'auto']}
                tickCount={4}
              >
                <Label
                  value="Profit (%)"
                  angle={-90}
                  position="insideLeft"
                  style={{ textAnchor: 'middle' }}
                />
              </YAxis>
              <Tooltip formatter={(value: number) => `${value.toFixed(2)}%`} />
              <Bar dataKey="percentage" fill="#82ca9d">
                <LabelList
                  dataKey="percentage"
                  position="top"
                  formatter={(value: number) => `${value.toFixed(2)}%`}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Profit Trend by Sale Price ($) Chart */}
        <Card title="Profit Trend by Sale Price ($)">
          <ResponsiveContainer width="100%" aspect={1}>
            <LineChart
              data={trendData}
              margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="salePrice">
                <Label value="Sale Price ($)" offset={-5} position="insideBottom" />
              </XAxis>
              <YAxis>
                <Label
                  value="Profit ($)"
                  angle={-90}
                  position="insideLeft"
                  style={{ textAnchor: 'middle' }}
                />
              </YAxis>
              <Tooltip formatter={(value: number) => formatThousands(value)} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Line
                type="monotone"
                dataKey="investorProfit"
                name="Investor Profit"
                stroke="#8884d8"
              />
              <Line
                type="monotone"
                dataKey="contractorProfit"
                name="Contractor Profit"
                stroke="#FF9933"
              />
              <Line
                type="monotone"
                dataKey="contractorRevenue"
                name="Contractor Revenue"
                stroke="#82ca9d"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
};

export default ProfitSharingDashboard;
