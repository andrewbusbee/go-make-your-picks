// Copyright (c) 2025 Andrew Busbee
// Licensed under the MIT License. See LICENSE file for details.

import { useEffect, useState } from 'react';
import api from '../../utils/api';
import logger from '../../utils/logger';
import {
  headingClasses,
  labelClasses,
  inputClasses,
  inputDisabledClasses,
  checkboxClasses,
  buttonPrimaryClasses,
  buttonCancelClasses,
  buttonLinkDangerClasses,
  buttonLinkEditClasses,
  modalBackdropClasses,
  modalClasses,
  modalTitleClasses,
  alertErrorClasses,
  alertErrorTextClasses,
  alertWarningClasses,
  alertWarningTextClasses,
  tableClasses,
  tableContainerClasses,
  tableHeadClasses,
  tableHeaderCellClasses,
  tableHeaderCellCenterClasses,
  tableHeaderCellRightClasses,
  tableBodyClasses,
  tableCellClasses,
  tableCellSecondaryClasses,
  badgePrimaryClasses,
  badgeDangerClasses,
  buttonLinkSuccessClasses,
  buttonLinkWarningClasses,
  cardClasses,
  flexJustifyBetweenClasses,
  mb6Classes,
  flexColumnGapClasses,
  flexSpaceXPtClasses,
  formSectionClasses,
  flexCenterClasses,
  bodyTextClasses
} from '../../styles/commonClasses';

