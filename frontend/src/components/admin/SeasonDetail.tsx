import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import logger from '../../utils/logger';
import {
  headingClasses,
  bodyTextClasses,
  cardClasses,
  cardHeaderClasses,
  subheadingClasses,
  tableClasses,
  tableContainerClasses,
  tableHeadClasses,
  tableHeaderCellClasses,
  tableHeaderCellRightClasses,
  tableBodyClasses,
  tableCellClasses,
  tableCellSecondaryClasses,
  buttonPrimaryClasses,
  buttonSuccessClasses,
  buttonLinkDangerClasses,
  modalBackdropClasses,
  modalClasses,
  modalTitleClasses,
  labelClasses,
  selectClasses,
  buttonCancelClasses,
  badgePrimaryClasses,
  badgeSuccessClasses,
  loadingCenterClasses,
  loadingTextClasses,
  textRedClasses,
  mb6Classes,
  buttonLinkEditClasses,
  flexCenterClasses,
  flexJustifyBetweenStartClasses,
  flexGapClasses,
  flexSpaceXClasses,
  iconLargeClasses,
  badgeDangerClasses,
  mb4Classes
} from '../../styles/commonClasses';

export default function SeasonDetail() {
  const { seasonId } = useParams<{ seasonId: string }>();
  const navigate = useNavigate();
  const [season, setSeason] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSeasonData();
  }, [seasonId]);

  const loadSeasonData = async () => {
    try {
      const [seasonRes, participantsRes, usersRes] = await Promise.all([
        api.get(`/admin/seasons`),
        api.get(`/admin/season-participants/${seasonId}`),
        api.get('/admin/users')
      ]);

      const currentSeason = seasonRes.data.find((s: any) => s.id === parseInt(seasonId!));
      setSeason(currentSeason);
      setParticipants(participantsRes.data);

      // Filter users who are not already participants and are active
      const participantIds = participantsRes.data.map((p: any) => p.id);
      const available = usersRes.data.filter((u: any) => 
        !participantIds.includes(u.id) && u.is_active !== false
      );
      setAvailableUsers(available);

      setLoading(false);
    } catch (error) {
      logger.error('Error loading season data:', error);
      setLoading(false);
    }
  };

  const handleAddParticipant = async () => {
    if (!selectedUserId) return;

    try {
      await api.post(`/admin/season-participants/${seasonId}/participants`, {
        userId: parseInt(selectedUserId)
      });
      await loadSeasonData();
      setShowAddModal(false);
      setSelectedUserId('');
    } catch (error) {
      logger.error('Error adding participant:', error);
      alert('Failed to add participant');
    }
  };

  const handleAddAllPlayers = async () => {
    if (!confirm(`Add all ${availableUsers.length} available player(s) to this season?`)) {
      return;
    }

    try {
      const response = await api.post(`/admin/season-participants/${seasonId}/participants/bulk`);
      await loadSeasonData();
      alert(response.data.message || 'All players added successfully!');
    } catch (error) {
      logger.error('Error adding all participants:', error);
      alert('Failed to add all participants');
    }
  };

  const handleRemoveParticipant = async (userId: number) => {
    if (!confirm('Remove this participant from the season? Their data will be preserved.')) {
      return;
    }

    try {
      await api.delete(`/admin/season-participants/${seasonId}/participants/${userId}`);
      await loadSeasonData();
    } catch (error) {
      logger.error('Error removing participant:', error);
      alert('Failed to remove participant');
    }
  };

  if (loading) {
    return (
      <div className={loadingCenterClasses}>
        <p className={loadingTextClasses}>Loading...</p>
      </div>
    );
  }

  if (!season) {
    return (
      <div className={loadingCenterClasses}>
        <p className={textRedClasses}>Season not found</p>
      </div>
    );
  }

  return (
    <div>
      <div className={mb6Classes}>
        <button
          onClick={() => navigate('/admin/seasons')}
          className={`${buttonLinkEditClasses} ${mb4Classes} ${flexCenterClasses}`}
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Seasons
        </button>
        
        <div className={flexJustifyBetweenStartClasses}>
          <div>
            <h2 className={headingClasses}>{season.name}</h2>
            <p className={bodyTextClasses}>{season.year_start} - {season.year_end}</p>
          </div>
          <div className={flexGapClasses}>
            {season.is_default === 1 && (
              <span className={badgePrimaryClasses}>
                Report Default
              </span>
            )}
            {season.is_active && (
              <span className={badgeSuccessClasses}>
                Active
              </span>
            )}
          </div>
        </div>
      </div>

      <div className={cardClasses + " overflow-hidden"}>
        <div className={cardHeaderClasses + " flex justify-between items-center"}>
          <h3 className={subheadingClasses}>
            Participants ({participants.length})
          </h3>
          {availableUsers.length > 0 && (
            <div className={flexSpaceXClasses}>
              <button
                onClick={() => setShowAddModal(true)}
                className={buttonPrimaryClasses + " text-sm flex items-center"}
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Participant
              </button>
              <button
                onClick={handleAddAllPlayers}
                className={buttonSuccessClasses + " text-sm flex items-center"}
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Add All Players
              </button>
            </div>
          )}
        </div>

        {participants.length === 0 ? (
          <div className={`p-8 text-center ${bodyTextClasses}`}>
            <svg className={`${iconLargeClasses} mx-auto text-gray-400 dark:text-gray-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p>No participants yet. Add family members who want to play.</p>
          </div>
        ) : (
          <div className={tableContainerClasses}>
            <table className={tableClasses}>
            <thead className={tableHeadClasses}>
              <tr>
                <th className={tableHeaderCellClasses}>
                  Name
                </th>
                <th className={tableHeaderCellClasses}>
                  Email
                </th>
                <th className={tableHeaderCellClasses}>
                  Status
                </th>
                <th className={tableHeaderCellClasses}>
                  Added
                </th>
                <th className={tableHeaderCellRightClasses}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className={tableBodyClasses}>
              {participants.map((participant) => (
                <tr key={participant.id} className={!participant.is_active ? 'opacity-60' : ''}>
                  <td className={tableCellClasses}>
                    {participant.name}
                  </td>
                  <td className={tableCellSecondaryClasses}>
                    {participant.email}
                  </td>
                  <td className={tableCellSecondaryClasses}>
                    {!participant.is_active ? (
                      <span className={badgeDangerClasses}>
                        Inactive
                      </span>
                    ) : (
                      <span className={badgeSuccessClasses}>
                        Active
                      </span>
                    )}
                  </td>
                  <td className={tableCellSecondaryClasses}>
                    {new Date(participant.added_at).toLocaleDateString()}
                  </td>
                  <td className={`${tableCellClasses} text-right`}>
                    <button
                      onClick={() => handleRemoveParticipant(participant.id)}
                      className={buttonLinkDangerClasses}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Participant Modal */}
      {showAddModal && (
        <div className={modalBackdropClasses}>
          <div className={modalClasses}>
            <h3 className={modalTitleClasses}>Add Participant</h3>

            {availableUsers.length === 0 ? (
              <p className={bodyTextClasses + " mb-4"}>All users are already participants in this season.</p>
            ) : (
              <>
                <div className={mb4Classes}>
                  <label className={labelClasses}>
                    Select Family Member
                  </label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className={selectClasses}
                  >
                    <option value="">Choose a user...</option>
                    {availableUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className={flexSpaceXClasses}>
                  <button
                    onClick={handleAddParticipant}
                    disabled={!selectedUserId}
                    className={"flex-1 " + buttonPrimaryClasses}
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setSelectedUserId('');
                    }}
                    className={buttonCancelClasses}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
