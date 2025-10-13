import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import {
  headingClasses,
  subheadingClasses,
  bodyTextClasses,
  labelClasses,
  inputClasses,
  buttonPrimaryClasses,
  buttonSecondaryClasses,
  buttonSuccessClasses,
  buttonDangerClasses,
  buttonWarningClasses,
  buttonCancelClasses,
  cardClasses,
  modalBackdropClasses,
  modalClasses,
  modalTitleClasses,
  alertInfoClasses,
  alertInfoTextClasses,
  alertErrorClasses,
  alertErrorTextClasses,
  badgePrimaryClasses,
  badgeSuccessClasses,
  badgeGrayClasses,
  badgePurpleClasses,
  helpTextClasses,
  dividerClasses,
  leaderboardSectionClasses,
  leaderboardHeaderClasses,
  leaderboardListClasses,
  leaderboardItemClasses,
  leaderboardRankClasses,
  leaderboardScoreClasses,
  leaderboardNameContainerClasses,
  gridThreeColClasses,
  flexJustifyBetweenClasses,
  flexJustifyBetweenStartClasses,
  flexWrapGapClasses,
  flexItemsGapClasses,
  flexSpaceXPtClasses,
  mb2Classes,
  mb4Classes,
  mb6Classes,
  pt6Classes,
  checkboxLabelClasses,
  interactiveListItemClasses,
  flexSpaceXClasses,
  copySportsSectionClasses,
  copySportsDropdownClasses,
  copySportsWarningClasses
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

export default function SeasonsManagement() {
  const navigate = useNavigate();
  const [seasons, setSeasons] = useState<any[]>([]);
  const [deletedSeasons, setDeletedSeasons] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [isMainAdmin, setIsMainAdmin] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPermanentDeleteModal, setShowPermanentDeleteModal] = useState(false);
  const [seasonToDelete, setSeasonToDelete] = useState<any>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletePermanentConfirm, setDeletePermanentConfirm] = useState('');
  const [deleteCheckbox, setDeleteCheckbox] = useState(false);
  const [permanentDeleteCheckbox, setPermanentDeleteCheckbox] = useState(false);
  const [name, setName] = useState('');
  const [yearStart, setYearStart] = useState('');
  const [yearEnd, setYearEnd] = useState('');
  const [commissioner, setCommissioner] = useState('');
  const [defaultCommissionerName, setDefaultCommissionerName] = useState<string | null>(null);
  const [isDefault, setIsDefault] = useState(true);
  const [selectedParticipants, setSelectedParticipants] = useState<number[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Edit modal state
  const [editingSeason, setEditingSeason] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editYearStart, setEditYearStart] = useState('');
  const [editYearEnd, setEditYearEnd] = useState('');
  const [editCommissioner, setEditCommissioner] = useState('');
  const [editIsDefault, setEditIsDefault] = useState(false);
  const [editError, setEditError] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Copy sports state
  const [copySourceSeasons, setCopySourceSeasons] = useState<any[]>([]);
  const [copySports, setCopySports] = useState(false);
  const [sourceSeasonId, setSourceSeasonId] = useState('');
  const [editCopySports, setEditCopySports] = useState(false);
  const [editSourceSeasonId, setEditSourceSeasonId] = useState('');

  useEffect(() => {
    loadCommissioner();
    loadCopySourceSeasons();
  }, []);

  useEffect(() => {
    // Check if user is main admin
    const token = localStorage.getItem('adminToken');
    if (token) {
      const decoded = decodeToken(token);
      setIsMainAdmin(decoded?.isMainAdmin || false);
    }
    
    loadSeasons();
    loadDeletedSeasons();
    loadUsers();
  }, []);

  const loadSeasons = async () => {
    try {
      const res = await api.get('/admin/seasons');
      setSeasons(res.data);
    } catch (error) {
      console.error('Error loading seasons:', error);
    }
  };

  const loadDeletedSeasons = async () => {
    try {
      const res = await api.get('/admin/seasons/deleted');
      setDeletedSeasons(res.data);
    } catch (error) {
      console.error('Error loading deleted seasons:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      // Filter out deactivated players from new season selection
      const activeUsers = res.data.filter((u: any) => u.is_active !== false);
      setAllUsers(activeUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadCommissioner = async () => {
    try {
      const res = await api.get('/admin/admins/commissioner');
      setDefaultCommissionerName(res.data.name);
    } catch (error) {
      console.error('Error loading commissioner:', error);
      setDefaultCommissionerName(null);
    }
  };

  const loadCopySourceSeasons = async () => {
    try {
      const res = await api.get('/admin/seasons/copy-sources');
      setCopySourceSeasons(res.data);
    } catch (error) {
      console.error('Error loading copy source seasons:', error);
      setCopySourceSeasons([]);
    }
  };

  const openModal = () => {
    setName('');
    setYearStart('');
    setYearEnd('');
    // Pre-fill commissioner with current commissioner name
    setCommissioner(defaultCommissionerName || '');
    setIsDefault(true);
    setSelectedParticipants([]);
    setError('');
    setCopySports(false);
    setSourceSeasonId('');
    setShowModal(true);
  };

  const toggleParticipant = (userId: number) => {
    setSelectedParticipants(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleAllParticipants = () => {
    if (selectedParticipants.length === allUsers.length) {
      setSelectedParticipants([]);
    } else {
      setSelectedParticipants(allUsers.map(u => u.id));
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    setLoading(true);

    try {
      await api.post('/admin/seasons', {
        name,
        yearStart: parseInt(yearStart),
        yearEnd: parseInt(yearEnd),
        commissioner: commissioner || null,
        isDefault,
        participantIds: selectedParticipants,
        copySports,
        sourceSeasonId: copySports ? parseInt(sourceSeasonId) : undefined
      });
      
      await loadSeasons();
      closeModal();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create season');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (season: any) => {
    setEditingSeason(season);
    setEditName(season.name);
    setEditYearStart(season.year_start.toString());
    setEditYearEnd(season.year_end.toString());
    setEditCommissioner(season.commissioner || '');
    setEditIsDefault(season.is_default === 1);
    setEditError('');
    setEditCopySports(false);
    setEditSourceSeasonId('');
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingSeason(null);
    setEditName('');
    setEditYearStart('');
    setEditYearEnd('');
    setEditCommissioner('');
    setEditIsDefault(false);
    setEditError('');
    setEditCopySports(false);
    setEditSourceSeasonId('');
  };

  const handleEditSeason = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError('');

    setEditLoading(true);

    try {
      await api.put(`/admin/seasons/${editingSeason.id}`, {
        name: editName,
        yearStart: parseInt(editYearStart),
        yearEnd: parseInt(editYearEnd),
        commissioner: editCommissioner || null,
        isDefault: editIsDefault,
        copySports: editCopySports,
        sourceSeasonId: editCopySports ? parseInt(editSourceSeasonId) : undefined
      });
      
      await loadSeasons();
      closeEditModal();
      alert('Season updated successfully!');
    } catch (err: any) {
      setEditError(err.response?.data?.error || 'Failed to update season');
    } finally {
      setEditLoading(false);
    }
  };

  const handleToggleActive = async (seasonId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.put(`/admin/seasons/${seasonId}/toggle-active`);
      await loadSeasons();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to toggle season status');
    }
  };

  const handleEndSeason = async (seasonId: number) => {
    if (!confirm('End this season? This will calculate and lock the final standings. You can reopen it later if needed.')) {
      return;
    }

    try {
      const res = await api.post(`/admin/seasons/${seasonId}/end`);
      await loadSeasons();
      alert(`Season ended successfully! Winners: ${res.data.winners.map((w: any) => w.name).join(', ')}`);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to end season');
    }
  };

  const handleReopenSeason = async (seasonId: number) => {
    if (!confirm('Reopen this ended season? This will remove the winner records and allow changes.')) {
      return;
    }

    try {
      await api.post(`/admin/seasons/${seasonId}/reopen`);
      await loadSeasons();
      alert('Season reopened successfully!');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to reopen season');
    }
  };

  const openDeleteModal = (season: any) => {
    setSeasonToDelete(season);
    setDeleteConfirmText('');
    setDeleteCheckbox(false);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setSeasonToDelete(null);
    setDeleteConfirmText('');
    setDeleteCheckbox(false);
  };

  const handleSoftDelete = async () => {
    if (!seasonToDelete) return;

    if (deleteConfirmText !== seasonToDelete.name) {
      alert('Season name does not match!');
      return;
    }

    if (!deleteCheckbox) {
      alert('Please confirm by checking the box');
      return;
    }

    try {
      await api.post(`/admin/seasons/${seasonToDelete.id}/soft-delete`);
      await loadSeasons();
      await loadDeletedSeasons();
      closeDeleteModal();
      alert('Season deleted successfully. You can restore it from the Deleted Seasons section below.');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete season');
    }
  };

  const handleRestore = async (seasonId: number) => {
    if (!confirm('Restore this deleted season?')) {
      return;
    }

    try {
      await api.post(`/admin/seasons/${seasonId}/restore`);
      await loadSeasons();
      await loadDeletedSeasons();
      alert('Season restored successfully!');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to restore season');
    }
  };

  const openPermanentDeleteModal = (season: any) => {
    setSeasonToDelete(season);
    setDeletePermanentConfirm('');
    setPermanentDeleteCheckbox(false);
    setShowPermanentDeleteModal(true);
  };

  const closePermanentDeleteModal = () => {
    setShowPermanentDeleteModal(false);
    setSeasonToDelete(null);
    setDeletePermanentConfirm('');
    setPermanentDeleteCheckbox(false);
  };

  const handlePermanentDelete = async () => {
    if (!seasonToDelete) return;

    if (deletePermanentConfirm !== 'PERMANENT DELETE') {
      alert('You must type "PERMANENT DELETE" exactly!');
      return;
    }

    if (!permanentDeleteCheckbox) {
      alert('Please confirm by checking the box');
      return;
    }

    try {
      await api.delete(`/admin/seasons/${seasonToDelete.id}/permanent`, {
        data: { confirmation: 'PERMANENT DELETE' }
      });
      await loadDeletedSeasons();
      closePermanentDeleteModal();
      alert('Season permanently deleted');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to permanently delete season');
    }
  };

  // Separate seasons into active and ended
  const activeSeasons = seasons.filter(s => !s.ended_at);
  const endedSeasons = seasons.filter(s => s.ended_at);

  return (
    <div>
      <div className={`${flexJustifyBetweenClasses} ${mb6Classes}`}>
        <div>
          <h2 className={headingClasses}>Seasons</h2>
          <p className={bodyTextClasses + " mt-1"}>
            Manage multiple concurrent seasons. New seasons automatically become the default.
          </p>
        </div>
        <button
          onClick={openModal}
          className={buttonPrimaryClasses}
        >
          + Create Season
        </button>
      </div>

      {/* Active & Default Seasons Section */}
      <div className="mb-8">
        <h3 className={subheadingClasses + " mb-4"}>Active & Default Seasons</h3>
        <div className={gridThreeColClasses}>
          {activeSeasons.map((season) => (
            <div
              key={season.id}
              className={`${cardClasses} p-6 hover:shadow-lg transition ${
                season.is_default === 1 ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''
              } ${!season.is_active ? 'opacity-60' : ''}`}
            >
              <div className={`${flexJustifyBetweenStartClasses} ${mb2Classes}`}>
                <h3 className={subheadingClasses}>{season.name}</h3>
                <div className={flexWrapGapClasses}>
                  {season.is_default === 1 && (
                    <span className={badgePrimaryClasses}>
                      Report Default
                    </span>
                  )}
                  {season.is_active ? (
                    <span className={badgeSuccessClasses}>
                      Active
                    </span>
                  ) : (
                    <span className={badgeGrayClasses}>
                      Inactive
                    </span>
                  )}
                </div>
              </div>
              <p className={bodyTextClasses + " mb-4"}>
                {season.year_start} - {season.year_end}
              </p>
              
              {/* Leaderboard for active seasons */}
              {season.leaderboard && season.leaderboard.length > 0 && (
                <div className={leaderboardSectionClasses}>
                  <p className={leaderboardHeaderClasses}>
                    📊 Leaderboard ({season.leaderboard.length} participants):
                  </p>
                  <div className={leaderboardListClasses}>
                    {season.leaderboard.map((entry: any) => (
                      <div key={entry.userId} className={leaderboardItemClasses}>
                        <div className={leaderboardNameContainerClasses}>
                          <span className={leaderboardRankClasses}>
                            {entry.rank}.
                          </span>
                          <span>{entry.name}</span>
                        </div>
                        <span className={leaderboardScoreClasses}>
                          {entry.totalPoints} pts
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* First Row of Buttons */}
              <div className={`${flexWrapGapClasses} ${mb2Classes}`}>
                <button
                  onClick={() => navigate(`/admin/seasons/${season.id}`)}
                  className={`flex-1 min-w-[140px] text-xs py-2 px-3 rounded-md transition font-medium ${buttonPrimaryClasses}`}
                >
                  Manage Participants
                </button>
                <button
                  onClick={() => openEditModal(season)}
                  className={`flex-1 min-w-[100px] text-xs py-2 px-3 rounded-md transition font-medium ${buttonSecondaryClasses}`}
                >
                  Edit Season
                </button>
                {season.is_active && (
                  <button
                    onClick={() => handleEndSeason(season.id)}
                    className={`flex-1 min-w-[110px] text-xs py-2 px-3 rounded-md transition font-medium ${buttonSuccessClasses}`}
                  >
                    🏆 End Season
                  </button>
                )}
              </div>

              {/* Second Row of Buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => openDeleteModal(season)}
                  className={`flex-1 min-w-[120px] text-xs py-2 px-3 rounded-md transition font-medium ${buttonDangerClasses}`}
                >
                  Delete Season
                </button>
                <button
                  onClick={(e) => handleToggleActive(season.id, e)}
                  className={`flex-1 min-w-[120px] text-xs py-2 px-3 rounded-md transition font-medium ${
                    season.is_active 
                      ? buttonWarningClasses
                      : buttonSuccessClasses
                  }`}
                >
                  {season.is_active ? 'Deactivate Season' : 'Activate Season'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ended/Completed Seasons Section */}
      {endedSeasons.length > 0 && (
        <div className={`mb-8 pt-8 ${dividerClasses}`}>
          <h3 className={subheadingClasses + " mb-4"}>🏆 Ended/Completed Seasons</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {endedSeasons.map((season) => (
              <div
                key={season.id}
                className={`${cardClasses} p-6 hover:shadow-lg transition opacity-75`}
              >
                <div className={`${flexJustifyBetweenStartClasses} ${mb2Classes}`}>
                  <h3 className={subheadingClasses}>{season.name}</h3>
                  <span className={badgePurpleClasses}>
                    🏆 Ended
                  </span>
                </div>
                <p className={bodyTextClasses + " mb-4"}>
                  {season.year_start} - {season.year_end}
                </p>
                
                {/* First Row of Buttons */}
                <div className="flex flex-wrap gap-2 mb-2">
                  <button
                    onClick={() => navigate(`/admin/seasons/${season.id}`)}
                    className={`flex-1 min-w-[140px] text-xs py-2 px-3 rounded-md transition font-medium ${buttonPrimaryClasses}`}
                  >
                    Manage Participants
                  </button>
                  <button
                    onClick={() => openEditModal(season)}
                    className={`flex-1 min-w-[100px] text-xs py-2 px-3 rounded-md transition font-medium ${buttonSecondaryClasses}`}
                  >
                    Edit Season
                  </button>
                  <button
                    onClick={() => handleReopenSeason(season.id)}
                    className={`flex-1 min-w-[110px] text-xs py-2 px-3 rounded-md transition font-medium ${buttonSuccessClasses}`}
                  >
                    🔓 Reopen Season
                  </button>
                </div>

                {/* Second Row of Buttons */}
                <div className={flexWrapGapClasses}>
                  <button
                    onClick={() => openDeleteModal(season)}
                    className={`flex-1 min-w-[120px] text-xs py-2 px-3 rounded-md transition font-medium ${buttonDangerClasses}`}
                  >
                    Delete Season
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className={modalBackdropClasses}>
          <div className={modalClasses}>
            <h3 className={modalTitleClasses}>Create New Season</h3>

            <div className={alertInfoClasses + " p-3 mb-4"}>
              <p className={alertInfoTextClasses + " text-xs"}>
                💡 New season will be set as Active automatically
              </p>
            </div>

            {error && (
              <div className={alertErrorClasses + " p-4 mb-4"}>
                <p className={alertErrorTextClasses}>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={labelClasses}>
                  Season Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Sports Picks Championship 2025-2026"
                  className={inputClasses}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>
                    Start Year
                  </label>
                  <input
                    type="number"
                    value={yearStart}
                    onChange={(e) => setYearStart(e.target.value)}
                    min="1990"
                    max="2100"
                    className={inputClasses}
                    required
                  />
                </div>

                <div>
                  <label className={labelClasses}>
                    End Year
                  </label>
                  <input
                    type="number"
                    value={yearEnd}
                    onChange={(e) => setYearEnd(e.target.value)}
                    min="1990"
                    max="2100"
                    className={inputClasses}
                    required
                  />
                </div>
              </div>

              <div>
                <label className={labelClasses}>
                  Commissioner (Optional)
                </label>
                <input
                  type="text"
                  value={commissioner}
                  onChange={(e) => setCommissioner(e.target.value)}
                  placeholder="e.g., John Smith"
                  maxLength={255}
                  className={inputClasses}
                />
                <p className={`mt-1 ${helpTextClasses}`}>
                  This field is pre-filled with the current commissioner from the admin list, but you can change it if needed. Appears in email signatures for all sports in this season.
                </p>
              </div>

              <div className={flexItemsGapClasses}>
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <label htmlFor="isDefault" className={labelClasses + " mb-0"}>
                  Set as Report Default
                </label>
              </div>
              <p className={`${helpTextClasses} ml-7`}>
                The report default season is shown on the main homepage. Only one season can be the default at a time.
              </p>

              {/* Copy Sports Section */}
              <div className={flexItemsGapClasses}>
                <input
                  type="checkbox"
                  id="copySports"
                  checked={copySports}
                  onChange={(e) => setCopySports(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <label htmlFor="copySports" className={labelClasses + " mb-0"}>
                  Copy sports from previous season
                </label>
              </div>

              {copySports && (
                <div className={copySportsSectionClasses}>
                  <label className={labelClasses}>
                    📋 Select Season to Copy From
                  </label>
                  <select
                    value={sourceSeasonId}
                    onChange={(e) => setSourceSeasonId(e.target.value)}
                    className={copySportsDropdownClasses}
                    required={copySports}
                  >
                    <option value="">Choose a season...</option>
                    {copySourceSeasons.map((season) => (
                      <option key={season.id} value={season.id}>
                        {season.display_name}
                      </option>
                    ))}
                  </select>
                  <div className={copySportsWarningClasses}>
                    <span>⚠️</span>
                    <span>This will create sports with the same names only. No existing data will be copied. Duplicates will be skipped.</span>
                  </div>
                </div>
              )}

              {/* Participants Selection */}
              <div>
                <label className={labelClasses}>
                  Select Participants *
                </label>
                
                {allUsers.length === 0 ? (
                  <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-md p-3 text-sm text-yellow-700 dark:text-yellow-300">
                    No players available. Please add players first in the "Players" tab.
                  </div>
                ) : (
                  <>
                    <div className="mb-2">
                      <button
                        type="button"
                        onClick={toggleAllParticipants}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                      >
                        {selectedParticipants.length === allUsers.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                    <div className="border border-gray-300 dark:border-gray-600 rounded-md max-h-48 overflow-y-auto">
                      {allUsers.map((user) => (
                        <label
                          key={user.id}
                          className={interactiveListItemClasses}
                        >
                          <input
                            type="checkbox"
                            checked={selectedParticipants.includes(user.id)}
                            onChange={() => toggleParticipant(user.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className={`ml-3 ${labelClasses}`}>{user.name}</span>
                          <span className={`ml-auto ${helpTextClasses}`}>{user.email}</span>
                        </label>
                      ))}
                    </div>
                    <p className={`mt-1 ${helpTextClasses}`}>
                      {selectedParticipants.length} participant(s) selected
                    </p>
                  </>
                )}
              </div>

              <div className={flexSpaceXPtClasses}>
                <button
                  type="submit"
                  disabled={loading}
                  className={`flex-1 ${buttonPrimaryClasses}`}
                >
                  {loading ? 'Creating...' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className={buttonCancelClasses}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Season Modal */}
      {showEditModal && editingSeason && (
        <div className={modalBackdropClasses}>
          <div className={modalClasses}>
            <div className={`${flexJustifyBetweenClasses} ${mb4Classes}`}>
              <h3 className={modalTitleClasses}>Edit Season</h3>
              <button
                onClick={closeEditModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {editError && (
              <div className={alertErrorClasses + " p-4 mb-4"}>
                <p className={alertErrorTextClasses}>{editError}</p>
              </div>
            )}

            <form onSubmit={handleEditSeason} className="space-y-4">
              <div>
                <label className={labelClasses}>
                  Season Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g., Sports Picks Championship 2025-2026"
                  maxLength={50}
                  className={inputClasses}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>
                    Start Year
                  </label>
                  <input
                    type="number"
                    value={editYearStart}
                    onChange={(e) => setEditYearStart(e.target.value)}
                    min="1990"
                    max="2100"
                    className={inputClasses}
                    required
                  />
                </div>

                <div>
                  <label className={labelClasses}>
                    End Year
                  </label>
                  <input
                    type="number"
                    value={editYearEnd}
                    onChange={(e) => setEditYearEnd(e.target.value)}
                    min="1990"
                    max="2100"
                    className={inputClasses}
                    required
                  />
                </div>
              </div>

              <div>
                <label className={labelClasses}>
                  Commissioner (Optional)
                </label>
                <input
                  type="text"
                  value={editCommissioner}
                  onChange={(e) => setEditCommissioner(e.target.value)}
                  placeholder="e.g., John Smith"
                  maxLength={255}
                  className={inputClasses}
                />
                <p className={`mt-1 ${helpTextClasses}`}>
                  This field is pre-filled with the current commissioner from the admin list, but you can change it if needed. Appears in email signatures for all sports in this season.
                </p>
              </div>

              <div className={flexItemsGapClasses}>
                <input
                  type="checkbox"
                  id="editIsDefault"
                  checked={editIsDefault}
                  onChange={(e) => setEditIsDefault(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <label htmlFor="editIsDefault" className={labelClasses + " mb-0"}>
                  Set as Report Default
                </label>
              </div>
              <p className={`${helpTextClasses} ml-7`}>
                The report default season is shown on the main homepage. Only one season can be the default at a time.
              </p>

              {/* Copy Sports Section */}
              <div className={flexItemsGapClasses}>
                <input
                  type="checkbox"
                  id="editCopySports"
                  checked={editCopySports}
                  onChange={(e) => setEditCopySports(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <label htmlFor="editCopySports" className={labelClasses + " mb-0"}>
                  Copy sports from previous season
                </label>
              </div>

              {editCopySports && (
                <div className={copySportsSectionClasses}>
                  <label className={labelClasses}>
                    📋 Select Season to Copy From
                  </label>
                  <select
                    value={editSourceSeasonId}
                    onChange={(e) => setEditSourceSeasonId(e.target.value)}
                    className={copySportsDropdownClasses}
                    required={editCopySports}
                  >
                    <option value="">Choose a season...</option>
                    {copySourceSeasons.map((season) => (
                      <option key={season.id} value={season.id}>
                        {season.display_name}
                      </option>
                    ))}
                  </select>
                  <div className={copySportsWarningClasses}>
                    <span>⚠️</span>
                    <span>Only creates sports that don't already exist in this season.</span>
                  </div>
                </div>
              )}

              <div className={flexSpaceXPtClasses}>
                <button
                  type="submit"
                  disabled={editLoading}
                  className={`flex-1 ${buttonPrimaryClasses}`}
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && seasonToDelete && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className={`${cardClasses} max-w-md w-full`}>
            <h3 className={`${subheadingClasses} text-red-600 dark:text-red-400 mb-4`}>⚠️ Delete Season</h3>

            <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4 mb-4">
              <p className="text-sm text-red-800 dark:text-red-200 font-medium mb-2">
                Deleting "{seasonToDelete.name}" will hide it from all views.
              </p>
              <p className="text-xs text-red-700 dark:text-red-300">
                All sports, picks, and scores will be preserved and you can restore it later if needed.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className={labelClasses}>
                  Type the season name to confirm: <strong>{seasonToDelete.name}</strong>
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Enter season name exactly"
                  className={inputClasses}
                />
              </div>

              <label className={checkboxLabelClasses}>
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

              <div className={`${flexSpaceXClasses} ${pt6Classes}`}>
              <button
                onClick={handleSoftDelete}
                disabled={deleteConfirmText !== seasonToDelete.name || !deleteCheckbox}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete Season
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
      {showPermanentDeleteModal && seasonToDelete && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className={`${cardClasses} max-w-md w-full border-4 border-red-600`}>
            <h3 className="text-xl font-bold text-red-600 dark:text-red-400 mb-4">💀 PERMANENT DELETE</h3>

            <div className="bg-red-100 dark:bg-red-900/50 border-2 border-red-600 p-4 mb-4">
              <p className="text-sm text-red-900 dark:text-red-100 font-bold mb-2">
                THIS CANNOT BE UNDONE!
              </p>
              <p className="text-xs text-red-800 dark:text-red-200 mb-2">
                Permanently deleting "{seasonToDelete.name}" will DELETE:
              </p>
              <ul className="text-xs text-red-800 dark:text-red-200 list-disc list-inside">
                <li>All sports/rounds for this season</li>
                <li>All user picks</li>
                <li>All scores and leaderboard data</li>
                <li>All participant records</li>
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

              <label className={checkboxLabelClasses}>
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

              <div className={`${flexSpaceXClasses} ${pt6Classes}`}>
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

      {/* Deleted Seasons Section */}
      {deletedSeasons.length > 0 && (
        <div className="mb-8 pt-8 border-t-2 border-gray-200 dark:border-gray-700">
          <h3 className={subheadingClasses + " mb-2"}>
            🗑️ Deleted Seasons
          </h3>
          <p className={bodyTextClasses + " mb-4"}>
            These seasons have been deleted but can be restored. To permanently delete, use the "Permanently Delete" button.
          </p>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {deletedSeasons.map((season) => (
              <div
                key={season.id}
                className="bg-gray-100 dark:bg-gray-800 rounded-lg shadow-md p-6 opacity-70"
              >
                <div className="mb-4">
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white">{season.name}</h4>
                  <p className={bodyTextClasses}>
                    {season.year_start} - {season.year_end}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    Deleted: {new Date(season.deleted_at).toLocaleDateString()}
                  </p>
                </div>
                
                <div className={flexWrapGapClasses}>
                  <button
                    onClick={() => handleRestore(season.id)}
                    className={`flex-1 min-w-[100px] text-xs py-2 px-3 rounded-md transition font-medium ${buttonSuccessClasses}`}
                  >
                    🔄 Restore
                  </button>
                  {isMainAdmin ? (
                    <button
                      onClick={() => openPermanentDeleteModal(season)}
                      className="flex-1 min-w-[100px] bg-red-700 text-white text-xs py-2 px-3 rounded-md hover:bg-red-800 transition font-medium"
                    >
                      💀 Permanently Delete
                    </button>
                  ) : (
                    <div className="flex-1 min-w-[100px] text-xs text-gray-600 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 py-2 px-3 rounded-md text-center">
                      📧 Contact Main Admin
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
