import { useEffect, useState } from 'react';
import api from '../../utils/api';
import PasswordInput from '../PasswordInput';
import {
  headingClasses,
  bodyTextClasses,
  labelClasses,
  inputClasses,
  buttonPrimaryClasses,
  buttonCancelClasses,
  buttonLinkClasses,
  buttonLinkDangerClasses,
  modalBackdropClasses,
  modalClasses,
  modalTitleClasses,
  alertErrorClasses,
  alertErrorTextClasses,
  tableClasses,
  tableHeadClasses,
  tableHeaderCellClasses,
  tableHeaderCellRightClasses,
  tableBodyClasses,
  tableCellClasses,
  tableCellSecondaryClasses,
  badgePrimaryClasses,
  badgePurpleClasses,
  cardClasses
} from '../../styles/commonClasses';

export default function AdminsManagement() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showChangeEmailModal, setShowChangeEmailModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<any>(null);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    try {
      const res = await api.get('/admin/admins');
      setAdmins(res.data);
    } catch (error) {
      console.error('Error loading admins:', error);
    }
  };

  const openModal = () => {
    setUsername('');
    setEmail('');
    setPassword('');
    setError('');
    setShowModal(true);
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
      await api.post('/admin/admins', { username, email, password });
      await loadAdmins();
      closeModal();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create admin');
    } finally {
      setLoading(false);
    }
  };

  const openResetModal = (admin: any) => {
    setSelectedAdmin(admin);
    setNewPassword('');
    setError('');
    setShowResetModal(true);
  };

  const closeResetModal = () => {
    setShowResetModal(false);
    setSelectedAdmin(null);
    setNewPassword('');
    setError('');
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post(`/admin/admins/${selectedAdmin.id}/reset-password`, { newPassword });
      alert(`Password reset successfully for ${selectedAdmin.username}`);
      closeResetModal();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const openChangeEmailModal = (admin: any) => {
    setSelectedAdmin(admin);
    setNewEmail('');
    setConfirmEmail('');
    setError('');
    setShowChangeEmailModal(true);
  };

  const closeChangeEmailModal = () => {
    setShowChangeEmailModal(false);
    setSelectedAdmin(null);
    setNewEmail('');
    setConfirmEmail('');
    setError('');
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (newEmail !== confirmEmail) {
      setError('Email addresses do not match');
      setLoading(false);
      return;
    }

    if (!newEmail || !newEmail.includes('@')) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    try {
      await api.put(`/admin/admins/${selectedAdmin.id}/change-email`, { newEmail });
      alert(`Email changed successfully for ${selectedAdmin.username}`);
      closeChangeEmailModal();
      await loadAdmins();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to change email');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (adminId: number) => {
    if (!confirm('Are you sure you want to delete this admin?')) {
      return;
    }

    try {
      await api.delete(`/admin/admins/${adminId}`);
      await loadAdmins();
    } catch (error) {
      console.error('Error deleting admin:', error);
      alert('Failed to delete admin');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className={headingClasses}>Admin Accounts</h2>
        <button
          onClick={openModal}
          className={buttonPrimaryClasses}
        >
          + Add Admin
        </button>
      </div>

      <div className={`${cardClasses} shadow-md overflow-hidden`}>
        <table className={tableClasses}>
          <thead className={tableHeadClasses}>
            <tr>
              <th className={tableHeaderCellClasses}>
                Username
              </th>
              <th className={tableHeaderCellClasses}>
                Role
              </th>
              <th className={tableHeaderCellClasses}>
                Created
              </th>
              <th className={tableHeaderCellRightClasses}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody className={tableBodyClasses}>
            {admins.map((admin) => (
              <tr key={admin.id}>
                <td className={tableCellClasses}>
                  {admin.username}
                </td>
                <td className={tableCellSecondaryClasses}>
                  {admin.is_main_admin ? (
                    <span className={badgePurpleClasses}>
                      Main Admin
                    </span>
                  ) : (
                    <span className={badgePrimaryClasses}>
                      Admin
                    </span>
                  )}
                </td>
                <td className={tableCellSecondaryClasses}>
                  {new Date(admin.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {!admin.is_main_admin && (
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => openChangeEmailModal(admin)}
                        className={buttonLinkClasses}
                      >
                        Change Email
                      </button>
                      <button
                        onClick={() => openResetModal(admin)}
                        className={buttonLinkClasses}
                      >
                        Reset Password
                      </button>
                      <button
                        onClick={() => handleDelete(admin.id)}
                        className={buttonLinkDangerClasses}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Admin Modal */}
      {showModal && (
        <div className={modalBackdropClasses}>
          <div className={modalClasses}>
            <h3 className={modalTitleClasses}>Add New Admin</h3>

            {error && (
              <div className={alertErrorClasses + " p-4 mb-4"}>
                <p className={alertErrorTextClasses}>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={labelClasses}>
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={inputClasses}
                  required
                />
              </div>

              <div>
                <label className={labelClasses}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClasses}
                  required
                />
              </div>

              <div>
                <label className={labelClasses}>
                  Password
                </label>
                <PasswordInput
                  value={password}
                  onChange={setPassword}
                  className={inputClasses}
                  required
                  autoComplete="new-password"
                />
                <p className={bodyTextClasses + " mt-1 text-xs"}>
                  Minimum 6 characters
                </p>
              </div>

              <div className="flex space-x-3 pt-4">
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

      {/* Reset Password Modal */}
      {showResetModal && selectedAdmin && (
        <div className={modalBackdropClasses}>
          <div className={modalClasses}>
            <h3 className={modalTitleClasses}>
              Reset Password for {selectedAdmin.username}
            </h3>

            {error && (
              <div className={alertErrorClasses + " p-4 mb-4"}>
                <p className={alertErrorTextClasses}>{error}</p>
              </div>
            )}

            <div className="bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-400 dark:border-yellow-500 p-4 mb-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                <strong>Warning:</strong> This will immediately change the admin's password. 
                Make sure to communicate the new password to them securely.
              </p>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className={labelClasses}>
                  New Password
                </label>
                <PasswordInput
                  value={newPassword}
                  onChange={setNewPassword}
                  className={inputClasses}
                  placeholder="Enter new password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
                <p className={bodyTextClasses + " mt-1 text-xs"}>
                  Minimum 6 characters. Cannot be "password".
                </p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className={`flex-1 ${buttonPrimaryClasses}`}
                >
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
                <button
                  type="button"
                  onClick={closeResetModal}
                  className={buttonCancelClasses}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Email Modal */}
      {showChangeEmailModal && selectedAdmin && (
        <div className={modalBackdropClasses}>
          <div className={modalClasses}>
            <h3 className={modalTitleClasses}>
              Change Email for {selectedAdmin.username}
            </h3>

            {error && (
              <div className={alertErrorClasses + " p-4 mb-4"}>
                <p className={alertErrorTextClasses}>{error}</p>
              </div>
            )}

            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                <strong>Current email:</strong> {selectedAdmin.email || 'No email set'}
              </p>
            </div>

            <form onSubmit={handleChangeEmail} className="space-y-4">
              <div>
                <label className={labelClasses}>
                  New Email Address
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className={inputClasses}
                  placeholder="Enter new email address"
                  required
                />
              </div>

              <div>
                <label className={labelClasses}>
                  Confirm New Email Address
                </label>
                <input
                  type="email"
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  className={inputClasses}
                  placeholder="Confirm new email address"
                  required
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className={`${buttonPrimaryClasses} flex-1`}
                >
                  {loading ? 'Changing...' : 'Change Email'}
                </button>
                <button
                  type="button"
                  onClick={closeChangeEmailModal}
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
