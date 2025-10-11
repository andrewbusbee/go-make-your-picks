import { useEffect, useState } from 'react';
import api from '../../utils/api';
import {
  headingClasses,
  labelClasses,
  selectClasses,
  cardClasses,
  cardHeaderClasses,
  subheadingClasses,
  bodyTextClasses,
  tableBodyClasses,
  tableHeaderCellClasses,
  tableHeaderCellRightClasses,
  tableCellClasses,
  buttonCancelClasses
} from '../../styles/commonClasses';

export default function AdminPicksManagement() {
  const [seasons, setSeasons] = useState<any[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
  const [rounds, setRounds] = useState<any[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState<number | null>(null);
  const [roundDetails, setRoundDetails] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [picks, setPicks] = useState<any[]>([]);
  const [showPickModal, setShowPickModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [championPick, setChampionPick] = useState('');
  const [writeInPicks, setWriteInPicks] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSeasons();
  }, []);

  useEffect(() => {
    if (selectedSeasonId) {
      loadRounds(selectedSeasonId);
      loadParticipants(selectedSeasonId);
    }
  }, [selectedSeasonId]);

  useEffect(() => {
    if (selectedRoundId) {
      loadRoundDetails(selectedRoundId);
      loadPicks(selectedRoundId);
    }
  }, [selectedRoundId]);

  const loadSeasons = async () => {
    try {
      const res = await api.get('/admin/seasons');
      setSeasons(res.data);
      if (res.data.length > 0) {
        const defaultSeason = res.data.find((s: any) => s.is_default) || res.data[0];
        setSelectedSeasonId(defaultSeason.id);
      }
    } catch (error) {
      console.error('Error loading seasons:', error);
    }
  };

  const loadRounds = async (seasonId: number) => {
    try {
      const res = await api.get(`/admin/rounds/season/${seasonId}`);
      setRounds(res.data);
      if (res.data.length > 0) {
        setSelectedRoundId(res.data[0].id);
      } else {
        setSelectedRoundId(null);
      }
    } catch (error) {
      console.error('Error loading rounds:', error);
    }
  };

  const loadRoundDetails = async (roundId: number) => {
    try {
      const res = await api.get(`/admin/rounds/${roundId}`);
      setRoundDetails(res.data);
    } catch (error) {
      console.error('Error loading round details:', error);
    }
  };

  const loadParticipants = async (seasonId: number) => {
    try {
      const res = await api.get(`/admin/season-participants/${seasonId}`);
      setParticipants(res.data);
    } catch (error) {
      console.error('Error loading participants:', error);
    }
  };

  const loadPicks = async (roundId: number) => {
    try {
      // Get all picks for this round
      const res = await api.get(`/admin/leaderboard/season/${selectedSeasonId}`);
      const roundPicks = participants.map((p: any) => {
        const leaderboardEntry = res.data.leaderboard.find((l: any) => l.userId === p.id);
        return {
          userId: p.id,
          userName: p.name,
          pick: leaderboardEntry?.picks[roundId] || null
        };
      });
      setPicks(roundPicks);
    } catch (error) {
      console.error('Error loading picks:', error);
    }
  };

  const openPickModal = (user: any, existingPick: any) => {
    setEditingUser(user);
    const pickType = roundDetails?.pick_type || 'single';
    
    if (pickType === 'single') {
      // Load first pick item
      if (existingPick?.pickItems && existingPick.pickItems.length > 0) {
        setChampionPick(existingPick.pickItems[0].pickValue || '');
      } else {
        setChampionPick('');
      }
      setWriteInPicks([]);
    } else if (pickType === 'multiple') {
      // Load all pick items
      const numPicks = roundDetails?.num_write_in_picks || 1;
      const picks = new Array(numPicks).fill('');
      
      if (existingPick?.pickItems) {
        existingPick.pickItems.forEach((item: any) => {
          if (item.pickNumber - 1 < numPicks) {
            picks[item.pickNumber - 1] = item.pickValue;
          }
        });
      }
      
      setWriteInPicks(picks);
      setChampionPick('');
    }
    
    setError('');
    setShowPickModal(true);
  };

  const closePickModal = () => {
    setShowPickModal(false);
    setEditingUser(null);
    setChampionPick('');
    setWriteInPicks([]);
    setError('');
  };

  const handleSubmitPick = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const pickType = roundDetails?.pick_type || 'single';

    try {
      let picksToSubmit: string[] = [];

      if (pickType === 'single') {
        if (!championPick) {
          setError('Please enter a pick');
          setLoading(false);
          return;
        }
        picksToSubmit = [championPick];
      } else if (pickType === 'multiple') {
        picksToSubmit = writeInPicks.filter(p => p && p.trim().length > 0);
        
        if (picksToSubmit.length === 0) {
          setError('Please enter at least one pick');
          setLoading(false);
          return;
        }
      }

      await api.post('/admin/picks', {
        userId: editingUser.userId,
        roundId: selectedRoundId,
        picks: picksToSubmit
      });

      await loadPicks(selectedRoundId!);
      closePickModal();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save pick');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className={headingClasses + " mb-6"}>Manage Picks</h2>

      {/* Season and Sport Selectors */}
      <div className={cardClasses + " mb-6"}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClasses}>
              Season
            </label>
            <select
              value={selectedSeasonId || ''}
              onChange={(e) => setSelectedSeasonId(Number(e.target.value))}
              className={selectClasses}
            >
              {seasons.map(season => (
                <option key={season.id} value={season.id}>
                  {season.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClasses}>
              Sport
            </label>
            <select
              value={selectedRoundId || ''}
              onChange={(e) => setSelectedRoundId(Number(e.target.value))}
              className={selectClasses}
              disabled={rounds.length === 0}
            >
              {rounds.length === 0 ? (
                <option value="">No sports available</option>
              ) : (
                rounds.map(round => (
                  <option key={round.id} value={round.id}>
                    {round.sport_name} - {round.status}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Picks Table */}
      {selectedRoundId && roundDetails ? (
        <div className={`${cardClasses} shadow-md overflow-hidden`}>
          <div className={cardHeaderClasses}>
            <h3 className={subheadingClasses}>
              {roundDetails.sport_name} Picks
            </h3>
            <p className={`${bodyTextClasses} mt-1`}>
              Status: <span className="font-medium capitalize">{roundDetails.status}</span>
              {roundDetails.status === 'completed' && (
                <span className="text-red-600 dark:text-red-400 ml-2">(Completed rounds cannot be edited)</span>
              )}
            </p>
          </div>

          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className={tableHeaderCellClasses}>
                  Participant
                </th>
                <th className={tableHeaderCellClasses}>
                  Pick{roundDetails?.pick_type === 'multiple' ? 's' : ''}
                </th>
                <th className={tableHeaderCellRightClasses}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className={tableBodyClasses}>
              {picks.map((pickData) => (
                <tr key={pickData.userId}>
                  <td className={`${tableCellClasses} font-medium`}>
                    {pickData.userName}
                  </td>
                  <td className={`px-6 py-4 ${bodyTextClasses}`}>
                    {pickData.pick && pickData.pick.pickItems && pickData.pick.pickItems.length > 0 ? (
                      <span className={headingClasses}>
                        {pickData.pick.pickItems.map((item: any, i: number) => (
                          <span key={i}>
                            {item.pickValue}
                            {i < pickData.pick.pickItems.length - 1 ? ', ' : ''}
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500 italic">No pick</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {roundDetails.status !== 'completed' && (
                      <button
                        onClick={() => openPickModal(pickData, pickData.pick)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                      >
                        {pickData.pick ? 'Edit' : 'Add'} Pick
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={`${cardClasses} shadow-md text-center`}>
          <p className={bodyTextClasses}>Select a season and round to manage picks</p>
        </div>
      )}

      {/* Pick Modal */}
      {showPickModal && editingUser && roundDetails && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h3 className={`${subheadingClasses} mb-4`}>
              Enter Pick for {editingUser.userName}
            </h3>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmitPick} className="space-y-4">
              {roundDetails.pick_type === 'single' ? (
                /* Single Pick Type */
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Champion Pick *
                  </label>
                  {roundDetails.teams && roundDetails.teams.length > 0 ? (
                    <select
                      value={championPick}
                      onChange={(e) => setChampionPick(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select a team...</option>
                      {roundDetails.teams.map((team: any) => (
                        <option key={team.id} value={team.team_name}>
                          {team.team_name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={championPick}
                      onChange={(e) => setChampionPick(e.target.value)}
                      placeholder="Enter champion pick"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  )}
                </div>
              ) : (
                /* Multiple Pick Type */
                <div className="space-y-3">
                  <div className="bg-blue-50 p-3 rounded-md mb-3">
                    <p className="text-xs text-blue-900">
                      <strong>Multiple Picks:</strong> Enter up to {roundDetails.num_write_in_picks} picks for this round.
                    </p>
                  </div>
                  
                  {writeInPicks.map((pick, index) => (
                    <div key={index}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Pick {index + 1} {index === 0 && '*'}
                      </label>
                      <input
                        type="text"
                        value={pick}
                        onChange={(e) => {
                          const newPicks = [...writeInPicks];
                          newPicks[index] = e.target.value;
                          setWriteInPicks(newPicks);
                        }}
                        placeholder={`Enter pick ${index + 1}`}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required={index === 0}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-blue-50 p-3 rounded-md">
                <p className="text-xs text-blue-900">
                  <strong>Note:</strong> You can enter picks even after the lock time. This is useful when someone forgets to make their pick.
                </p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Pick'}
                </button>
                <button
                  type="button"
                  onClick={closePickModal}
                  className={buttonCancelClasses}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
