import { useEffect, useState } from 'react';
import api from '../../utils/api';
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
  cardClasses,
  flexJustifyBetweenClasses,
  mb6Classes,
  flexSpaceXPtClasses,
  formSectionClasses,
  flexSpaceXClasses,
  grayInfoBoxClasses,
  grayInfoTextClasses
} from '../../styles/commonClasses';

export default function AdminsManagement() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showChangeEmailModal, setShowChangeEmailModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<any>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
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
    setName('');
    setEmail('');
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
      // Secondary admins are passwordless - they login via magic links
      await api.post('/admin/admins', { name, email });
      await loadAdmins();
      closeModal();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create admin');
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
      alert(`Email changed successfully for ${selectedAdmin.name}`);
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
      <div className={`${flexJustifyBetweenClasses} ${mb6Classes}`}>
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
                Name
              </th>
              <th className={tableHeaderCellClasses}>
                Email
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
                  {admin.name}
                </td>
                <td className={tableCellSecondaryClasses}>
                  {admin.email}
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
                <td className={`${tableCellClasses} text-right`}>
                  {!admin.is_main_admin && (
                    <div className={`${flexSpaceXClasses} justify-end`}>
                      <button
                        onClick={() => openChangeEmailModal(admin)}
                        className={buttonLinkClasses}
                      >
                        Change Email
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

            <div className={grayInfoBoxClasses}>
              <p className={grayInfoTextClasses}>
                <strong>📧 Passwordless Login:</strong> Secondary admins will receive a magic link via email to log in. 
                No password required!
              </p>
            </div>

            {error && (
              <div className={alertErrorClasses + " p-4 mb-4"}>
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
                  placeholder="e.g., John Smith"
                  required
                />
                <p className={bodyTextClasses + " mt-1 text-xs"}>
                  This will be displayed in the admin panel
                </p>
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
                  placeholder="admin@example.com"
                  required
                />
                <p className={bodyTextClasses + " mt-1 text-xs"}>
                  They will use this email to receive magic login links
                </p>
              </div>

              <div className={flexSpaceXPtClasses}>
                <button
                  type="submit"
                  disabled={loading}
                  className={`flex-1 ${buttonPrimaryClasses}`}
                >
                  {loading ? 'Creating...' : 'Create Admin'}
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

      {/* Change Email Modal */}
      {showChangeEmailModal && selectedAdmin && (
        <div className={modalBackdropClasses}>
          <div className={modalClasses}>
            <h3 className={modalTitleClasses}>
              Change Email for {selectedAdmin.name}
            </h3>

            {error && (
              <div className={alertErrorClasses + " p-4 mb-4"}>
                <p className={alertErrorTextClasses}>{error}</p>
              </div>
            )}

            <div className={grayInfoBoxClasses}>
              <p className={grayInfoTextClasses}>
                <strong>Current email:</strong> {selectedAdmin.email || 'No email set'}
              </p>
            </div>

            <form onSubmit={handleChangeEmail} className={formSectionClasses}>
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

              <div className={flexSpaceXPtClasses}>
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
