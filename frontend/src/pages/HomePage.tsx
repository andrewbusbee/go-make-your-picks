import { useEffect, useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LeaderboardTable from '../components/LeaderboardTable';
import CumulativeGraph from '../components/CumulativeGraph';
import api from '../utils/api';
import {
  pageContainerClasses,
  labelClasses,
  selectClasses,
  cardClasses,
  headingClasses,
  bodyTextClasses
} from '../styles/commonClasses';

export default function HomePage() {
  const [allSeasons, setAllSeasons] = useState<any[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<any>(null);
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
  const [leaderboardData, setLeaderboardData] = useState<any>(null);
  const [graphData, setGraphData] = useState<any[]>([]);
  const [winners, setWinners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [appTitle, setAppTitle] = useState('Go Make Your Picks');

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

  useEffect(() => {
    if (selectedSeasonId && allSeasons.length > 0) {
      const season = allSeasons.find(s => s.id === selectedSeasonId);
      setSelectedSeason(season);
      loadLeaderboard(selectedSeasonId);
      loadGraphData(selectedSeasonId);
      if (season?.ended_at) {
        loadWinners(selectedSeasonId);
      } else {
        setWinners([]);
      }
    }
  }, [selectedSeasonId, allSeasons]);

  const loadSettings = async () => {
    try {
      const res = await api.get('/public/settings');
      setAppTitle(res.data.app_title || 'Go Make Your Picks');
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
                  className={`${selectClasses} mt-1 block w-full md:w-64`}
                  disabled={allSeasons.length === 1}
                >
                  {allSeasons.map(season => (
                    <option key={season.id} value={season.id}>
                      {season.name} {season.is_default ? '(Default)' : ''} {season.is_active ? '' : '(Inactive)'}
                    </option>
                  ))}
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

            {winners.length > 0 && (
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
                    <div className="flex justify-center items-end gap-4 mb-4">
                      {/* 2nd Place - Silver, Left side */}
                      {secondPlace.length > 0 && (
                        <div className="flex flex-col items-center w-32">
                          <span className="text-5xl mb-2">🥈</span>
                          <div className="bg-gradient-to-b from-gray-300 to-gray-500 dark:from-gray-400 dark:to-gray-600 rounded-lg p-4 w-full text-center h-28 flex flex-col justify-center shadow-lg">
                            {secondPlace.length === 1 ? (
                              <>
                                <p className="font-bold text-white text-lg">
                                  {secondPlace[0].user_name}
                                </p>
                                <p className="text-3xl font-bold text-white mt-2">
                                  {secondPlace[0].total_points}
                                </p>
                                <p className="text-xs text-gray-100">points</p>
                              </>
                            ) : (
                              <>
                                <p className="font-bold text-white text-lg">
                                  {secondPlace.map((w: any) => w.user_name).join(' & ')}
                                </p>
                                <p className="text-lg font-bold text-white mt-2">
                                  Tie
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 1st Place - Gold, Center */}
                      {firstPlace.length > 0 && (
                        <div className="flex flex-col items-center w-36">
                          <span className="text-6xl mb-2">🥇</span>
                          <div className="bg-gradient-to-b from-yellow-400 to-yellow-600 dark:from-yellow-500 dark:to-yellow-700 rounded-lg p-4 w-full text-center h-40 flex flex-col justify-center shadow-xl">
                            {firstPlace.length === 1 ? (
                              <>
                                <p className="font-bold text-gray-900 text-xl">
                                  {firstPlace[0].user_name}
                                </p>
                                <p className="text-4xl font-bold text-gray-900 mt-2">
                                  {firstPlace[0].total_points}
                                </p>
                                <p className="text-sm text-gray-800">points</p>
                              </>
                            ) : (
                              <>
                                <p className="font-bold text-gray-900 text-xl">
                                  {firstPlace.map((w: any) => w.user_name).join(' & ')}
                                </p>
                                <p className="text-2xl font-bold text-gray-900 mt-2">
                                  Tie
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 3rd Place - Bronze, Right side */}
                      {thirdPlace.length > 0 && (
                        <div className="flex flex-col items-center w-32">
                          <span className="text-5xl mb-2">🥉</span>
                          <div className="bg-gradient-to-b from-orange-400 to-orange-600 dark:from-orange-500 dark:to-orange-700 rounded-lg p-4 w-full text-center h-28 flex flex-col justify-center shadow-lg">
                            {thirdPlace.length === 1 ? (
                              <>
                                <p className="font-bold text-white text-lg">
                                  {thirdPlace[0].user_name}
                                </p>
                                <p className="text-3xl font-bold text-white mt-2">
                                  {thirdPlace[0].total_points}
                                </p>
                                <p className="text-xs text-orange-100">points</p>
                              </>
                            ) : (
                              <>
                                <p className="font-bold text-white text-lg">
                                  {thirdPlace.map((w: any) => w.user_name).join(' & ')}
                                </p>
                                <p className="text-lg font-bold text-white mt-2">
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
              </div>
            )}
          </div>
            )}

            {/* Data sections */}
            <div className="space-y-8">
              {/* Cumulative Graph */}
              <CumulativeGraph data={graphData} />

              {/* Leaderboard Table */}
              <div>
                <h2 className={`${headingClasses} mb-4`}>Leaderboard</h2>
                <LeaderboardTable 
                  rounds={leaderboardData.rounds}
                  leaderboard={leaderboardData.leaderboard}
                />
              </div>
            </div>
          </>
        )}
      </div>
      
      <Footer />
    </div>
  );
}
