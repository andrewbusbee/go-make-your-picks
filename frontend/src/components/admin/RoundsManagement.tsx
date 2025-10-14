import { useEffect, useState } from 'react';
import api from '../../utils/api';
import TimezoneSelector from '../TimezoneSelector';
import DateTimePicker from '../DateTimePicker';
import {
  headingClasses,
  subheadingClasses,
  bodyTextClasses,
  buttonPrimaryClasses,
  buttonCancelClasses,
  cardClasses,
  inputClasses,
  selectClasses,
  alertErrorClasses,
  alertErrorTextClasses,
  alertSuccessClasses,
  alertSuccessTextClasses,
  alertWarningClasses,
  alertWarningTextClasses,
  alertInfoClasses,
  alertInfoTextClasses,
  labelClasses,
  helpTextClasses,
  tableBodyClasses,
  tableHeaderCellClasses,
  tableHeaderCellCenterClasses,
  tableCellClasses,
  dividerClasses,
  participantSectionClasses,
  participantHeaderClasses,
  participantListClasses,
  participantItemClasses,
  participantCheckmarkClasses,
  formSectionClasses,
  gridTwoColClasses,
  flexColumnGapClasses,
  flexGapClasses,
  flexJustifyBetweenStartClasses,
  flexWrapGapClasses,
  flexSpaceXPtClasses,
  responsiveFlexHeaderClasses,
  mb2Classes,
  mb3Classes,
  mt4Classes,
  iconLargeClasses,
  modalOverlayClasses,
  labelInlineClasses,
  buttonSmallPrimaryClasses,
  buttonSmallSuccessClasses,
  buttonSmallWarningClasses,
  buttonSmallSecondaryClasses,
  buttonSmallPurpleClasses,
  buttonSmallYellowClasses,
  buttonSmallDangerLinkClasses,
  flexItemsGap1Classes,
  formGridTwoColClasses,
  sectionWithDividerClasses,
  completedSectionHeaderClasses,
  completedSportsCardClasses,
  activeSectionHeaderClasses,
  activationWarningClasses,
  activationInfoClasses
} from '../../styles/commonClasses';

// Helper function to decode JWT token
const decodeToken = (token: string) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
};

