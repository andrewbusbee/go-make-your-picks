import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  cardClasses, 
  bodyTextClasses, 
  subheadingClasses,
  flexWrapGapClasses,
  flexItemsGap1Classes,
  textSmallClasses,
  textMediumClasses,
  mb4Classes,
  overflowXAutoClasses,
  overflowYAutoClasses
} from '../styles/commonClasses';
import { useState, useRef, useEffect, memo } from 'react';

interface GraphData {
  userId: number;
  userName: string;
  points: {
    roundId: number;
    roundName: string;
    points: number;
  }[];
}

interface CumulativeGraphProps {
  data: GraphData[];
}

const COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
];

// Custom component for horizontal legend at the top
function HorizontalLegend({ data }: { data: GraphData[] }) {
  if (!data || data.length === 0) return null;

  return (
    <div className={`${flexWrapGapClasses} justify-center ${mb4Classes} px-2`}>
      {data.map((user, index) => {
        const color = COLORS[index % COLORS.length];
        return (
          <div key={user.userId} className={flexItemsGap1Classes}>
            <div 
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: color }}
            />
            <span 
              className={`${textSmallClasses} ${textMediumClasses} whitespace-nowrap`}
              style={{ color }}
            >
              {user.userName}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Custom tooltip component that sorts players by score
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  // Sort payload by value (score) in descending order
  const sortedPayload = [...payload].sort((a, b) => b.value - a.value);

  return (
    <div
      style={{
        backgroundColor: 'var(--tooltip-bg)',
        border: '1px solid var(--tooltip-border)',
        borderRadius: '6px',
        padding: '10px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
      }}
    >
      <p
        style={{
          margin: '0 0 8px 0',
          fontWeight: 600,
          color: 'var(--tooltip-text)',
          fontSize: '13px'
        }}
      >
        Round: {label}
      </p>
      {sortedPayload.map((entry: any, index: number) => (
        <div
          key={`item-${index}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: index < sortedPayload.length - 1 ? '4px' : '0'
          }}
        >
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: entry.color,
              flexShrink: 0
            }}
          />
          <span
            style={{
              color: 'var(--tooltip-text)',
              fontSize: '12px',
              fontWeight: 500
            }}
          >
            {entry.name}: {Math.round(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// Custom tick component with truncation and tooltip
function CustomXAxisTick({ x, y, payload }: any) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640); // sm breakpoint
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const fullText = payload.value || '';
  const maxLength = isMobile ? 10 : 10;
  const displayText = fullText.length > maxLength 
    ? fullText.substring(0, maxLength) + '...' 
    : fullText;
  const isTruncated = fullText.length > maxLength;

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={16}
        textAnchor="end"
        fill="#888"
        fontSize={12}
        style={{ cursor: isTruncated ? 'help' : 'default' }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {displayText}
      </text>
      {showTooltip && isTruncated && (
        <g>
          <rect
            x={-50}
            y={-35}
            width={Math.min(fullText.length * 8 + 20, 200)}
            height={25}
            fill="rgba(0, 0, 0, 0.9)"
            rx={4}
            stroke="rgba(255, 255, 255, 0.2)"
            strokeWidth={1}
          />
          <text
            x={-45}
            y={-18}
            fill="white"
            fontSize={11}
            textAnchor="start"
            style={{ fontFamily: 'monospace' }}
          >
            {fullText}
          </text>
        </g>
      )}
    </g>
  );
}

const CumulativeGraph = memo(function CumulativeGraph({ data }: CumulativeGraphProps) {
  const [isMobile, setIsMobile] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640); // sm breakpoint
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Validate data structure
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className={`${cardClasses} shadow-lg text-center`}>
        <p className={bodyTextClasses}>No completed sports yet. Graph will appear once the first sport is completed.</p>
      </div>
    );
  }

  // Check if any user has points data
  const hasValidData = data.some(user => user.points && Array.isArray(user.points) && user.points.length > 0);
  
  if (!hasValidData) {
    return (
      <div className={`${cardClasses} shadow-lg text-center`}>
        <p className={bodyTextClasses}>No completed sports yet. Graph will appear once the first sport is completed.</p>
      </div>
    );
  }

  // Ensure all user data starts at 0 by prepending a Start point if not present
  const normalizedData = data.map(user => {
    // Validate user data structure
    if (!user.points || !Array.isArray(user.points)) {
      return {
        ...user,
        points: [{ roundId: 0, roundName: 'Start', points: 0 }]
      };
    }

    const hasStartPoint = user.points.length > 0 && 
                          user.points[0].roundName === 'Start' && 
                          user.points[0].points === 0;
    
    if (!hasStartPoint) {
      return {
        ...user,
        points: [{ roundId: 0, roundName: 'Start', points: 0 }, ...user.points]
      };
    }
    
    return user;
  });

  // Transform data for recharts - with error handling
  let chartData: any[] = [];
  try {
    if (normalizedData.length > 0 && normalizedData[0].points && normalizedData[0].points.length > 0) {
      chartData = normalizedData[0].points.map((_, index) => {
        const point: any = {
          round: normalizedData[0].points[index].roundName,
        };
        
        normalizedData.forEach(user => {
          if (user.points && user.points[index]) {
            point[user.userName] = user.points[index].points || 0;
          } else {
            point[user.userName] = 0;
          }
        });
        
        return point;
      });
    }
  } catch (error) {
    console.error('Error transforming chart data:', error);
    return (
      <div className={`${cardClasses} shadow-lg text-center`}>
        <p className={bodyTextClasses}>Error loading graph data. Please try again.</p>
      </div>
    );
  }

  // Auto-scroll to the right when data changes
  useEffect(() => {
    if (scrollContainerRef.current && data && data.length > 0 && data[0].points.length > 0) {
      // Small delay to ensure the chart is rendered
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
        }
      }, 100);
    }
  }, [data]);

  // Chart margins - adjust based on mobile (no x-axis labels on mobile)
  const margin = isMobile 
    ? { top: 20, right: 20, bottom: 20, left: 60 } 
    : { top: 20, right: 20, bottom: 30, left: 60 };

  return (
    <div className={`${cardClasses} shadow-lg`}>
      <h2 className={`${subheadingClasses} mb-4`}>Cumulative Points</h2>
      
      {/* Horizontal legend below the heading - hidden on mobile */}
      <div className="hidden sm:block">
        <HorizontalLegend data={normalizedData} />
      </div>
      
      <div className="relative">
        <div 
          ref={scrollContainerRef}
          className={`${overflowXAutoClasses} ${overflowYAutoClasses} h-[300px] sm:h-80 md:h-96`}
          style={{ scrollbarWidth: 'thin', WebkitOverflowScrolling: 'touch' }}
        >
          <div className="min-w-[800px] sm:min-w-[600px] h-full">
            <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={margin}>
            <CartesianGrid strokeDasharray="3 3" className="dark:stroke-gray-700" />
            <XAxis 
              dataKey="round" 
              height={isMobile ? 0 : 100}
              stroke="#888"
              tick={isMobile ? false : <CustomXAxisTick />}
              hide={isMobile}
              interval={0}
              angle={-45}
              textAnchor="end"
            />
            <YAxis 
              domain={[0, 'dataMax']}
              tickFormatter={(value) => Math.round(value).toString()}
              allowDecimals={false}
              stroke="#888"
            />
            <Tooltip content={<CustomTooltip />} />
            {normalizedData.map((user, index) => (
              <Line
                key={user.userId}
                type="monotone"
                dataKey={user.userName}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
          </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
});

export default CumulativeGraph;
