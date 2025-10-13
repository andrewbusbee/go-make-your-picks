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
  championsHeaderInfoClasses,
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
  championsEmptyStateIconClasses
} from '../styles/commonClasses';

interface Champion {
  season_id: number;
  season_name: string;
  year_start: number;
  year_end: number;
  commissioner: string | null;
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

  // Update page meta tags
  usePageMeta({
    title: 'Hall of Fame',
    description: 'Hall of Fame - Past Season Champions'
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

  const { champions, appTitle, appTagline, currentCommissioner, yearsActive } = championsData;

  return (
    <div className={`${pageContainerClasses} pb-20`}>
      <Header />
      
      <div className={championsPageContainerClasses}>
        {/* Page Title */}
        <h1 className={championsWallTitleClasses}>
          🏆 HALL OF FAME 🏆
        </h1>

        {/* Large Header Plate */}
        <div className={championsHeaderPlateContainerClasses}>
          <div className={championsHeaderPlateClasses}>
            {/* Brass sheen effect */}
            <div className={brassPlateSheenClasses}></div>
            
            <div className="relative z-10">
              <h2 className={championsHeaderTitleClasses}>
                {appTitle}
              </h2>
              
              <p className={championsHeaderTaglineClasses}>
                "{appTagline}"
              </p>
              
              <div className={championsHeaderInfoClasses}>
                {currentCommissioner && (
                  <p>
                    <strong>Commissioner:</strong> {currentCommissioner}
                  </p>
                )}
                {yearsActive && (
                  <p>
                    <strong>Active:</strong> {yearsActive.first} - {yearsActive.last}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Champions Grid */}
        {champions.length > 0 ? (
          <div className={championsGridClasses}>
            {champions.map((champion) => (
              <div key={`${champion.season_id}-${champion.user_name}`} className={championPlateClasses}>
                {/* Brass sheen effect */}
                <div className={brassPlateSheenClasses}></div>
                
                <div className="relative z-10">
                  <div className={championNameClasses}>
                    {champion.user_name}
                  </div>
                  <div className={championYearClasses}>
                    {champion.year_start === champion.year_end 
                      ? champion.year_start 
                      : `${champion.year_start}-${champion.year_end}`
                    }
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={championsEmptyStateClasses}>
            <div className={championsEmptyStateIconClasses}>🏆</div>
            <div className={championsEmptyStateTextClasses}>
              No inductees yet. Complete a season to see champions in the Hall of Fame!
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
