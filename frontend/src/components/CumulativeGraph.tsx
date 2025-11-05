import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import logger from '../utils/logger';
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
  overflowYAutoClasses,
  buttonSecondaryClasses
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
function HorizontalLegend({ 
  data, 
  highlightedUserId, 
  onUserClick,
  originalData
}: { 
  data: GraphData[];
  highlightedUserId: number | null;
  onUserClick: (userId: number | null) => void;
  originalData: GraphData[];
}) {
  if (!data || data.length === 0) return null;

  return (
    <div className={`${flexWrapGapClasses} justify-center ${mb4Classes} px-2`}>
      {data.map((user) => {
        // Find original index in originalData to preserve color mapping
        const originalIndex = originalData.findIndex(u => u.userId === user.userId);
        const color = COLORS[originalIndex % COLORS.length];
        const isHighlighted = highlightedUserId === user.userId;
        // Only show grey if a player is highlighted AND this is not the highlighted player
        const displayColor = (highlightedUserId !== null && !isHighlighted) ? '#9ca3af' : color;
        
        return (
          <div 
            key={user.userId} 
            className={`${flexItemsGap1Classes} cursor-pointer hover:opacity-80 transition-opacity`}
            onClick={() => onUserClick(isHighlighted ? null : user.userId)}
            style={{ 
              opacity: highlightedUserId === null || isHighlighted ? 1 : 0.5 
            }}
          >
            <div 
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: displayColor }}
            />
            <span 
              className={`${textSmallClasses} ${textMediumClasses} whitespace-nowrap`}
              style={{ color: displayColor, fontWeight: isHighlighted ? 600 : 400 }}
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
  const [showTop5, setShowTop5] = useState(false);
  const [highlightedUserId, setHighlightedUserId] = useState<number | null>(null);
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

  // Calculate top 5 players by final score (last point in their points array)
  const getTop5Users = (users: GraphData[]): GraphData[] => {
    return [...users]
      .map(user => {
        const finalScore = user.points && user.points.length > 0 
          ? user.points[user.points.length - 1].points 
          : 0;
        return { ...user, finalScore };
      })
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, 5)
      .map(({ finalScore, ...user }) => user); // Remove finalScore from returned objects
  };

  // Filter data based on showTop5
  const displayData = showTop5 ? getTop5Users(normalizedData) : normalizedData;

  // Transform data for recharts - with error handling
  let chartData: any[] = [];
  try {
    if (displayData.length > 0 && displayData[0].points && displayData[0].points.length > 0) {
      chartData = displayData[0].points.map((_, index) => {
        const point: any = {
          round: displayData[0].points[index].roundName,
        };
        
        displayData.forEach(user => {
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
    logger.error('Error transforming chart data:', error);
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

  // Handle user click in legend
  const handleUserClick = (userId: number | null) => {
    setHighlightedUserId(userId);
  };

  // Handle reset colors
  const handleResetColors = () => {
    setHighlightedUserId(null);
  };

  return (
    <div className={`${cardClasses} shadow-lg`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className={`${subheadingClasses}`}>Cumulative Points</h2>
        <div className="flex gap-2">
          {highlightedUserId !== null && (
            <button
              onClick={handleResetColors}
              className={`${buttonSecondaryClasses} text-sm px-3 py-1.5`}
            >
              Reset colors
            </button>
          )}
          <button
            onClick={() => {
              setHighlightedUserId(null); // Reset colors when toggling view
              setShowTop5(!showTop5);
            }}
            className={`${buttonSecondaryClasses} text-sm px-3 py-1.5`}
          >
            {showTop5 ? 'Show all' : 'Show Top 5'}
          </button>
        </div>
      </div>
      
      {/* Horizontal legend below the heading - hidden on mobile */}
      <div className="hidden sm:block">
        <HorizontalLegend 
          data={displayData} 
          highlightedUserId={highlightedUserId}
          onUserClick={handleUserClick}
          originalData={normalizedData}
        />
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
            {(() => {
              // Sort displayData so highlighted user is rendered last (appears on top)
              const sortedData = [...displayData].sort((a, b) => {
                const aHighlighted = highlightedUserId === a.userId;
                const bHighlighted = highlightedUserId === b.userId;
                if (aHighlighted && !bHighlighted) return 1; // a comes after b
                if (!aHighlighted && bHighlighted) return -1; // a comes before b
                return 0; // maintain original order for non-highlighted
              });

              return sortedData.map((user) => {
                // Find original index in normalizedData to preserve color mapping
                const originalIndex = normalizedData.findIndex(u => u.userId === user.userId);
                const isHighlighted = highlightedUserId === user.userId;
                const shouldShowGrey = highlightedUserId !== null && !isHighlighted;
                const lineColor = shouldShowGrey ? '#9ca3af' : COLORS[originalIndex % COLORS.length];
                const lineWidth = isHighlighted ? 4 : 2; // Thicker line when highlighted
                
                return (
                  <Line
                    key={user.userId}
                    type="monotone"
                    dataKey={user.userName}
                    stroke={lineColor}
                    strokeWidth={lineWidth}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                );
              });
            })()}
          </LineChart>
          </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
});

export default CumulativeGraph;
