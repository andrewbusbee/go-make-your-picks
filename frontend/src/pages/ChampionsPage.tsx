import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import api from '../utils/api';
import { usePageMeta } from '../utils/usePageMeta';
import {
  pageContainerClasses,
  championsWallTitleClasses,
  championsHeaderPlateClasses,
  brassPlateSheenClasses,
  championsHeaderTitleClasses,
  championsHeaderTaglineClasses,
  championPlateClasses,
  championNameClasses,
  championYearClasses,
  championsGridClasses,
  championsEmptyStateClasses,
  championsEmptyStateTextClasses,
  championsButtonClasses,
  championsPageContainerClasses,
  championsHeaderPlateContainerClasses,
  championsLoadingContainerClasses,
  championsLoadingTextClasses,
  championsErrorTextClasses,
  championsTryAgainButtonClasses,
  championsNoDataTextClasses,
  championsEmptyStateIconClasses,
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
  championshipPageTitle: string;
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

  // Update page meta tags
  usePageMeta({
    title: championsData?.championshipPageTitle || 'Hall of Fame',
    description: `${championsData?.championshipPageTitle || 'Hall of Fame'} - Past Season Champions`
  });

  useEffect(() => {
    loadChampionsData();
  }, []);

  const loadChampionsData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/public/seasons/champions');
      setChampionsData(res.data);
      setError(null);
    } catch (error) {
      console.error('Error loading champions data:', error);
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

  const { champions, appTitle, appTagline, championshipPageTitle, currentCommissioner, yearsActive } = championsData;

  return (
    <div className={`${pageContainerClasses} pb-20`}>
      <Header />
      
      <div className={championsPageContainerClasses}>
        {/* Page Title */}
        <h1 className={championsWallTitleClasses}>
          🏆 {championshipPageTitle?.toUpperCase() || 'HALL OF FAME'} 🏆
        </h1>

        {/* Large Header Plate */}
        <div className={championsHeaderPlateContainerClasses}>
          <div className={championsHeaderPlateClasses}>
            {/* Screws in four corners */}
            <div className="absolute inset-0 pointer-events-none z-30">
              <div className={screwTopLeftClasses}/>
              <div className={screwTopRightClasses}/>
              <div className={screwBottomLeftClasses}/>
              <div className={screwBottomRightClasses}/>
            </div>
            
            {/* Brass sheen effect - moved after screws */}
            <div className={brassPlateSheenClasses}></div>
            
            <div className="relative z-20 flex flex-col h-full justify-center">
              <div>
                <h2 className={championsHeaderTitleClasses}>
                  {appTitle}
                </h2>
                
                <p className={championsHeaderTaglineClasses}>
                  {appTagline}
                </p>
                {yearsActive && (
                  <p className="text-xl md:text-2xl text-black font-cormorant-sc engraved-text">
                    <strong>Established:</strong> {yearsActive.first}
                  </p>
                )}
              </div>
              
              <div className="mt-4">
                {currentCommissioner && (
                  <p className="text-xl md:text-2xl text-black font-cormorant-sc engraved-text">
                    <strong>Commissioner:</strong> {currentCommissioner}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Champions Grid */}
        {champions.length > 0 ? (
          <div className={championsGridClasses}>
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
              return Object.values(groupedChampions)
                .sort((a, b) => b.year_end - a.year_end)
                .map((group, groupIndex) => (
                  <div key={`${group.season_id}-${group.total_points}-${groupIndex}`} className={championPlateClasses}>
                    {/* Screws in four corners */}
                    <div className="absolute inset-0 pointer-events-none z-30">
                      <div className={screwTopLeftClasses}/>
                      <div className={screwTopRightClasses}/>
                      <div className={screwBottomLeftClasses}/>
                      <div className={screwBottomRightClasses}/>
                    </div>
                    
                    {/* Brass sheen effect - moved after screws */}
                    <div className={brassPlateSheenClasses}></div>
                    
                    <div className="relative z-20">
                      <div className={championNameClasses}>
                        {group.champions.map((name, nameIndex) => (
                          <div key={nameIndex}>{name}</div>
                        ))}
                      </div>
                      <div className={championYearClasses}>
                        {group.year_end}
                      </div>
                    </div>
                  </div>
                ));
            })()}
          </div>
        ) : (
          <div className={championsEmptyStateClasses}>
            <div className={championsEmptyStateIconClasses}>🏆</div>
            <div className={championsEmptyStateTextClasses}>
              No inductees yet. Complete a season to see champions in the {championshipPageTitle || 'Hall of Fame'}!
            </div>
            <Link to="/" className={championsButtonClasses}>
              View Current Season
            </Link>
          </div>
        )}
      </div>
      
      <Footer />
    </div>
  );
}
