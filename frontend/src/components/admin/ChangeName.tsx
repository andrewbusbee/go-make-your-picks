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

interface ChangeNameProps {
  onSuccess: () => void;
  onCancel?: () => void;
  currentName?: string;
}

export default function ChangeName({ onSuccess, onCancel, currentName }: ChangeNameProps) {
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newName || newName.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }

    if (newName === currentName) {
      setError('New name must be different from current name');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/change-name', {
        newName
      });
      
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to change name');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className={`${headingClasses} mb-4`}>Change Name</h2>
      
      {currentName && (
        <div className={grayInfoBoxClasses}>
          <p className={grayInfoTextClasses}>
            <strong>Current name:</strong> {currentName}
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
            New Name
          </label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className={inputClasses}
            placeholder="Enter new name"
            required
            minLength={2}
            maxLength={100}
          />
        </div>

        <div className={flexSpaceXPtClasses}>
          <button
            type="submit"
            disabled={loading}
            className={`${buttonPrimaryClasses} flex-1`}
          >
            {loading ? 'Changing...' : 'Change Name'}
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

