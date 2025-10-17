import { useEffect, useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import api from '../utils/api';
import logger from '../utils/logger';
import { usePageMeta } from '../utils/usePageMeta';
import {
  pageContainerClasses,
  championsHeaderPlateClasses,
  brassPlateSheenClasses,
  championsHeaderTitleClasses,
  championsHeaderTaglineClasses,
  championPlateClasses,
  championNameClasses,
  championYearClasses,
  championsGridClasses,
  championsGridMobileClasses,
  emptyChampionPlateClasses,
  screwsContainerClasses,
  plateContentClasses,
  headerPlateContentClasses,
  headerPlateInfoTextClasses,
  headerPlateSpacingClasses,
  championsPageContainerClasses,
  championsHeaderPlateContainerClasses,
  championsLoadingContainerClasses,
  championsLoadingTextClasses,
  championsErrorTextClasses,
  championsTryAgainButtonClasses,
  championsNoDataTextClasses,
  screwTopLeftClasses,
  screwTopRightClasses,
  screwBottomLeftClasses,
  screwBottomRightClasses
} from '../styles/commonClasses';

interface Champion {
  season_id: number;
  season_name: string;
  year_start: number;
  year_end: number;
  ended_at: string;
  place: number;
  total_points: number;
  user_name: string;
}

interface ChampionsData {
  champions: Champion[];
  appTitle: string;
  appTagline: string;
  currentCommissioner: string | null;
  yearsActive: {
    first: number;
    last: number;
  } | null;
}

export default function ChampionsPage() {
  const [championsData, setChampionsData] = useState<ChampionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Update page meta tags
  usePageMeta({
    title: championsData ? `${championsData.appTitle} Champions!` : 'Champions!',
    description: championsData ? `${championsData.appTitle} - Past Season Champions` : 'Past Season Champions'
  });

  useEffect(() => {
    loadChampionsData();
  }, []);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const loadChampionsData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/public/seasons/champions');
      setChampionsData(res.data);
      setError(null);
    } catch (error) {
      logger.error('Error loading champions data:', error);
      setError('Failed to load champions data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`${pageContainerClasses} pb-20`}>
        <Header />
        <div className={championsLoadingContainerClasses}>
          <div className={championsLoadingTextClasses}>Loading Champions...</div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${pageContainerClasses} pb-20`}>
        <Header />
        <div className={championsLoadingContainerClasses}>
          <div className={championsErrorTextClasses}>
            <p>{error}</p>
            <button 
              onClick={loadChampionsData}
              className={championsTryAgainButtonClasses}
            >
              Try Again
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!championsData) {
    return (
      <div className={`${pageContainerClasses} pb-20`}>
        <Header />
        <div className={championsLoadingContainerClasses}>
          <div className={championsNoDataTextClasses}>No data available</div>
        </div>
        <Footer />
      </div>
    );
  }

  const { champions, appTitle, appTagline, currentCommissioner, yearsActive } = championsData;

  return (
    <div className={`${pageContainerClasses} pb-20`}>
      <Header />
      
      <div className={championsPageContainerClasses}>

        {/* Large Header Plate */}
        <div className={championsHeaderPlateContainerClasses}>
          <div className={championsHeaderPlateClasses}>
            {/* Screws in four corners */}
            <div className={screwsContainerClasses}>
              <div className={screwTopLeftClasses}/>
              <div className={screwTopRightClasses}/>
              <div className={screwBottomLeftClasses}/>
              <div className={screwBottomRightClasses}/>
            </div>
            
            {/* Brass sheen effect - moved after screws */}
            <div className={brassPlateSheenClasses}></div>
            
            <div className={headerPlateContentClasses}>
              <div>
                <h2 className={championsHeaderTitleClasses}>
                  {appTitle}
                </h2>
                
                <p className={championsHeaderTaglineClasses}>
                  {appTagline}
                </p>
                {yearsActive && yearsActive.first && (
                  <p className={headerPlateInfoTextClasses}>
                    <strong>Established:</strong> {yearsActive.first}
                  </p>
                )}
              </div>
              
              <div className={headerPlateSpacingClasses}>
                {currentCommissioner && (
                  <p className={headerPlateInfoTextClasses}>
                    <strong>Commissioner:</strong> {currentCommissioner}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Champions Grid - Responsive Layout */}
        <div className={isMobile ? championsGridMobileClasses : championsGridClasses}>
          {(() => {
            // Group champions by season AND points to handle ties properly
            const groupedChampions = champions.reduce((acc, champion) => {
              // Group by season AND total points - only tie champions together
              const groupKey = `${champion.season_id}-${champion.year_start}-${champion.year_end}-${champion.total_points}`;
              if (!acc[groupKey]) {
                acc[groupKey] = {
                  season_id: champion.season_id,
                  year_start: champion.year_start,
                  year_end: champion.year_end,
                  total_points: champion.total_points,
                  ended_at: champion.ended_at,
                  champions: []
                };
              }
              acc[groupKey].champions.push(champion.user_name);
              return acc;
            }, {} as Record<string, { season_id: number; year_start: number; year_end: number; total_points: number; ended_at: string; champions: string[] }>);

            // Convert to array and sort by year_end (most recent first)
            const sortedChampions = Object.values(groupedChampions)
              .sort((a, b) => b.year_end - a.year_end);

            // Render champion plate component
            const renderChampionPlate = (champion: any, key: string) => (
              <div key={key} className={championPlateClasses}>
                {/* Screws in four corners */}
                <div className={screwsContainerClasses}>
                  <div className={screwTopLeftClasses}/>
                  <div className={screwTopRightClasses}/>
                  <div className={screwBottomLeftClasses}/>
                  <div className={screwBottomRightClasses}/>
                </div>
                
                {/* Brass sheen effect - moved after screws */}
                <div className={brassPlateSheenClasses}></div>
                
                <div className={plateContentClasses}>
                  <div className={championNameClasses}>
                    {champion.champions.map((name: string, nameIndex: number) => (
                      <div key={nameIndex}>{name}</div>
                    ))}
                  </div>
                  <div className={championYearClasses}>
                    {champion.year_end}
                  </div>
                </div>
              </div>
            );

            if (isMobile) {
              // Mobile: Only show champions, no empty plates
              return sortedChampions.map((champion) => 
                renderChampionPlate(champion, `champion-${champion.season_id}-${champion.total_points}`)
              );
            } else {
              // Desktop: Show full 4×6 grid with empty plates
              // Create array of 24 slots (4×6 grid)
              const gridSlots = Array.from({ length: 24 }, (_, index) => {
                const champion = sortedChampions[index];
                
                if (champion) {
                  return renderChampionPlate(champion, `champion-${champion.season_id}-${champion.total_points}`);
                } else {
                  // Empty plate
                  return (
                    <div key={`empty-${index}`} className={emptyChampionPlateClasses}>
                      {/* Screws in four corners */}
                      <div className={screwsContainerClasses}>
                        <div className={screwTopLeftClasses}/>
                        <div className={screwTopRightClasses}/>
                        <div className={screwBottomLeftClasses}/>
                        <div className={screwBottomRightClasses}/>
                      </div>
                      
                      {/* Brass sheen effect - moved after screws */}
                      <div className={brassPlateSheenClasses}></div>
                    </div>
                  );
                }
              });

              // Add overflow champions (after 24) as individual plates
              const overflowChampions = sortedChampions.slice(24).map((champion) => 
                renderChampionPlate(champion, `overflow-${champion.season_id}-${champion.total_points}`)
              );

              return [...gridSlots, ...overflowChampions];
            }
          })()}
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
