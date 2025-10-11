import { useState } from 'react';
import api from '../../utils/api';
import PasswordInput from '../PasswordInput';
import {
  headingClasses,
  labelClasses,
  inputClasses,
  buttonPrimaryClasses,
  buttonCancelClasses,
  alertErrorClasses,
  alertErrorTextClasses
} from '../../styles/commonClasses';

interface ChangePasswordProps {
  onSuccess: () => void;
  onCancel?: () => void;
}

export default function ChangePassword({ onSuccess, onCancel }: ChangePasswordProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword
      });
      
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className={`${headingClasses} mb-4`}>Change Password</h2>
      
      {error && (
        <div className={`${alertErrorClasses} mb-4`}>
          <p className={alertErrorTextClasses}>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClasses}>
            Current Password
          </label>
          <PasswordInput
            value={currentPassword}
            onChange={setCurrentPassword}
            className={inputClasses}
            required
            autoComplete="current-password"
          />
        </div>

        <div>
          <label className={labelClasses}>
            New Password
          </label>
          <PasswordInput
            value={newPassword}
            onChange={setNewPassword}
            className={inputClasses}
            required
            autoComplete="new-password"
          />
        </div>

        <div>
          <label className={labelClasses}>
            Confirm New Password
          </label>
          <PasswordInput
            value={confirmPassword}
            onChange={setConfirmPassword}
            className={inputClasses}
            required
            autoComplete="new-password"
          />
        </div>

        <div className="flex space-x-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className={`${buttonPrimaryClasses} flex-1`}
          >
            {loading ? 'Changing...' : 'Change Password'}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className={buttonCancelClasses}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
