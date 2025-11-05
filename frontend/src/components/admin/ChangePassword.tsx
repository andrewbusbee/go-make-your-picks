import { useState } from 'react';
import api from '../../utils/api';
import PasswordInput from '../PasswordInput';
import { validatePasswordStrict, validatePasswordConfirmation } from '../../utils/passwordValidation';
import {
  headingClasses,
  labelClasses,
  inputClasses,
  buttonPrimaryClasses,
  buttonCancelClasses,
  alertErrorClasses,
  alertErrorTextClasses,
  formSectionClasses,
  flexSpaceXPtClasses
} from '../../styles/commonClasses';

interface ChangePasswordProps {
  onSuccess: () => void;
  onCancel?: () => void;
}

export default function ChangePassword({ onSuccess, onCancel }: ChangePasswordProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate password confirmation
    const confirmValidation = validatePasswordConfirmation(newPassword, confirmPassword);
    if (!confirmValidation.isValid) {
      setError(confirmValidation.errors[0]);
      return;
    }

    // Validate new password strength
    const passwordValidation = validatePasswordStrict(newPassword);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.errors[0]);
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/change-password', {
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

      <form onSubmit={handleSubmit} className={formSectionClasses}>
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

        <div className={flexSpaceXPtClasses}>
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
