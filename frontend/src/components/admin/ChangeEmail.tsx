import { useState } from 'react';
import api from '../../utils/api';
import {
  headingClasses,
  labelClasses,
  inputClasses,
  buttonPrimaryClasses,
  buttonCancelClasses,
  alertErrorClasses,
  alertErrorTextClasses,
  grayInfoBoxClasses,
  grayInfoTextClasses,
  formSectionClasses,
  flexSpaceXPtClasses
} from '../../styles/commonClasses';

interface ChangeEmailProps {
  onSuccess: () => void;
  onCancel?: () => void;
  currentEmail?: string;
}

export default function ChangeEmail({ onSuccess, onCancel, currentEmail }: ChangeEmailProps) {
  const [newEmail, setNewEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newEmail !== confirmEmail) {
      setError('Email addresses do not match');
      return;
    }

    if (!newEmail || !newEmail.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    if (newEmail === currentEmail) {
      setError('New email must be different from current email');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/change-email', {
        newEmail
      });
      
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to change email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className={`${headingClasses} mb-4`}>Change Email</h2>
      
      {currentEmail && (
        <div className={grayInfoBoxClasses}>
          <p className={grayInfoTextClasses}>
            <strong>Current email:</strong> {currentEmail}
          </p>
        </div>
      )}
      
      {error && (
        <div className={`${alertErrorClasses} mb-4`}>
          <p className={alertErrorTextClasses}>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className={formSectionClasses}>
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
