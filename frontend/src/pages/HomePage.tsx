import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LeaderboardTable from '../components/LeaderboardTable';
import CumulativeGraph from '../components/CumulativeGraph';
import api from '../utils/api';
import { usePageMeta } from '../utils/usePageMeta';
import {
  pageContainerClasses,
  labelClasses,
  selectClasses,
  cardClasses,
  headingClasses,
  bodyTextClasses,
  championsButtonClasses
} from '../styles/commonClasses';

export default function HomePage() {
  const [allSeasons, setAllSeasons] = useState<any[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<any>(null);
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
  const [leaderboardData, setLeaderboardData] = useState<any>(null);
  const [graphData, setGraphData] = useState<any[]>([]);
  const [winners, setWinners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [seasonLoading, setSeasonLoading] = useState(false);
  const [appTitle, setAppTitle] = useState('Go Make Your Picks');
  const [appTagline, setAppTagline] = useState('Predict. Compete. Win.');
  const [championshipPageTitle, setChampionshipPageTitle] = useState('Hall of Fame');

  // Update page meta tags dynamically
  usePageMeta({
    title: appTitle,
    description: appTagline
  });

  useEffect(() => {
    loadSettings();
    loadSeasons();
    
    // Refresh data when user navigates back to this page
    const handleFocus = () => {
      loadSeasons();
    };
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadSeasons();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Ref to track current loading operation
  const loadingRef = useRef<number | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const loadSeasonData = useCallback(async (seasonId: number) => {
    // Cancel any existing loading operation
    if (loadingRef.current) {
      loadingRef.current = null;
    }
    
    const currentLoadId = Date.now();
    loadingRef.current = currentLoadId;
    
    setSeasonLoading(true);
    
    try {
      const season = allSeasons.find(s => s.id === seasonId);
      setSelectedSeason(season);
      
      // Clear data immediately when season changes to prevent stale data
      setWinners([]);
      setGraphData([]);
      setLeaderboardData(null);
      
      // Load new data sequentially to avoid race conditions
      await loadLeaderboard(seasonId);
      
      // Check if this is still the current load operation
      if (loadingRef.current !== currentLoadId) return;
      
      await loadGraphData(seasonId);
      
      // Check if this is still the current load operation
      if (loadingRef.current !== currentLoadId) return;
      
      if (season?.ended_at) {
        await loadWinners(seasonId);
      }
    } catch (error) {
      console.error('Error loading season data:', error);
    } finally {
      // Only update loading state if this is still the current operation
      if (loadingRef.current === currentLoadId) {
        setSeasonLoading(false);
        loadingRef.current = null;
      }
    }
  }, [allSeasons]);

  // Debounced season change handler
  const handleSeasonChange = useCallback((seasonId: number) => {
    // Clear any existing debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    // Set new debounced call
    debounceRef.current = setTimeout(() => {
      if (seasonId && allSeasons.length > 0) {
        loadSeasonData(seasonId);
      }
    }, 100); // 100ms debounce
  }, [allSeasons, loadSeasonData]);

  useEffect(() => {
    if (selectedSeasonId) {
      handleSeasonChange(selectedSeasonId);
    }
  }, [selectedSeasonId, handleSeasonChange]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const loadSettings = async () => {
    try {
      const res = await api.get('/public/settings');
      setAppTitle(res.data.app_title || 'Go Make Your Picks');
      setAppTagline(res.data.app_tagline || 'Predict. Compete. Win.');
      setChampionshipPageTitle(res.data.championship_page_title || 'Hall of Fame');
    } catch (error) {
      console.error('Error loading settings:', error);
      // Don't throw - just use default values
    }
  };

  const loadSeasons = async () => {
    try {
      const [defaultRes, allRes] = await Promise.all([
        api.get('/public/seasons/default').catch(() => ({ data: null })),
        api.get('/public/seasons').catch(() => ({ data: [] }))
      ]);
      
      setAllSeasons(allRes.data || []);
      
      if (defaultRes.data) {
        setSelectedSeasonId(defaultRes.data.id);
      } else if (allRes.data && allRes.data.length > 0) {
        setSelectedSeasonId(allRes.data[0].id);
      } else {
        // No seasons available - ensure we clear any previous data
        setSelectedSeasonId(null);
        setLeaderboardData(null);
        setGraphData([]);
        setWinners([]);
      }
    } catch (error) {
      console.error('Error loading seasons:', error);
      // On error, ensure we show the welcome screen
      setAllSeasons([]);
      setSelectedSeasonId(null);
      setLeaderboardData(null);
      setGraphData([]);
      setWinners([]);
    } finally {
      setLoading(false);
    }
  };

  const loadLeaderboard = async (seasonId: number) => {
    try {
      const res = await api.get(`/public/leaderboard/season/${seasonId}`);
      setLeaderboardData(res.data || null);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      setLeaderboardData(null);
    }
  };

  const loadGraphData = async (seasonId: number) => {
    try {
      const res = await api.get(`/public/leaderboard/season/${seasonId}/graph`);
      setGraphData(res.data || []);
    } catch (error) {
      console.error('Error loading graph data:', error);
      setGraphData([]);
    }
  };

  const loadWinners = async (seasonId: number) => {
    try {
      const res = await api.get(`/public/seasons/${seasonId}/winners`);
      setWinners(res.data || []);
    } catch (error) {
      console.error('Error loading winners:', error);
      setWinners([]);
    }
  };

  if (loading) {
    return (
      <div className={pageContainerClasses}>
        <Header />
        <div className="container mx-auto px-4 py-8 text-center">
          <p className={bodyTextClasses}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${pageContainerClasses} pb-20`}>
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Check if there's any data to display */}
        {allSeasons.length === 0 || !leaderboardData ? (
          <div className={`${cardClasses} shadow-lg text-center py-16`}>
            <span className="text-8xl mb-6 block">🏆</span>
            <h2 className={`${headingClasses} text-3xl mb-4`}>{appTitle}</h2>
            <p className={`${bodyTextClasses} text-lg mb-6`}>
              Welcome to the sports picks competition!
            </p>
            <p className={bodyTextClasses}>
              No seasons or data available yet.
            </p>
            <p className={`${bodyTextClasses} mt-2`}>
              Please contact an administrator to set up the first season and get started.
            </p>
          </div>
        ) : (
          <>
            {/* Season Selector */}
            {allSeasons.length > 0 && (
              <div className="mb-6">
                <label htmlFor="season-select" className={labelClasses}>
                  {allSeasons.length > 1 ? 'Select Season' : 'Current Season'}
                </label>
                <select
                  id="season-select"
                  value={selectedSeasonId || ''}
                  onChange={(e) => setSelectedSeasonId(Number(e.target.value))}
                  className={`${selectClasses} mt-1 block w-full md:w-80`}
                  disabled={allSeasons.length === 1}
                >
                  {([...allSeasons]
                    .sort((a, b) => {
                      // Default season first
                      if (a.is_default === 1 && b.is_default !== 1) return -1;
                      if (b.is_default === 1 && a.is_default !== 1) return 1;
                      
                      // Then sort by year_end (newest first)
                      const aEnd = a.year_end ? Number(a.year_end) : 0;
                      const bEnd = b.year_end ? Number(b.year_end) : 0;
                      return bEnd - aEnd;
                    })
                  ).map(season => {
                    const endYear = season.year_end
                      ? season.year_end
                      : (season.ended_at ? new Date(season.ended_at).getFullYear() : '');
                    const defaultLabel = season.is_default === 1 ? ' (Default)' : '';
                    const inactiveLabel = season.is_active ? '' : ' (Inactive)';
                    return (
                      <option key={season.id} value={season.id}>
                        {season.name}{endYear ? ` - ${endYear}` : ''}{defaultLabel}{inactiveLabel}
                      </option>
                    );
                  })}
                </select>
                
              </div>
            )}

            {/* Season Ended Banner & Podium */}
            {selectedSeason?.ended_at && (
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-800 dark:to-blue-800 rounded-lg shadow-lg p-8 mb-8">
            <div className="text-center text-white mb-6">
              <span className="text-5xl mb-2 block">🏆</span>
              <h2 className="text-3xl font-bold mb-2">Season Ended!</h2>
              <p className="text-purple-100">
                Ended on {new Date(selectedSeason.ended_at).toLocaleDateString()}
              </p>
            </div>

            {winners.length > 0 && winners[0]?.user_name && (
              <div className={cardClasses}>
                <h3 className={`${headingClasses} text-center mb-6`}>
                  Final Standings - Top 3
                </h3>
                
                {(() => {
                  // Group winners by place to handle ties
                  const groupedWinners = winners.reduce((acc: any, winner: any) => {
                    if (!acc[winner.place]) {
                      acc[winner.place] = [];
                    }
                    acc[winner.place].push(winner);
                    return acc;
                  }, {});

                  const firstPlace = groupedWinners[1] || [];
                  const secondPlace = groupedWinners[2] || [];
                  const thirdPlace = groupedWinners[3] || [];

                  return (
                    <div className="flex justify-center items-end gap-2 sm:gap-3 md:gap-4 mb-4">
                      {/* 2nd Place - Silver, Left side */}
                      {secondPlace.length > 0 && (
                        <div className="flex flex-col items-center w-28 sm:w-32 md:w-36">
                          <span className="text-4xl sm:text-5xl mb-2">🥈</span>
                          <div className="bg-gradient-to-b from-gray-300 to-gray-500 dark:from-gray-400 dark:to-gray-600 rounded-lg p-3 sm:p-4 w-full text-center min-h-24 sm:min-h-28 md:min-h-32 flex flex-col justify-center shadow-lg">
                            {secondPlace.length === 1 ? (
                              <>
                                <p className="font-bold text-white text-sm sm:text-base md:text-lg leading-tight break-words">
                                  {secondPlace[0].user_name}
                                </p>
                                <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mt-1 sm:mt-2">
                                  {secondPlace[0].total_points}
                                </p>
                                <p className="text-xs text-gray-100">points</p>
                              </>
                            ) : (
                              <>
                                <p className="font-bold text-white text-xs sm:text-sm md:text-base leading-tight break-words">
                                  {secondPlace.map((w: any) => w.user_name).join(' & ')}
                                </p>
                                <p className="text-sm sm:text-base md:text-lg font-bold text-white mt-1 sm:mt-2">
                                  Tie
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 1st Place - Gold, Center */}
                      {firstPlace.length > 0 && (
                        <div className="flex flex-col items-center w-32 sm:w-36 md:w-40">
                          <span className="text-5xl sm:text-6xl mb-2">🥇</span>
                          <div className="bg-gradient-to-b from-yellow-400 to-yellow-600 dark:from-yellow-500 dark:to-yellow-700 rounded-lg p-3 sm:p-4 w-full text-center min-h-28 sm:min-h-32 md:min-h-40 flex flex-col justify-center shadow-xl">
                            {firstPlace.length === 1 ? (
                              <>
                                <p className="font-bold text-gray-900 text-sm sm:text-lg md:text-xl leading-tight break-words">
                                  {firstPlace[0].user_name}
                                </p>
                                <p className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mt-1 sm:mt-2">
                                  {firstPlace[0].total_points}
                                </p>
                                <p className="text-xs sm:text-sm text-gray-800">points</p>
                              </>
                            ) : (
                              <>
                                <p className="font-bold text-gray-900 text-xs sm:text-base md:text-lg leading-tight break-words">
                                  {firstPlace.map((w: any) => w.user_name).join(' & ')}
                                </p>
                                <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mt-1 sm:mt-2">
                                  Tie
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 3rd Place - Bronze, Right side */}
                      {thirdPlace.length > 0 && (
                        <div className="flex flex-col items-center w-28 sm:w-32 md:w-36">
                          <span className="text-4xl sm:text-5xl mb-2">🥉</span>
                          <div className="bg-gradient-to-b from-orange-400 to-orange-600 dark:from-orange-500 dark:to-orange-700 rounded-lg p-3 sm:p-4 w-full text-center min-h-24 sm:min-h-28 md:min-h-32 flex flex-col justify-center shadow-lg">
                            {thirdPlace.length === 1 ? (
                              <>
                                <p className="font-bold text-white text-sm sm:text-base md:text-lg leading-tight break-words">
                                  {thirdPlace[0].user_name}
                                </p>
                                <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mt-1 sm:mt-2">
                                  {thirdPlace[0].total_points}
                                </p>
                                <p className="text-xs text-orange-100">points</p>
                              </>
                            ) : (
                              <>
                                <p className="font-bold text-white text-xs sm:text-sm md:text-base leading-tight break-words">
                                  {thirdPlace.map((w: any) => w.user_name).join(' & ')}
                                </p>
                                <p className="text-sm sm:text-base md:text-lg font-bold text-white mt-1 sm:mt-2">
                                  Tie
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                <p className={`${bodyTextClasses} text-center mt-4`}>
                  Full final standings available below
                </p>
                
                {/* Champions Button */}
                <div className="text-center mt-6">
                  <Link to="/champions" className={championsButtonClasses}>
                    🏆 {championshipPageTitle}
                  </Link>
                </div>
              </div>
            )}
          </div>
            )}

            {/* Data sections */}
            <div className="space-y-8">
              {/* Cumulative Graph - Always render with stable structure */}
              <div key={`graph-container-${selectedSeasonId}`}>
                {seasonLoading ? (
                  <div className={`${cardClasses} shadow-lg text-center`}>
                    <p className={bodyTextClasses}>Loading season data...</p>
                  </div>
                ) : (() => {
                  const hasCompletedRounds = leaderboardData?.rounds && leaderboardData.rounds.some((round: any) => round.status === 'completed');
                  
                  if (!hasCompletedRounds) {
                    return (
                      <div className={`${cardClasses} shadow-lg text-center`}>
                        <p className={bodyTextClasses}>No completed sports yet. Graph will appear once the first sport is completed.</p>
                      </div>
                    );
                  }

                  const allowedRoundIds = (leaderboardData.rounds || [])
                    .filter((r: any) => r.status === 'locked' || r.status === 'completed')
                    .map((r: any) => r.id);

                  const filteredGraphData = (graphData || []).map((user: any) => ({
                    ...user,
                    points: (user.points || []).filter((p: any) => allowedRoundIds.includes(p.roundId))
                  }));

                  return <CumulativeGraph key={`graph-${selectedSeasonId}`} data={filteredGraphData} />;
                })()}
              </div>

              {/* Leaderboard Table */}
              <div>
                <h2 className={`${headingClasses} mb-4`}>Leaderboard</h2>
                {seasonLoading ? (
                  <div className={`${cardClasses} shadow-lg text-center`}>
                    <p className={bodyTextClasses}>Loading leaderboard data...</p>
                  </div>
                ) : (() => {
                  const filteredRounds = (leaderboardData?.rounds || []).filter((r: any) => r.status === 'locked' || r.status === 'completed');
                  return (
                    <LeaderboardTable 
                      key={`leaderboard-${selectedSeasonId}`}
                      rounds={filteredRounds}
                      leaderboard={leaderboardData?.leaderboard || []}
                    />
                  );
                })()}
              </div>
            </div>
          </>
        )}
      </div>
      
      <Footer />
    </div>
  );
}
