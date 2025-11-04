import { useEffect, useState } from 'react';
import api from '../../utils/api';
import logger from '../../utils/logger';
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
  buttonCancelClasses,
  formGridTwoColClasses,
  tableClasses,
  tableContainerClasses,
  tableHeadClasses,
  modalOverlayGrayClasses,
  modalClasses,
  alertErrorClasses,
  alertErrorTextClasses,
  formSectionClasses,
  inputClasses,
  buttonLinkEditClasses,
  buttonLinkDangerClasses,
  textMediumClasses,
  textCapitalizeClasses,
  textRedClasses,
  textGrayItalicClasses,
  mlSpacingClasses,
  spacingYClasses,
  infoBoxClasses,
  textBlueInfoClasses,
  adminEditContainerClasses,
  adminEditCheckmarkClasses,
  adminEditPickChangeClasses,
  adminEditMetadataClasses
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
  const [championPick, setChampionPick] = useState<string | number>(''); // Can be team ID (number) or empty string
  const [writeInPicks, setWriteInPicks] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Helper function to format date as MM/DD/YYYY
  const formatEditDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  useEffect(() => {
    loadSeasons();
  }, []);

  useEffect(() => {
    if (selectedSeasonId) {
      loadRounds(selectedSeasonId);
      loadParticipants(selectedSeasonId);
    } else {
      // Clear rounds and picks when no season selected
      setRounds([]);
      setSelectedRoundId(null);
      setPicks([]);
      setRoundDetails(null);
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
      
      // Sort seasons: default first, then active, then ended (most recent first)
      const sortedSeasons = res.data.sort((a: any, b: any) => {
        // Default season first
        if (a.is_default === 1 && b.is_default !== 1) return -1;
        if (a.is_default !== 1 && b.is_default === 1) return 1;
        
        // Active seasons before ended
        if (!a.ended_at && b.ended_at) return -1;
        if (a.ended_at && !b.ended_at) return 1;
        
        // For ended seasons, sort by most recently ended first
        if (a.ended_at && b.ended_at) {
          return new Date(b.ended_at).getTime() - new Date(a.ended_at).getTime();
        }
        
        // For active seasons, sort by year descending
        return b.year_start - a.year_start;
      });
      
      setSeasons(sortedSeasons);
      // Don't auto-select - let user choose
      setSelectedSeasonId(null);
      setRounds([]);
      setSelectedRoundId(null);
    } catch (error) {
      logger.error('Error loading seasons:', error);
    }
  };

  const loadRounds = async (seasonId: number) => {
    try {
      const res = await api.get(`/admin/rounds/season/${seasonId}`);
      setRounds(res.data);
      // Don't auto-select - let user choose
      setSelectedRoundId(null);
      setPicks([]);
      setRoundDetails(null);
    } catch (error) {
      logger.error('Error loading rounds:', error);
    }
  };

  const loadRoundDetails = async (roundId: number) => {
    try {
      const res = await api.get(`/admin/rounds/${roundId}`);
      setRoundDetails(res.data);
    } catch (error) {
      logger.error('Error loading round details:', error);
    }
  };

  const loadParticipants = async (seasonId: number) => {
    try {
      const res = await api.get(`/admin/season-participants/${seasonId}`);
      setParticipants(res.data);
    } catch (error) {
      logger.error('Error loading participants:', error);
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
      logger.error('Error loading picks:', error);
    }
  };

  const openPickModal = (user: any, existingPick: any) => {
    setEditingUser(user);
    const pickType = roundDetails?.pick_type || 'single';
    
    if (pickType === 'single') {
      // Load first pick item - find team ID from pick value
      if (existingPick?.pickItems && existingPick.pickItems.length > 0) {
        const pickValue = existingPick.pickItems[0].pickValue || '';
        // Find team by name in roundDetails.teams (which has IDs)
        const team = roundDetails?.teams?.find((t: any) => t.name === pickValue);
        const teamId = team?.id || pickValue; // Use ID if available, fallback to name
        setChampionPick(teamId);
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
      let picksToSubmit: (string | number)[] = [];

      if (pickType === 'single') {
        if (!championPick) {
          setError('Please enter a pick');
          setLoading(false);
          return;
        }
        // Submit as-is: if it's a number (ID), submit as number; if string (name), submit as string
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

  const handleClearPick = async (userId: number, userName: string) => {
    if (!window.confirm(`Are you sure you want to clear the pick for ${userName}?`)) {
      return;
    }

    setLoading(true);
    try {
      // Submit empty picks array to clear the pick
      await api.post('/admin/picks', {
        userId: userId,
        roundId: selectedRoundId,
        picks: [] // Empty array will clear the pick
      });

      await loadPicks(selectedRoundId!);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to clear pick');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className={headingClasses + " mb-6"}>Manage Picks</h2>

      {/* Season and Sport Selectors */}
      <div className={cardClasses + " mb-6"}>
        <div className={formGridTwoColClasses}>
          <div>
            <label className={labelClasses}>
              Season
            </label>
            <select
              value={selectedSeasonId || ''}
              onChange={(e) => setSelectedSeasonId(Number(e.target.value) || null)}
              className={selectClasses}
            >
              <option value="">Select a Season</option>
              {seasons.map(season => {
                const start = season.year_start ?? (season.started_at ? new Date(season.started_at).getFullYear() : '');
                const end = season.year_end ?? (season.ended_at ? new Date(season.ended_at).getFullYear() : '');
                const suffixDefault = season.is_default === 1 ? ' (Default)' : '';
                const suffixEnded = season.ended_at ? ' (Ended)' : '';
                return (
                  <option key={season.id} value={season.id}>
                    {season.name} ({start}{start && end ? ' - ' : ''}{end}){suffixDefault}{suffixEnded}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className={labelClasses}>
              Sport
            </label>
            <select
              value={selectedRoundId || ''}
              onChange={(e) => setSelectedRoundId(Number(e.target.value) || null)}
              className={selectClasses}
              disabled={!selectedSeasonId || rounds.length === 0}
            >
              <option value="">Select a Sport</option>
              {rounds.map(round => (
                <option key={round.id} value={round.id}>
                  {round.sport_name} ({round.status})
                </option>
              ))}
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
              Status: <span className={`${textMediumClasses} ${textCapitalizeClasses}`}>{roundDetails.status}</span>
              {roundDetails.status === 'completed' && (
                <span className={`${textRedClasses} ${mlSpacingClasses}`}>(Completed rounds cannot be edited)</span>
              )}
            </p>
          </div>

          <div className={tableContainerClasses}>
            <table className={tableClasses}>
            <thead className={tableHeadClasses}>
              <tr>
                <th className={tableHeaderCellClasses}>
                  Participant
                </th>
                <th className={tableHeaderCellClasses}>
                  Pick{roundDetails?.pick_type === 'multiple' ? 's' : ''}
                </th>
                <th className={tableHeaderCellClasses}>
                  Admin Edited
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
                  <td className={`${tableCellClasses}`}>
                    {pickData.pick && pickData.pick.pickItems && pickData.pick.pickItems.length > 0 ? (
                      <span>
                        {pickData.pick.pickItems.map((item: any, i: number) => (
                          <span key={i}>
                            {item.pickValue}
                            {i < pickData.pick.pickItems.length - 1 ? ', ' : ''}
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span className={textGrayItalicClasses}>No pick</span>
                    )}
                  </td>
                  <td className={`px-6 py-4 ${bodyTextClasses}`}>
                    {pickData.pick && pickData.pick.admin_edited ? (
                      <div className={adminEditContainerClasses}>
                        <div className={adminEditPickChangeClasses}>
                          <span className={adminEditCheckmarkClasses}>✅ </span>
                          {'(Original Not Tracked)'} → {pickData.pick.pickItems && pickData.pick.pickItems.length > 0 
                            ? pickData.pick.pickItems.map((item: any) => item.pickValue).join(', ')
                            : '(No Pick)'}
                        </div>
                        <div className={adminEditMetadataClasses}>
                          Edited by {pickData.pick.editor_name || 'Admin'} on {formatEditDate(pickData.pick.edited_at)}
                        </div>
                      </div>
                    ) : (
                      <span>-</span>
                    )}
                  </td>
                  <td className={`${tableCellClasses} text-right`}>
                    {roundDetails.status !== 'completed' && (
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => openPickModal(pickData, pickData.pick)}
                          className={buttonLinkEditClasses}
                        >
                          {pickData.pick ? 'Edit' : 'Add'} Pick
                        </button>
                        {pickData.pick && (
                          <button
                            onClick={() => handleClearPick(pickData.userId, pickData.userName)}
                            className={buttonLinkDangerClasses}
                          >
                            Clear Pick
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className={`${cardClasses} shadow-md text-center`}>
          <p className={bodyTextClasses}>Select a season and round to manage picks</p>
        </div>
      )}

      {/* Pick Modal */}
      {showPickModal && editingUser && roundDetails && (
        <div className={modalOverlayGrayClasses}>
          <div className={modalClasses}>
            <h3 className={`${subheadingClasses} mb-4`}>
              Enter Pick for {editingUser.userName}
            </h3>

            {error && (
              <div className={alertErrorClasses}>
                <p className={alertErrorTextClasses}>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmitPick} className={formSectionClasses}>
              {roundDetails.pick_type === 'single' ? (
                /* Single Pick Type */
                <div>
                  <label className={labelClasses}>
                    Champion Pick *
                  </label>
                  {roundDetails.teams && roundDetails.teams.length > 0 ? (
                    <select
                      value={championPick}
                      onChange={(e) => {
                        // Convert string value to number if it's an ID
                        const value = e.target.value;
                        const numValue = value ? parseInt(value, 10) : '';
                        setChampionPick(isNaN(numValue as number) ? value : numValue);
                      }}
                      className={inputClasses}
                      required
                    >
                      <option value="">Select a team...</option>
                      {roundDetails.teams.map((team: any) => {
                        // Team object format: {id, name}
                        const teamId = team.id;
                        const teamName = team.name;
                        return (
                          <option key={teamId} value={teamId}>
                            {teamName}
                          </option>
                        );
                      })}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={championPick}
                      onChange={(e) => setChampionPick(e.target.value)}
                      placeholder="Enter champion pick"
                      className={inputClasses}
                      required
                    />
                  )}
                </div>
              ) : (
                /* Multiple Pick Type */
                <div className={spacingYClasses}>
                  <div className={infoBoxClasses}>
                    <p className={textBlueInfoClasses}>
                      <strong>Multiple Picks:</strong> Enter up to {roundDetails.num_write_in_picks} picks for this round.
                    </p>
                  </div>
                  
                  {writeInPicks.map((pick, index) => (
                    <div key={index}>
                      <label className={labelClasses}>
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
                        className={inputClasses}
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