export default function UsersManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [userDataStatus, setUserDataStatus] = useState<{[key: number]: boolean}>({});
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [noEmail, setNoEmail] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data);
      
      // Check data status for each user
      const dataStatus: {[key: number]: boolean} = {};
      for (const user of res.data) {
        try {
          const dataRes = await api.get(`/admin/users/${user.id}/has-data`);
          dataStatus[user.id] = dataRes.data.hasData;
        } catch (error) {
          logger.error(`Error checking data for user ${user.id}:`, error);
          dataStatus[user.id] = false; // Default to safe value
        }
      }
      setUserDataStatus(dataStatus);
    } catch (error) {
      logger.error('Error loading users:', error);
    }
  };

  const openModal = (user?: any) => {
    if (user) {
      setEditingUser(user);
      setName(user.name);
      const isPlaceholder = user.email.includes('@placeholder.local');
      setEmail(isPlaceholder ? '' : user.email);
      setNoEmail(isPlaceholder);
    } else {
      setEditingUser(null);
      setName('');
      setEmail('');
      setNoEmail(false);
    }
    setError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setName('');
    setEmail('');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate email if provided and noEmail is not checked
    if (!noEmail && !email) {
      setError('Email is required unless "User does not have an email address" is checked');
      return;
    }

    // Basic industry-standard email format check (local@domain.tld)
    if (!noEmail && email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError('Please enter a valid email address');
        return;
      }
    }

    setLoading(true);

    try {
      const userData = {
        name,
        email: noEmail ? '' : email
      };

      if (editingUser) {
        await api.put(`/admin/users/${editingUser.id}`, userData);
      } else {
        await api.post('/admin/users', userData);
      }
      
      await loadUsers();
      closeModal();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save player');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (userId: number, userName: string) => {
    if (!confirm(`Are you sure you want to deactivate ${userName}? They will no longer receive magic links or be able to make picks, but their data will be preserved.`)) {
      return;
    }

    try {
      await api.post(`/admin/users/${userId}/deactivate`);
      await loadUsers();
      alert('Player deactivated successfully');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to deactivate player');
    }
  };

  const handleReactivate = async (userId: number, userName: string) => {
    if (!confirm(`Are you sure you want to reactivate ${userName}? They will be able to receive magic links and make picks again.`)) {
      return;
    }

    try {
      await api.post(`/admin/users/${userId}/reactivate`);
      await loadUsers();
      alert('Player reactivated successfully');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to reactivate player');
    }
  };

  const handleDelete = async (userId: number, userName: string) => {
    // Check if user has data first (shouldn't happen since button is hidden, but safety check)
    if (userDataStatus[userId]) {
      alert('Cannot delete player with existing data. Please deactivate instead.');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/admin/users/${userId}`);
      await loadUsers();
      alert('Player deleted successfully');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete player');
    }
  };

  return (
    <div>
      <div className={`${flexJustifyBetweenClasses} ${mb6Classes}`}>
        <div>
          <h2 className={headingClasses}>Players</h2>
          <p className={bodyTextClasses + " mt-1"}>
            Manage players who can be a part of one or more seasons at a time.
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className={buttonPrimaryClasses}
          data-testid="add-player-button"
        >
          + Add Player
        </button>
      </div>

      <div className={`${cardClasses} shadow-md overflow-hidden`}>
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
              <th className={tableHeaderCellCenterClasses}>
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
            {users.map((user) => (
              <tr key={user.id}>
                <td className={tableCellClasses}>
                  {user.name}
                </td>
                <td className={tableCellSecondaryClasses}>
                  {user.email.includes('@placeholder.local') ? (
                    <span className={`${tableCellSecondaryClasses} italic`}>No email</span>
                  ) : (
                    user.email
                  )}
                </td>
                <td className={`${tableCellClasses} text-center`}>
                  <div className={`${flexColumnGapClasses} items-center`}>
                    {user.is_active !== 1 && (
                      <span className={badgeDangerClasses}>
                        Inactive
                      </span>
                    )}
                    {user.is_active === 1 && userDataStatus[user.id] && (
                      <span className={badgePrimaryClasses}>
                        Has Data
                      </span>
                    )}
                    {user.is_active === 1 && !userDataStatus[user.id] && (
                      <span className={tableCellSecondaryClasses}>—</span>
                    )}
                  </div>
                </td>
                <td className={tableCellSecondaryClasses}>
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className={`${tableCellClasses} text-right`}>
                  <button
                    onClick={() => openModal(user)}
                    className={buttonLinkEditClasses + " mr-4"}
                  >
                    Edit
                  </button>
                  {user.is_active !== 1 ? (
                    <button
                      onClick={() => handleReactivate(user.id, user.name)}
                      className={buttonLinkSuccessClasses}
                    >
                      Reactivate
                    </button>
                  ) : userDataStatus[user.id] ? (
                    <button
                      onClick={() => handleDeactivate(user.id, user.name)}
                      className={buttonLinkWarningClasses}
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDelete(user.id, user.name)}
                      className={buttonLinkDangerClasses}
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className={modalBackdropClasses}>
          <div className={modalClasses}>
            <h3 className={modalTitleClasses}>
              {editingUser ? 'Edit Player' : 'Add New Player'}
            </h3>

            {error && (
              <div className={alertErrorClasses + " mb-4"}>
                <p className={alertErrorTextClasses}>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className={formSectionClasses}>
              <div>
                <label className={labelClasses}>
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClasses}
                  required
                  data-testid="player-name-input"
                />
              </div>

              <div>
                <label className={labelClasses}>
                  Email
                </label>
                <input
                  type="email"
                  name="Email"
                  autoComplete="email"
                  inputMode="email"
                  pattern="[^\s@]+@[^\s@]+\.[^\s@]+"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="player-email-input"
                  onInvalid={(e) => {
                    const el = e.target as HTMLInputElement;
                    if (el.validity.valueMissing) {
                      el.setCustomValidity('Email is required unless "User does not have an email address" is checked');
                    } else if (el.validity.typeMismatch || el.validity.patternMismatch) {
                      el.setCustomValidity('Please enter a valid email address (e.g., name@example.com)');
                    } else {
                      el.setCustomValidity('');
                    }
                  }}
                  onInput={(e) => {
                    (e.target as HTMLInputElement).setCustomValidity('');
                  }}
                  disabled={noEmail}
                  className={inputDisabledClasses}
                  required={!noEmail}
                />
              </div>

              <div>
                <label className={flexCenterClasses}>
                  <input
                    type="checkbox"
                    checked={noEmail}
                    onChange={(e) => {
                      setNoEmail(e.target.checked);
                      if (e.target.checked) {
                        setEmail('');
                      }
                    }}
                    className={checkboxClasses + " mt-0.5"}
                  />
                  <span className={`ml-2 ${labelClasses}`}>
                    User does not have an email address
                  </span>
                </label>
                {noEmail && (
                  <div className={alertWarningClasses + " mt-2 p-3"}>
                    <p className={alertWarningTextClasses + " text-xs"}>
                      <strong>Note:</strong> This player will not receive magic links. 
                      You will need to manually enter their picks using the "Manage Picks" feature.
                    </p>
                  </div>
                )}
              </div>

              <div className={flexSpaceXPtClasses}>
                <button
                  type="submit"
                  disabled={loading}
                  className={"flex-1 " + buttonPrimaryClasses}
                  data-testid="save-player-button"
                >
                  {loading ? 'Saving...' : 'Save'}
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
    </div>
  );
}