export default function RoundsManagement() {
  const [seasons, setSeasons] = useState<any[]>([]);
  const [currentSeason, setCurrentSeason] = useState<any>(null);
  const [rounds, setRounds] = useState<any[]>([]);
  const [deletedRounds, setDeletedRounds] = useState<any[]>([]);
  const [isMainAdmin, setIsMainAdmin] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPermanentDeleteModal, setShowPermanentDeleteModal] = useState(false);
  const [selectedRound, setSelectedRound] = useState<any>(null);
  const [editingRound, setEditingRound] = useState<any>(null);
  const [roundToDelete, setRoundToDelete] = useState<any>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletePermanentConfirm, setDeletePermanentConfirm] = useState('');
  const [deleteCheckbox, setDeleteCheckbox] = useState(false);
  const [permanentDeleteCheckbox, setPermanentDeleteCheckbox] = useState(false);
  
  // Create/Edit form
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
  const [sportName, setSportName] = useState('');
  const [pickType, setPickType] = useState<'single' | 'multiple'>('single');
  const [numWriteInPicks, setNumWriteInPicks] = useState(1);
  const [emailMessage, setEmailMessage] = useState('');
  const [lockTime, setLockTime] = useState('');
  const [timezone, setTimezone] = useState('America/New_York');
  const [teamsInput, setTeamsInput] = useState('');
  
  // Validation function to check if a sport can be activated
  const canActivateRound = (round: any): boolean => {
    if (!round) return false;
    
    // Check all required fields
    const hasName = round.sport_name && round.sport_name.trim() !== '';
    const hasSeason = round.season_id;
    const hasLockTime = round.lock_time && (typeof round.lock_time === 'string' ? round.lock_time.trim() !== '' : round.lock_time instanceof Date);
    const hasTimezone = round.timezone && round.timezone.trim() !== '';
    const hasPickType = round.pick_type;
    
    // Check teams/picks based on pick type
    const hasTeamsOrPicks = 
      (round.pick_type === 'single' && round.teams && round.teams.length > 0) ||
      (round.pick_type === 'multiple' && round.num_write_in_picks > 0);
    
    
    return hasName && hasSeason && hasLockTime && hasTimezone && hasPickType && hasTeamsOrPicks;
  };
  
  // Complete form
  const [firstPlaceTeam, setFirstPlaceTeam] = useState('');
  const [secondPlaceTeam, setSecondPlaceTeam] = useState('');
  const [thirdPlaceTeam, setThirdPlaceTeam] = useState('');
  const [fourthPlaceTeam, setFourthPlaceTeam] = useState('');
  const [fifthPlaceTeam, setFifthPlaceTeam] = useState('');
  const [participants, setParticipants] = useState<any[]>([]);
  const [manualScores, setManualScores] = useState<{[key: number]: string}>({});  // Now stores placement: 'first', 'second', etc.
  
  // Settings for dynamic display
  const [pointsSixthPlusPlace, setPointsSixthPlusPlace] = useState(1);
  const defaultTimezone = 'America/New_York';
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Helper function to get available teams for each dropdown (excludes already selected teams)
  const getAvailableTeams = (excludeTeams: string[]) => {
    if (!selectedRound?.teams?.length) return [];
    
    return selectedRound.teams.filter((team: any) => 
      !excludeTeams.includes(team.team_name)
    );
  };

  // Helper function to handle team selection changes and clear dependent dropdowns
  const handleFirstPlaceChange = (value: string) => {
    setFirstPlaceTeam(value);
    // Clear all subsequent selections when champion changes
    setSecondPlaceTeam('');
    setThirdPlaceTeam('');
    setFourthPlaceTeam('');
    setFifthPlaceTeam('');
  };

  const handleSecondPlaceChange = (value: string) => {
    setSecondPlaceTeam(value);
    // Clear subsequent selections when 2nd place changes
    setThirdPlaceTeam('');
    setFourthPlaceTeam('');
    setFifthPlaceTeam('');
  };

  const handleThirdPlaceChange = (value: string) => {
    setThirdPlaceTeam(value);
    // Clear subsequent selections when 3rd place changes
    setFourthPlaceTeam('');
    setFifthPlaceTeam('');
  };

  const handleFourthPlaceChange = (value: string) => {
    setFourthPlaceTeam(value);
    // Clear subsequent selections when 4th place changes
    setFifthPlaceTeam('');
  };

  useEffect(() => {
    // Check if user is main admin
    const token = localStorage.getItem('adminToken');
    if (token) {
      const decoded = decodeToken(token);
      setIsMainAdmin(decoded?.isMainAdmin || false);
    }
    
    loadSeasons();
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await api.get('/admin/settings');
      setPointsSixthPlusPlace(parseInt(res.data.points_sixth_plus_place) || 1);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  useEffect(() => {
    if (currentSeason) {
      loadRounds(currentSeason.id);
    }
  }, [currentSeason]);

  const loadSeasons = async () => {
    try {
      const [defaultRes, allRes] = await Promise.all([
        api.get('/admin/seasons/default'),
        api.get('/admin/seasons')
      ]);
      
      setSeasons(allRes.data);
      if (defaultRes.data) {
        setCurrentSeason(defaultRes.data);
      } else if (allRes.data.length > 0) {
        setCurrentSeason(allRes.data[0]);
      }
    } catch (error) {
      console.error('Error loading seasons:', error);
    }
  };

  const loadRounds = async (seasonId: number) => {
    try {
      const [roundsRes, deletedRes] = await Promise.all([
        api.get(`/admin/rounds/season/${seasonId}`),
        api.get(`/admin/rounds/season/${seasonId}/deleted`)
      ]);
      setRounds(roundsRes.data);
      setDeletedRounds(deletedRes.data);
    } catch (error) {
      console.error('Error loading rounds:', error);
    }
  };

  const openCreateModal = () => {
    setSelectedSeasonId(currentSeason?.id || null);
    setSportName('');
    setPickType('single');
    setNumWriteInPicks(1);
    setEmailMessage('');
    setLockTime('');
    setTimezone(defaultTimezone); // Use default timezone from settings
    setTeamsInput('');
    setError('');
    setEditingRound(null);
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setError('');
    setEditingRound(null);
  };

  const openEditModal = async (round: any) => {
    try {
      // Load full round details including teams
      const res = await api.get(`/admin/rounds/${round.id}`);
      const roundData = res.data;
      
      setEditingRound(roundData);
      setSelectedSeasonId(roundData.season_id);
      setSportName(roundData.sport_name);
      setPickType(roundData.pick_type || 'single');
      setNumWriteInPicks(roundData.num_write_in_picks || 1);
      setEmailMessage(roundData.email_message || '');
      
      // Convert MySQL datetime to datetime-local format
      const lockDate = new Date(roundData.lock_time);
      const localDateTime = new Date(lockDate.getTime() - lockDate.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setLockTime(localDateTime);
      
      setTimezone(roundData.timezone);
      
      // Convert teams array to text
      const teamsText = roundData.teams?.map((t: any) => t.team_name).join('\n') || '';
      setTeamsInput(teamsText);
      
      setError('');
      setShowEditModal(true);
    } catch (error) {
      console.error('Error loading round:', error);
      alert('Failed to load round details');
    }
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setError('');
    setEditingRound(null);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeasonId) {
      setError('Please select a season');
      return;
    }
    
    setError('');
    setLoading(true);

    try {
      const teams = teamsInput
        .split('\n')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      // Send datetime as-is - backend will interpret it in the selected timezone
      // Don't convert to ISO/UTC here as that would apply the browser's timezone
      const lockTimeISO = lockTime || null;

      // Build the payload, only including numWriteInPicks for multiple pick type
      const payload: any = {
        seasonId: selectedSeasonId,
        sportName,
        pickType,
        emailMessage,
        lockTime: lockTimeISO,
        timezone,
        teams: pickType === 'single' ? teams : []
      };

      // Only include numWriteInPicks if pick type is multiple
      if (pickType === 'multiple') {
        payload.numWriteInPicks = numWriteInPicks;
      }

      await api.post('/admin/rounds', payload);
      
      await loadRounds(selectedSeasonId);
      closeCreateModal();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create round');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Send datetime as-is - backend will interpret it in the selected timezone
      // Don't convert to ISO/UTC here as that would apply the browser's timezone
      const lockTimeISO = lockTime || null;

      // Build the payload, only including numWriteInPicks for multiple pick type
      const payload: any = {
        seasonId: selectedSeasonId,
        sportName,
        pickType,
        emailMessage,
        lockTime: lockTimeISO,
        timezone
      };

      // Only include numWriteInPicks if pick type is multiple
      if (pickType === 'multiple') {
        payload.numWriteInPicks = numWriteInPicks;
      }

      // Update basic round info
      await api.put(`/admin/rounds/${editingRound.id}`, payload);

      // Update teams only if pick type is 'single'
      if (pickType === 'single') {
        const teams = teamsInput
          .split('\n')
          .map(t => t.trim())
          .filter(t => t.length > 0);

        // Delete existing teams
        await api.delete(`/admin/rounds/${editingRound.id}/teams`);
        
        // Add new teams if provided
        if (teams.length > 0) {
          await api.post(`/admin/rounds/${editingRound.id}/teams`, { teams });
        }
      }
      
      await loadRounds(currentSeason.id);
      closeEditModal();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update round');
    } finally {
      setLoading(false);
    }
  };

  const handleActivateRound = async (roundId: number) => {
    if (!confirm('This will send magic links to all family members. Continue?')) {
      return;
    }

    try {
      const res = await api.post(`/admin/rounds/${roundId}/activate`);
      alert(`Magic links sent to ${res.data.userCount} users!`);
      await loadRounds(currentSeason.id);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to activate round');
    }
  };

  const openCompleteModal = async (round: any) => {
    try {
      // Load round details
      const roundRes = await api.get(`/admin/rounds/${round.id}`);
      setSelectedRound(roundRes.data);
      
      // Load participants and their picks for this round
      const participantsRes = await api.get(`/admin/season-participants/${round.season_id}`);
      const leaderboardRes = await api.get(`/admin/leaderboard/season/${round.season_id}`);
      
      const participantsWithPicks = participantsRes.data.map((p: any) => {
        const userPick = leaderboardRes.data.leaderboard.find((l: any) => l.userId === p.id);
        const userScore = leaderboardRes.data.leaderboard.find((l: any) => l.userId === p.id)?.scores[round.id];
        return {
          userId: p.id,
          userName: p.name,
          picks: userPick?.picks[round.id] || null,
          score: userScore || null
        };
      });
      
      setParticipants(participantsWithPicks);
      
      // Populate existing data if round was previously completed
      setFirstPlaceTeam(roundRes.data.first_place_team || '');
      setSecondPlaceTeam(roundRes.data.second_place_team || '');
      setThirdPlaceTeam(roundRes.data.third_place_team || '');
      setFourthPlaceTeam(roundRes.data.fourth_place_team || '');
      setFifthPlaceTeam(roundRes.data.fifth_place_team || '');
      
      // Initialize manual scores state from existing scores (for multiple pick type)
      const initialScores: any = {};
      participantsWithPicks.forEach((p: any) => {
        // If scores exist, determine placement based on flags
        if (p.score) {
          if ((p.score.first_place || 0) > 0) {
            initialScores[p.userId] = 'first';
          } else if ((p.score.second_place || 0) > 0) {
            initialScores[p.userId] = 'second';
          } else if ((p.score.third_place || 0) > 0) {
            initialScores[p.userId] = 'third';
          } else if ((p.score.fourth_place || 0) > 0) {
            initialScores[p.userId] = 'fourth';
          } else if ((p.score.fifth_place || 0) > 0) {
            initialScores[p.userId] = 'fifth';
          } else {
            initialScores[p.userId] = 'none';  // 6th+ place
          }
        } else {
          initialScores[p.userId] = 'none';
        }
      });
      setManualScores(initialScores);
      
      setError('');
      setShowCompleteModal(true);
    } catch (error) {
      console.error('Error loading completion data:', error);
      alert('Failed to load round data');
    }
  };

  const closeCompleteModal = () => {
    setShowCompleteModal(false);
    setSelectedRound(null);
    setParticipants([]);
    setManualScores({});
    setFirstPlaceTeam('');
    setSecondPlaceTeam('');
    setThirdPlaceTeam('');
    setFourthPlaceTeam('');
    setFifthPlaceTeam('');
    setError('');
  };

  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!firstPlaceTeam) {
      setError('Champion (1st Place) is required');
      return;
    }

    setLoading(true);

    try {
      const pickType = selectedRound.pick_type || 'single';
      
      const payload: any = {
        firstPlaceTeam,
        secondPlaceTeam: secondPlaceTeam || null,
        thirdPlaceTeam: thirdPlaceTeam || null,
        fourthPlaceTeam: fourthPlaceTeam || null,
        fifthPlaceTeam: fifthPlaceTeam || null
      };

      // For multiple pick type, include manual scores
      if (pickType === 'multiple') {
        payload.manualScores = Object.entries(manualScores).map(([userId, placement]) => ({
          userId: parseInt(userId),
          placement: placement  // 'first', 'second', 'third', 'fourth', 'fifth', or 'none'
        }));
      }

      await api.post(`/admin/rounds/${selectedRound.id}/complete`, payload);
      
      await loadRounds(currentSeason.id);
      closeCompleteModal();
      alert('Round completed and scores calculated!');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to complete round');
    } finally {
      setLoading(false);
    }
  };

  const openDeleteModal = (round: any) => {
    setRoundToDelete(round);
    setDeleteConfirmText('');
    setDeleteCheckbox(false);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setRoundToDelete(null);
    setDeleteConfirmText('');
    setDeleteCheckbox(false);
  };

  const handleSoftDelete = async () => {
    if (!roundToDelete) return;

    if (deleteConfirmText !== roundToDelete.sport_name) {
      alert('Sport name does not match!');
      return;
    }

    if (!deleteCheckbox) {
      alert('Please confirm by checking the box');
      return;
    }

    try {
      await api.post(`/admin/rounds/${roundToDelete.id}/soft-delete`);
      await loadRounds(currentSeason.id);
      closeDeleteModal();
      alert('Sport deleted successfully. You can restore it from the Deleted Sports section below.');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete sport');
    }
  };

  const handleRestoreRound = async (roundId: number) => {
    // Check if current season has ended
    if (currentSeason && currentSeason.ended_at) {
      alert('Cannot restore sports from ended seasons. The season has been closed and finalized.');
      return;
    }

    if (!confirm('Restore this deleted sport?')) {
      return;
    }

    try {
      await api.post(`/admin/rounds/${roundId}/restore`);
      await loadRounds(currentSeason.id);
      alert('Sport restored successfully!');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to restore sport');
    }
  };

  const openPermanentDeleteModal = (round: any) => {
    setRoundToDelete(round);
    setDeletePermanentConfirm('');
    setPermanentDeleteCheckbox(false);
    setShowPermanentDeleteModal(true);
  };

  const closePermanentDeleteModal = () => {
    setShowPermanentDeleteModal(false);
    setRoundToDelete(null);
    setDeletePermanentConfirm('');
    setPermanentDeleteCheckbox(false);
  };

  const handlePermanentDelete = async () => {
    if (!roundToDelete) return;

    if (deletePermanentConfirm !== 'PERMANENT DELETE') {
      alert('You must type "PERMANENT DELETE" exactly!');
      return;
    }

    if (!permanentDeleteCheckbox) {
      alert('Please confirm by checking the box');
      return;
    }

    try {
      await api.delete(`/admin/rounds/${roundToDelete.id}/permanent`, {
        data: { confirmation: 'PERMANENT DELETE' }
      });
      await loadRounds(currentSeason.id);
      closePermanentDeleteModal();
      alert('Sport permanently deleted');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to permanently delete sport');
    }
  };

  const handleUnlockRound = async (roundId: number) => {
    if (!confirm('Are you sure you want to unlock this completed round? This will allow editing and may affect scores.')) {
      return;
    }

    try {
      await api.post(`/admin/rounds/${roundId}/unlock`);
      await loadRounds(currentSeason.id);
      alert('Round unlocked successfully! You can now edit it.');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to unlock round');
    }
  };

  const handleSendReminder = async (roundId: number) => {
    if (!confirm('Send reminder to all players who haven\'t picked yet?')) {
      return;
    }

    setLoading(true);
    try {
      const res = await api.post(`/admin/rounds/${roundId}/send-reminder`);
      alert(res.data.message || 'Reminder sent successfully!');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to send reminder');
    } finally {
      setLoading(false);
    }
  };

  const handleLockRound = async (roundId: number) => {
    if (!confirm('Lock this sport now? This will prevent further picks and send locked notifications to all participants.')) {
      return;
    }

    setLoading(true);
    try {
      await api.post(`/admin/rounds/${roundId}/lock`);
      await loadRounds(currentSeason.id);
      alert('Sport locked and notifications sent successfully!');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to lock sport');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: any = {
      draft: 'bg-gray-100 text-gray-800',
      active: 'bg-green-100 text-green-800',
      locked: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-blue-100 text-blue-800'
    };
    
    return (
      <span className={`text-xs font-medium px-2.5 py-0.5 rounded ${badges[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div>
      <div className={responsiveFlexHeaderClasses}>
        <div>
          <h2 className={headingClasses}>Sports</h2>
          <p className={bodyTextClasses + " mt-1"}>
            Manage sports and rounds for each season
          </p>
        </div>
        
        <div className={flexGapClasses}>
          <div className={flexColumnGapClasses}>
            <label className={labelInlineClasses}>
              Season
            </label>
            <select
              value={currentSeason?.id || ''}
              onChange={(e) => {
                const season = seasons.find(s => s.id === Number(e.target.value));
                setCurrentSeason(season);
              }}
              className={selectClasses + " min-w-[200px]"}
              disabled={seasons.length === 0}
            >
              {seasons.length === 0 ? (
                <option value="">No seasons available</option>
              ) : (
                seasons.map(season => (
                  <option key={season.id} value={season.id}>
                    {season.name} ({season.year_start}-{season.year_end})
                  </option>
                ))
              )}
            </select>
          </div>
          
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Actions
            </label>
            <button
              onClick={openCreateModal}
              disabled={!currentSeason}
              className={buttonPrimaryClasses + " disabled:opacity-50 whitespace-nowrap"}
            >
              + Add Sport
            </button>
          </div>
        </div>
      </div>

      {!currentSeason ? (
        <div className={`${cardClasses} shadow-md text-center p-8`}>
          <div className={iconLargeClasses}>🏆</div>
          <h3 className={`${subheadingClasses} ${mb2Classes}`}>No Seasons Created or Active</h3>
          <p className={bodyTextClasses}>
            {seasons.length === 0 
              ? "Please create a season first in the Seasons tab."
              : "Please select a season from the dropdown above to view and manage its sports."
            }
          </p>
        </div>
      ) : rounds.length === 0 ? (
        <div className={`${cardClasses} shadow-md text-center`}>
          <p className={bodyTextClasses}>No sports yet for this season. Create your first sport to get started!</p>
        </div>
      ) : (
        <>
          {/* Locked Sports Section */}
          {(() => {
            const lockedRounds = rounds.filter(round => round.status === 'locked');
            if (lockedRounds.length > 0) {
              return (
                <div className="mb-8">
                  <h3 className={activeSectionHeaderClasses}>Locked Sports</h3>
                  <div className={gridTwoColClasses}>
                    {lockedRounds.map((round) => (
                      <div key={round.id} className={`${cardClasses} shadow-md`}>
              <div className={`${flexJustifyBetweenStartClasses} ${mb3Classes}`}>
                <div>
                  <h3 className={subheadingClasses}>{round.sport_name}</h3>
                  <p className={bodyTextClasses}>
                    Lock: {new Date(round.lock_time).toLocaleString('en-US', {
                      timeZone: round.timezone,
                      dateStyle: 'short',
                      timeStyle: 'short'
                    })} ({round.timezone?.replace('_', ' ')})
                  </p>
                </div>
                {getStatusBadge(round.status)}
              </div>

              {/* Participants list - hidden for draft rounds */}
              {(round.status === 'active') && round.participants && (
                <div className={participantSectionClasses}>
                  <p className={participantHeaderClasses}>
                    👥 Participants {round.status === 'active' ? `(${round.pickedCount}/${round.totalParticipants} picked)` : `(${round.totalParticipants} players)`}:
                  </p>
                  <div className={participantListClasses}>
                    {round.participants.map((participant: any) => (
                      <div key={participant.id} className={participantItemClasses}>
                        {round.status === 'active' && (
                          <span className={participantCheckmarkClasses}>
                            {participant.hasPicked ? '✅' : '❌'}
                          </span>
                        )}
                        <span>{participant.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {round.first_place_team && (
                <div className={`${alertSuccessClasses} mb-3`}>
                  <p className={`${alertSuccessTextClasses} font-medium`}>
                    🏆 Champion: {round.first_place_team}
                  </p>
                  {(round.second_place_team || round.third_place_team || round.fourth_place_team || round.fifth_place_team) && (
                    <p className={`${alertSuccessTextClasses} mt-1 text-xs`}>
                      {round.second_place_team && `🥈 2nd: ${round.second_place_team}`}
                      {round.third_place_team && ` | 🥉 3rd: ${round.third_place_team}`}
                      {round.fourth_place_team && ` | 4th: ${round.fourth_place_team}`}
                      {round.fifth_place_team && ` | 5th: ${round.fifth_place_team}`}
                    </p>
                  )}
                </div>
              )}

              <div className={`${flexWrapGapClasses} ${mt4Classes}`}>
                {round.status === 'locked' && (
                  <>
                    <button
                      onClick={() => openEditModal(round)}
                      className={buttonSmallSecondaryClasses}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => openCompleteModal(round)}
                      className={buttonSmallPrimaryClasses}
                    >
                      Complete & Score Sport
                    </button>
                  </>
                )}
                {(round.status === 'locked') && (
                  <button
                    onClick={() => openDeleteModal(round)}
                    className={buttonSmallDangerLinkClasses}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
                      ))}
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {/* Divider + Active Sports Section */}
          {(() => {
            const activeRounds = rounds.filter(round => round.status === 'active');
            if (activeRounds.length > 0) {
              return (
                <div className={sectionWithDividerClasses}>
                  <h3 className={activeSectionHeaderClasses}>⚡ Active - Picks in Progress</h3>
                  <div className={gridTwoColClasses}>
                    {activeRounds.map((round) => (
                      <div key={round.id} className={`${cardClasses} shadow-md`}>
              <div className={`${flexJustifyBetweenStartClasses} ${mb3Classes}`}>
                <div>
                  <h3 className={subheadingClasses}>{round.sport_name}</h3>
                  <p className={bodyTextClasses}>
                    Lock: {new Date(round.lock_time).toLocaleString('en-US', {
                      timeZone: round.timezone,
                      dateStyle: 'short',
                      timeStyle: 'short'
                    })} ({round.timezone?.replace('_', ' ')})
                  </p>
                </div>
                {getStatusBadge(round.status)}
              </div>

              {/* Participants list */}
              {round.participants && (
                <div className={participantSectionClasses}>
                  <p className={participantHeaderClasses}>
                    👥 Participants ({round.pickedCount}/{round.totalParticipants} picked):
                  </p>
                  <div className={participantListClasses}>
                    {round.participants.map((participant: any) => (
                      <div key={participant.id} className={participantItemClasses}>
                        <span className={participantCheckmarkClasses}>
                          {participant.hasPicked ? '✅' : '❌'}
                        </span>
                        <span>{participant.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className={`${flexWrapGapClasses} ${mt4Classes}`}>
                <button
                  onClick={() => openEditModal(round)}
                  className={buttonSmallPrimaryClasses}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleLockRound(round.id)}
                  className={buttonSmallWarningClasses}
                  title="Manually lock this sport and send notifications"
                >
                  🔒 Lock Now
                </button>
                <button
                  onClick={() => handleSendReminder(round.id)}
                  className={buttonSmallPurpleClasses}
                  title="Send reminder to users who haven't picked"
                >
                  📧 Remind
                </button>
                <button
                  onClick={() => openDeleteModal(round)}
                  className={buttonSmallDangerLinkClasses}
                >
                  Delete
                </button>
              </div>
            </div>
                    ))}
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {/* Divider + Draft Sports Section */}
          {(() => {
            const draftRounds = rounds.filter(round => round.status === 'draft');
            if (draftRounds.length > 0) {
              return (
                <div className={sectionWithDividerClasses}>
                  <h3 className={activeSectionHeaderClasses}>📝 Draft Sports</h3>
                  <div className={gridTwoColClasses}>
                    {draftRounds.map((round) => (
                      <div key={round.id} className={`${cardClasses} shadow-md`}>
              <div className={`${flexJustifyBetweenStartClasses} ${mb3Classes}`}>
                <div>
                  <h3 className={subheadingClasses}>{round.sport_name}</h3>
                  <p className={bodyTextClasses}>
                    Lock: {new Date(round.lock_time).toLocaleString('en-US', {
                      timeZone: round.timezone,
                      dateStyle: 'short',
                      timeStyle: 'short'
                    })} ({round.timezone?.replace('_', ' ')})
                  </p>
                </div>
                {getStatusBadge(round.status)}
              </div>

              <div className={`${flexWrapGapClasses} ${mt4Classes}`}>
                <button
                  onClick={() => openEditModal(round)}
                  className={buttonSmallPrimaryClasses}
                >
                  Edit
                </button>
                <div className="flex flex-col">
                  <button
                    onClick={() => handleActivateRound(round.id)}
                    disabled={!canActivateRound(round)}
                    className={buttonSmallSuccessClasses}
                    title={!canActivateRound(round) ? "Please fill out all required fields before activating" : ""}
                  >
                    Activate & Send Links
                  </button>
                  {!canActivateRound(round) ? (
                    <div className={activationWarningClasses}>
                      <span>⚠️</span>
                      <span>Please edit and fill out all required fields before activating this sport</span>
                    </div>
                  ) : (
                    <div className={activationInfoClasses}>
                      <span>📧</span>
                      <span>Activating this sport will immediately send pick links to all players</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => openDeleteModal(round)}
                  className={buttonSmallDangerLinkClasses}
                >
                  Delete
                </button>
              </div>
            </div>
                    ))}
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {/* Completed Sports Section */}
          {(() => {
            const completedRounds = rounds.filter(round => round.status === 'completed');
            if (completedRounds.length > 0) {
              return (
                <div className={sectionWithDividerClasses}>
                  <h3 className={completedSectionHeaderClasses}>🏆 Completed Sports</h3>
                  <div className={gridTwoColClasses}>
                    {completedRounds.map((round) => (
                      <div key={round.id} className={completedSportsCardClasses}>
                        <div className={`${flexJustifyBetweenStartClasses} ${mb3Classes}`}>
                          <div>
                            <h3 className={subheadingClasses}>{round.sport_name}</h3>
                            <p className={bodyTextClasses}>
                              Lock: {new Date(round.lock_time).toLocaleString('en-US', {
                                timeZone: round.timezone,
                                dateStyle: 'short',
                                timeStyle: 'short'
                              })} ({round.timezone?.replace('_', ' ')})
                            </p>
                          </div>
                          {getStatusBadge(round.status)}
                        </div>

                        {round.first_place_team && (
                          <div className={`${alertSuccessClasses} mb-3`}>
                            <p className={`${alertSuccessTextClasses} font-medium`}>
                              🏆 Champion: {round.first_place_team}
                            </p>
                            {(round.second_place_team || round.third_place_team || round.fourth_place_team || round.fifth_place_team) && (
                              <p className={`${alertSuccessTextClasses} mt-1 text-xs`}>
                                {round.second_place_team && `🥈 2nd: ${round.second_place_team}`}
                                {round.third_place_team && ` | 🥉 3rd: ${round.third_place_team}`}
                                {round.fourth_place_team && ` | 4th: ${round.fourth_place_team}`}
                                {round.fifth_place_team && ` | 5th: ${round.fifth_place_team}`}
                              </p>
                            )}
                          </div>
                        )}

                        <div className={`${flexWrapGapClasses} ${mt4Classes}`}>
                          <button
                            onClick={() => handleUnlockRound(round.id)}
                            className={`${buttonSmallYellowClasses} ${flexItemsGap1Classes}`}
                            title="Unlock round for editing"
                          >
                            🔓 Unlock
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }
            return null;
          })()}
        </>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className={modalOverlayClasses}>
          <div className={`${cardClasses} rounded-lg max-w-2xl w-full my-2 sm:my-8 max-h-[95vh] overflow-y-auto`}>
            <h3 className={`${subheadingClasses} mb-4`}>
              Add New Sport
            </h3>

            {error && (
              <div className={`${alertErrorClasses} mb-4`}>
                <p className={alertErrorTextClasses}>{error}</p>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className={formSectionClasses}>
              {/* Sport Name */}
              <div>
                <label className={labelClasses}>
                  Sport Name
                </label>
                <input
                  type="text"
                  value={sportName}
                  onChange={(e) => setSportName(e.target.value)}
                  placeholder="e.g., Baseball, Basketball, Wimbledon"
                  className={inputClasses}
                  required
                />
              </div>

              {/* Season Selection */}
              <div>
                <label className={labelClasses}>
                  Select Season:
                </label>
                <select
                  value={selectedSeasonId || ''}
                  onChange={(e) => setSelectedSeasonId(Number(e.target.value) || null)}
                  className={inputClasses}
                  required
                >
                  <option value="">Select a season...</option>
                  {seasons
                    .filter((season: any) => season.is_active && !season.ended_at)
                    .map((season: any) => (
                      <option key={season.id} value={season.id}>
                        {season.name} ({season.year_start}-{season.year_end})
                      </option>
                    ))}
                </select>
                <p className={`${helpTextClasses} mt-1`}>
                  Select which season this sport belongs to. Only active seasons are shown.
                </p>
              </div>

              {/* Pick Type */}
              <div>
                <label className={labelClasses}>
                  Pick Type
                </label>
                <select
                  value={pickType}
                  onChange={(e) => setPickType(e.target.value as 'single' | 'multiple')}
                  className={inputClasses}
                >
                  <option value="single">Single team/player</option>
                  <option value="multiple">Multiple teams/players</option>
                </select>
              </div>

              {/* Conditional: Available Teams (for single pick type) */}
              {pickType === 'single' && (
                <div>
                  <label className={labelClasses}>
                    Available Teams (one per line)
                  </label>
                  <textarea
                    value={teamsInput}
                    onChange={(e) => setTeamsInput(e.target.value)}
                    rows={4}
                    placeholder="Yankees&#10;Red Sox&#10;Dodgers&#10;..."
                    className={`${inputClasses} font-mono text-sm`}
                  />
                  <p className={`mt-1 ${helpTextClasses}`}>
                    Users will pick from this list
                  </p>
                </div>
              )}

              {/* Conditional: Number of Write-in Picks (for multiple pick type) */}
              {pickType === 'multiple' && (
                <div>
                  <label className={labelClasses}>
                    Number of Write-in Picks (1-10)
                  </label>
                  <select
                    value={numWriteInPicks}
                    onChange={(e) => setNumWriteInPicks(parseInt(e.target.value))}
                    className={`${inputClasses} max-w-xs`}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                      <option key={num} value={num}>{num}</option>
                    ))}
                  </select>
                  <p className={`mt-1 ${helpTextClasses}`}>
                    Users will see {numWriteInPicks} blank text {numWriteInPicks === 1 ? 'box' : 'boxes'} to write in their picks
                  </p>
                </div>
              )}

              {/* Email Message to Players */}
              <div>
                <label className={labelClasses}>
                  Email Message to Players (Optional)
                </label>
                <textarea
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  rows={3}
                  placeholder="Add a personal message that will be included in the magic link email..."
                  className={inputClasses}
                />
                <p className={`mt-1 ${helpTextClasses}`}>
                  This message will be included in the email sent to players with their pick link
                </p>
              </div>

              {/* Lock Date & Time */}
              <div className={formGridTwoColClasses}>
                <div>
                  <label className={labelClasses}>
                    Lock Date & Time
                  </label>
                  <DateTimePicker
                    value={lockTime}
                    onChange={setLockTime}
                    className={inputClasses}
                    required
                    timezone={timezone}
                  />
                </div>

                <div>
                  <label className={labelClasses}>
                    Timezone
                  </label>
                  <TimezoneSelector
                    value={timezone}
                    onChange={setTimezone}
                    required
                  />
                  <p className={`mt-1 text-xs ${helpTextClasses}`}>
                    Default: {defaultTimezone}
                  </p>
                </div>
              </div>


              <div className={flexSpaceXPtClasses}>
                <button
                  type="submit"
                  disabled={loading}
                  className={`flex-1 ${buttonPrimaryClasses}`}
                >
                  {loading ? 'Adding...' : 'Add Sport'}
                </button>
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className={buttonCancelClasses}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingRound && (
        <div className={modalOverlayClasses}>
          <div className={`${cardClasses} max-w-2xl w-full my-2 sm:my-8 max-h-[95vh] overflow-y-auto`}>
            <h3 className={`${subheadingClasses} mb-4`}>Edit Sport</h3>

            {error && (
              <div className={`${alertErrorClasses} mb-4`}>
                <p className={alertErrorTextClasses}>{error}</p>
              </div>
            )}

            {editingRound.status !== 'draft' && (
              <div className={`${alertWarningClasses} mb-4`}>
                <p className={alertWarningTextClasses}>
                  <strong>Warning:</strong> This sport is {editingRound.status}. 
                  Editing may affect user picks and magic links.
                </p>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className={formSectionClasses}>
              {/* Sport Name */}
              <div>
                <label className={labelClasses}>
                  Sport Name
                </label>
                <input
                  type="text"
                  value={sportName}
                  onChange={(e) => setSportName(e.target.value)}
                  placeholder="e.g., Baseball, Basketball, Wimbledon"
                  className={inputClasses}
                  required
                />
              </div>

              {/* Season Selection */}
              <div>
                <label className={labelClasses}>
                  Select Season:
                </label>
                <select
                  value={selectedSeasonId || ''}
                  onChange={(e) => setSelectedSeasonId(Number(e.target.value) || null)}
                  className={inputClasses}
                  required
                >
                  <option value="">Select a season...</option>
                  {seasons
                    .filter((season: any) => season.is_active && !season.ended_at)
                    .map((season: any) => (
                      <option key={season.id} value={season.id}>
                        {season.name} ({season.year_start}-{season.year_end})
                      </option>
                    ))}
                </select>
                <p className={`${helpTextClasses} mt-1`}>
                  Select which season this sport belongs to. Only active seasons are shown.
                </p>
              </div>

              {/* Pick Type */}
              <div>
                <label className={labelClasses}>
                  Pick Type
                </label>
                <select
                  value={pickType}
                  onChange={(e) => setPickType(e.target.value as 'single' | 'multiple')}
                  className={inputClasses}
                >
                  <option value="single">Single team/player</option>
                  <option value="multiple">Multiple teams/players</option>
                </select>
              </div>

              {/* Conditional: Available Teams (for single pick type) */}
              {pickType === 'single' && (
                <div>
                  <label className={labelClasses}>
                    Available Teams (one per line)
                  </label>
                  <textarea
                    value={teamsInput}
                    onChange={(e) => setTeamsInput(e.target.value)}
                    rows={4}
                    placeholder="Yankees&#10;Red Sox&#10;Dodgers&#10;..."
                    className={`${inputClasses} font-mono text-sm`}
                  />
                  <p className={`mt-1 ${helpTextClasses}`}>
                    Users will pick from this list
                  </p>
                </div>
              )}

              {/* Conditional: Number of Write-in Picks (for multiple pick type) */}
              {pickType === 'multiple' && (
                <div>
                  <label className={labelClasses}>
                    Number of Write-in Picks (1-10)
                  </label>
                  <select
                    value={numWriteInPicks}
                    onChange={(e) => setNumWriteInPicks(parseInt(e.target.value))}
                    className={`${inputClasses} max-w-xs`}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                      <option key={num} value={num}>{num}</option>
                    ))}
                  </select>
                  <p className={`mt-1 ${helpTextClasses}`}>
                    Users will see {numWriteInPicks} blank text {numWriteInPicks === 1 ? 'box' : 'boxes'} to write in their picks
                  </p>
                </div>
              )}

              {/* Email Message to Players */}
              <div>
                <label className={labelClasses}>
                  Email Message to Players (Optional)
                </label>
                <textarea
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  rows={3}
                  placeholder="Add a personal message that will be included in the magic link email..."
                  className={inputClasses}
                />
                <p className={`mt-1 ${helpTextClasses}`}>
                  This message will be included in the email sent to players with their pick link
                </p>
              </div>

              {/* Lock Date & Time */}
              <div className={formGridTwoColClasses}>
                <div>
                  <label className={labelClasses}>
                    Lock Date & Time
                  </label>
                  <DateTimePicker
                    value={lockTime}
                    onChange={setLockTime}
                    className={inputClasses}
                    required
                    timezone={timezone}
                  />
                </div>

                <div>
                  <label className={labelClasses}>
                    Timezone
                  </label>
                  <TimezoneSelector
                    value={timezone}
                    onChange={setTimezone}
                    required
                  />
                  <p className={`mt-1 text-xs ${helpTextClasses}`}>
                    Default: {defaultTimezone}
                  </p>
                </div>
              </div>


              <div className={flexSpaceXPtClasses}>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={closeEditModal}
                  className={buttonCancelClasses}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Modal */}
      {showCompleteModal && selectedRound && (
        <div className={modalOverlayClasses}>
          <div className={`${cardClasses} max-w-4xl w-full my-2 sm:my-8 max-h-[95vh] overflow-y-auto`}>
            <h3 className={`${headingClasses} mb-6`}>
              Complete & Score {selectedRound.sport_name}
            </h3>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-400 p-4 mb-4">
                <p className={alertErrorTextClasses}>{error}</p>
              </div>
            )}

            <form onSubmit={handleCompleteSubmit} className="space-y-4 sm:space-y-6">
              {/* Final Placements Section */}
              <div>
                <h4 className={`${subheadingClasses} mb-3`}>
                  Final Placements
                </h4>
                <div className="space-y-3 sm:space-y-4">
                  {/* Champion (1st Place) */}
                  <div>
                    <label className={labelClasses}>
                      Champion (1st Place) *
                    </label>
                    {selectedRound.pick_type === 'single' && selectedRound.teams?.length > 0 ? (
                      <select
                        value={firstPlaceTeam}
                        onChange={(e) => handleFirstPlaceChange(e.target.value)}
                        className={inputClasses}
                        required
                      >
                        <option value="">Select champion...</option>
                        {getAvailableTeams([]).map((team: any) => (
                          <option key={team.id} value={team.team_name}>
                            {team.team_name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={firstPlaceTeam}
                        onChange={(e) => setFirstPlaceTeam(e.target.value)}
                        placeholder="Enter champion name"
                        className={inputClasses}
                        required
                      />
                    )}
                  </div>

                  {/* Second Place */}
                  <div>
                    <label className={labelClasses}>
                      Second Place
                    </label>
                    {selectedRound.pick_type === 'single' && selectedRound.teams?.length > 0 ? (
                      <>
                        <select
                          value={secondPlaceTeam}
                          onChange={(e) => handleSecondPlaceChange(e.target.value)}
                          className={`${inputClasses} ${!firstPlaceTeam ? 'opacity-50 cursor-not-allowed' : ''}`}
                          disabled={!firstPlaceTeam}
                        >
                          <option value="">Select 2nd place...</option>
                          {getAvailableTeams([firstPlaceTeam]).map((team: any) => (
                            <option key={team.id} value={team.team_name}>
                              {team.team_name}
                            </option>
                          ))}
                        </select>
                        {!firstPlaceTeam && (
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Select a champion first
                          </p>
                        )}
                        {firstPlaceTeam && getAvailableTeams([firstPlaceTeam]).length === 0 && (
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            No more teams available
                          </p>
                        )}
                      </>
                    ) : (
                      <input
                        type="text"
                        value={secondPlaceTeam}
                        onChange={(e) => setSecondPlaceTeam(e.target.value)}
                        placeholder="Enter 2nd place (optional)"
                        className={inputClasses}
                      />
                    )}
                  </div>

                  {/* Third Place */}
                  <div>
                    <label className={labelClasses}>
                      Third Place
                    </label>
                    {selectedRound.pick_type === 'single' && selectedRound.teams?.length > 0 ? (
                      <>
                        <select
                          value={thirdPlaceTeam}
                          onChange={(e) => handleThirdPlaceChange(e.target.value)}
                          className={`${inputClasses} ${!firstPlaceTeam ? 'opacity-50 cursor-not-allowed' : ''}`}
                          disabled={!firstPlaceTeam}
                        >
                          <option value="">Select 3rd place...</option>
                          {getAvailableTeams([firstPlaceTeam, secondPlaceTeam]).map((team: any) => (
                            <option key={team.id} value={team.team_name}>
                              {team.team_name}
                            </option>
                          ))}
                        </select>
                        {!firstPlaceTeam && (
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Select a champion first
                          </p>
                        )}
                        {firstPlaceTeam && getAvailableTeams([firstPlaceTeam, secondPlaceTeam]).length === 0 && (
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            No more teams available
                          </p>
                        )}
                      </>
                    ) : (
                      <input
                        type="text"
                        value={thirdPlaceTeam}
                        onChange={(e) => setThirdPlaceTeam(e.target.value)}
                        placeholder="Enter 3rd place (optional)"
                        className={inputClasses}
                      />
                    )}
                  </div>

                  {/* Fourth Place */}
                  <div>
                    <label className={labelClasses}>
                      Fourth Place
                    </label>
                    {selectedRound.pick_type === 'single' && selectedRound.teams?.length > 0 ? (
                      <>
                        <select
                          value={fourthPlaceTeam}
                          onChange={(e) => handleFourthPlaceChange(e.target.value)}
                          className={`${inputClasses} ${!firstPlaceTeam ? 'opacity-50 cursor-not-allowed' : ''}`}
                          disabled={!firstPlaceTeam}
                        >
                          <option value="">Select 4th place...</option>
                          {getAvailableTeams([firstPlaceTeam, secondPlaceTeam, thirdPlaceTeam]).map((team: any) => (
                            <option key={team.id} value={team.team_name}>
                              {team.team_name}
                            </option>
                          ))}
                        </select>
                        {!firstPlaceTeam && (
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Select a champion first
                          </p>
                        )}
                        {firstPlaceTeam && getAvailableTeams([firstPlaceTeam, secondPlaceTeam, thirdPlaceTeam]).length === 0 && (
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            No more teams available
                          </p>
                        )}
                      </>
                    ) : (
                      <input
                        type="text"
                        value={fourthPlaceTeam}
                        onChange={(e) => setFourthPlaceTeam(e.target.value)}
                        placeholder="Enter 4th place (optional)"
                        className={inputClasses}
                      />
                    )}
                  </div>

                  {/* Fifth Place */}
                  <div>
                    <label className={labelClasses}>
                      Fifth Place
                    </label>
                    {selectedRound.pick_type === 'single' && selectedRound.teams?.length > 0 ? (
                      <>
                        <select
                          value={fifthPlaceTeam}
                          onChange={(e) => setFifthPlaceTeam(e.target.value)}
                          className={`${inputClasses} ${!firstPlaceTeam ? 'opacity-50 cursor-not-allowed' : ''}`}
                          disabled={!firstPlaceTeam}
                        >
                          <option value="">Select 5th place...</option>
                          {getAvailableTeams([firstPlaceTeam, secondPlaceTeam, thirdPlaceTeam, fourthPlaceTeam]).map((team: any) => (
                            <option key={team.id} value={team.team_name}>
                              {team.team_name}
                            </option>
                          ))}
                        </select>
                        {!firstPlaceTeam && (
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Select a champion first
                          </p>
                        )}
                        {firstPlaceTeam && getAvailableTeams([firstPlaceTeam, secondPlaceTeam, thirdPlaceTeam, fourthPlaceTeam]).length === 0 && (
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            No more teams available
                          </p>
                        )}
                      </>
                    ) : (
                      <input
                        type="text"
                        value={fifthPlaceTeam}
                        onChange={(e) => setFifthPlaceTeam(e.target.value)}
                        placeholder="Enter 5th place (optional)"
                        className={inputClasses}
                      />
                    )}
                  </div>

                  {/* Note about 6th place - USING DYNAMIC VALUE */}
                  <div className={`${alertInfoClasses} p-3`}>
                    <p className={`${alertInfoTextClasses} text-sm`}>
                      ℹ️ Note: All other players get {pointsSixthPlusPlace} point{pointsSixthPlusPlace !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>

              {/* Player Review Table (Only for Multiple Pick Type) */}
              {selectedRound.pick_type === 'multiple' && participants.length > 0 && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 dark:bg-gray-900 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <h4 className={`${headingClasses} font-semibold`}>Review Player Picks</h4>
                    <p className={`${helpTextClasses} mt-1`}>
                      Select the placement for each player (only one placement per player)
                    </p>
                  </div>
                  <div className="overflow-x-auto overflow-y-auto max-h-64 sm:max-h-none">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                          <th className={tableHeaderCellClasses}>
                            Player
                          </th>
                          <th className={tableHeaderCellClasses}>
                            Picks
                          </th>
                          <th className={tableHeaderCellCenterClasses}>
                            1st
                          </th>
                          <th className={tableHeaderCellCenterClasses}>
                            2nd
                          </th>
                          <th className={tableHeaderCellCenterClasses}>
                            3rd
                          </th>
                          <th className={tableHeaderCellCenterClasses}>
                            4th
                          </th>
                          <th className={tableHeaderCellCenterClasses}>
                            5th
                          </th>
                        </tr>
                      </thead>
                      <tbody className={tableBodyClasses}>
                        {participants.map((participant) => (
                          <tr key={participant.userId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className={`${tableCellClasses} font-medium`}>
                              {participant.userName}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                              {participant.picks?.pickItems?.length > 0 ? (
                                participant.picks.pickItems.map((item: any, i: number) => (
                                  <span key={i}>
                                    {item.pickValue}
                                    {i < participant.picks.pickItems.length - 1 ? ', ' : ''}
                                  </span>
                                ))
                              ) : (
                                <span className="text-gray-400 dark:text-gray-500 italic">No picks</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <input
                                type="radio"
                                name={`placement-${participant.userId}`}
                                checked={manualScores[participant.userId] === 'first'}
                                onChange={() => setManualScores({
                                  ...manualScores,
                                  [participant.userId]: 'first'
                                })}
                                className="w-5 h-5 text-blue-600 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <input
                                type="radio"
                                name={`placement-${participant.userId}`}
                                checked={manualScores[participant.userId] === 'second'}
                                onChange={() => setManualScores({
                                  ...manualScores,
                                  [participant.userId]: 'second'
                                })}
                                className="w-5 h-5 text-blue-600 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <input
                                type="radio"
                                name={`placement-${participant.userId}`}
                                checked={manualScores[participant.userId] === 'third'}
                                onChange={() => setManualScores({
                                  ...manualScores,
                                  [participant.userId]: 'third'
                                })}
                                className="w-5 h-5 text-blue-600 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <input
                                type="radio"
                                name={`placement-${participant.userId}`}
                                checked={manualScores[participant.userId] === 'fourth'}
                                onChange={() => setManualScores({
                                  ...manualScores,
                                  [participant.userId]: 'fourth'
                                })}
                                className="w-5 h-5 text-blue-600 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <input
                                type="radio"
                                name={`placement-${participant.userId}`}
                                checked={manualScores[participant.userId] === 'fifth'}
                                onChange={() => setManualScores({
                                  ...manualScores,
                                  [participant.userId]: 'fifth'
                                })}
                                className="w-5 h-5 text-blue-600 focus:ring-blue-500"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className={`${alertInfoClasses} p-3 m-4`}>
                    <p className={`${alertInfoTextClasses} text-sm`}>
                      ℹ️ Players not selected in top 5 will receive {pointsSixthPlusPlace} point{pointsSixthPlusPlace !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              )}

              {/* Scoring Info */}
              <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-md">
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
                  Scoring System:
                </p>
                <ul className="text-sm text-blue-800 dark:text-blue-300 list-disc list-inside space-y-1">
                  <li>Points awarded based on placement: 1st, 2nd, 3rd, 4th, 5th, and 6th+ place</li>
                  <li><strong>Point values can be customized in App Settings</strong></li>
                  <li>Players not in top 5 receive the 6th+ place points ({pointsSixthPlusPlace} {pointsSixthPlusPlace === 1 ? 'point' : 'points'})</li>
                </ul>
                {selectedRound.pick_type === 'single' && (
                  <p className="text-xs text-blue-700 dark:text-blue-400 mt-2">
                    ℹ️ Scores will be calculated automatically based on user picks matching the placements
                  </p>
                )}
                {selectedRound.pick_type === 'multiple' && (
                  <p className="text-xs text-blue-700 dark:text-blue-400 mt-2">
                    ℹ️ Select the placement for each player using the radio buttons above
                  </p>
                )}
              </div>

              <div className={flexSpaceXPtClasses}>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Completing...' : 'Complete & Calculate Scores'}
                </button>
                <button
                  type="button"
                  onClick={closeCompleteModal}
                  className={buttonCancelClasses}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && roundToDelete && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className={`${cardClasses} max-w-md w-full`}>
            <h3 className="text-xl font-bold text-red-600 dark:text-red-400 mb-4">⚠️ Delete Sport</h3>

            <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4 mb-4">
              <p className="text-sm text-red-800 dark:text-red-200 font-medium mb-2">
                Deleting "{roundToDelete.sport_name}" will hide it from all views.
              </p>
              <p className="text-xs text-red-700 dark:text-red-300">
                All picks and scores will be preserved and you can restore it later if needed.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className={labelClasses}>
                  Type the sport name to confirm: <strong>{roundToDelete.sport_name}</strong>
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Enter sport name exactly"
                  className={inputClasses}
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteCheckbox}
                  onChange={(e) => setDeleteCheckbox(e.target.checked)}
                  className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span className={labelClasses}>
                  I understand this can be restored later
                </span>
              </label>
            </div>

            <div className="flex space-x-3 pt-6">
              <button
                onClick={handleSoftDelete}
                disabled={deleteConfirmText !== roundToDelete.sport_name || !deleteCheckbox}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete Sport
              </button>
              <button
                onClick={closeDeleteModal}
                className={buttonCancelClasses}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Modal */}
      {showPermanentDeleteModal && roundToDelete && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className={`${cardClasses} max-w-md w-full border-4 border-red-600`}>
            <h3 className="text-xl font-bold text-red-600 dark:text-red-400 mb-4">💀 PERMANENT DELETE</h3>

            <div className="bg-red-100 dark:bg-red-900/50 border-2 border-red-600 p-4 mb-4">
              <p className="text-sm text-red-900 dark:text-red-100 font-bold mb-2">
                THIS CANNOT BE UNDONE!
              </p>
              <p className="text-xs text-red-800 dark:text-red-200 mb-2">
                Permanently deleting "{roundToDelete.sport_name}" will DELETE:
              </p>
              <ul className="text-xs text-red-800 dark:text-red-200 list-disc list-inside">
                <li>All picks for this sport</li>
                <li>All scores and leaderboard data</li>
                <li>All teams/options</li>
                <li>All magic links</li>
              </ul>
            </div>

            <div className="space-y-4">
              <div>
                <label className={labelClasses}>
                  Type <strong className="text-red-600">PERMANENT DELETE</strong> to confirm:
                </label>
                <input
                  type="text"
                  value={deletePermanentConfirm}
                  onChange={(e) => setDeletePermanentConfirm(e.target.value)}
                  placeholder="Type PERMANENT DELETE"
                  className="w-full px-3 py-2 border-2 border-red-500 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-red-600 focus:border-red-600"
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={permanentDeleteCheckbox}
                  onChange={(e) => setPermanentDeleteCheckbox(e.target.checked)}
                  className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span className={`${labelClasses} font-medium`}>
                  I understand this is PERMANENT and CANNOT be undone
                </span>
              </label>
            </div>

            <div className="flex space-x-3 pt-6">
              <button
                onClick={handlePermanentDelete}
                disabled={deletePermanentConfirm !== 'PERMANENT DELETE' || !permanentDeleteCheckbox}
                className="flex-1 bg-red-700 text-white py-2 px-4 rounded-md font-bold hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                PERMANENTLY DELETE
              </button>
              <button
                onClick={closePermanentDeleteModal}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deleted Sports Section */}
      {deletedRounds.length > 0 && currentSeason && (
        <div className={`mt-12 pt-8 ${dividerClasses}`}>
          <h3 className={`${subheadingClasses} mb-4`}>
            🗑️ Deleted Sports
          </h3>
          <p className={`${bodyTextClasses} mb-4`}>
            These sports have been deleted but can be restored. To permanently delete, use the "Permanently Delete" button.
          </p>
          
          <div className="grid gap-4 md:grid-cols-2">
            {deletedRounds.map((round) => (
              <div
                key={round.id}
                className="bg-gray-100 dark:bg-gray-800 rounded-lg shadow-md p-6 opacity-70"
              >
                <div className="mb-2">
                  <h4 className={`${subheadingClasses} font-bold`}>{round.sport_name}</h4>
                  <p className={bodyTextClasses}>
                    Status: {round.status} | Lock: {new Date(round.lock_time).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    Deleted: {new Date(round.deleted_at).toLocaleDateString()}
                  </p>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-4">
                  <button
                    onClick={() => handleRestoreRound(round.id)}
                    disabled={currentSeason && currentSeason.ended_at}
                    className={`text-sm px-3 py-1 rounded font-medium ${
                      currentSeason && currentSeason.ended_at
                        ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                    title={currentSeason && currentSeason.ended_at ? 'Cannot restore sports from ended seasons' : 'Restore this deleted sport'}
                  >
                    🔄 Restore
                  </button>
                  {isMainAdmin ? (
                    <button
                      onClick={() => openPermanentDeleteModal(round)}
                      className="text-sm bg-red-700 text-white px-3 py-1 rounded hover:bg-red-800 font-medium"
                    >
                      💀 Permanently Delete
                    </button>
                  ) : (
                    <div className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded">
                      📧 Contact Main Admin to permanently delete
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
