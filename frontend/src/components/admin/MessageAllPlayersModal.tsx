import { useState } from 'react';
import {
  modalBackdropClasses,
  modalClasses,
  modalTitleClasses,
  modalBodyClasses,
  buttonPrimaryClasses,
  buttonSecondaryClasses,
  inputClasses,
  labelClasses,
  alertErrorClasses,
  alertErrorTextClasses,
  alertSuccessClasses,
  alertSuccessTextClasses,
  bodyTextClasses
} from '../../styles/commonClasses';

interface MessageAllPlayersModalProps {
  isOpen: boolean;
  onClose: () => void;
  season: {
    id: number;
    name: string;
    year_start: number;
    year_end: number;
  } | null;
  onSendMessage: (message: string) => Promise<void>;
}

export default function MessageAllPlayersModal({
  isOpen,
  onClose,
  season,
  onSendMessage
}: MessageAllPlayersModalProps) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) {
      setError('Please enter a message');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await onSendMessage(message.trim());
      setSuccess('Message sent successfully to all active players!');
      setMessage('');
      // Close modal after a short delay to show success message
      setTimeout(() => {
        onClose();
        setSuccess('');
      }, 2000);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setMessage('');
      setError('');
      setSuccess('');
      onClose();
    }
  };

  if (!isOpen || !season) return null;

  return (
    <div className={modalBackdropClasses} onClick={handleClose}>
      <div className={modalClasses} onClick={(e) => e.stopPropagation()}>
        <h3 className={modalTitleClasses}>
          ✉️ Message All Players
        </h3>

        <div className={modalBodyClasses}>
          <div className="mb-4">
            <p className={bodyTextClasses}>
              <strong>Season:</strong> {season.name}
            </p>
            <p className={bodyTextClasses}>
              <strong>Recipients:</strong> All active players in this season
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="message" className={labelClasses}>
                Message
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className={`${inputClasses} h-32 resize-none`}
                placeholder="Enter your message here..."
                disabled={loading}
                maxLength={1000}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {message.length}/1000 characters
              </p>
            </div>

            {error && (
              <div className={alertErrorClasses}>
                <p className={alertErrorTextClasses}>{error}</p>
              </div>
            )}

            {success && (
              <div className={alertSuccessClasses}>
                <p className={alertSuccessTextClasses}>{success}</p>
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={handleClose}
                className={buttonSecondaryClasses}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={buttonPrimaryClasses}
                disabled={loading || !message.trim()}
              >
                {loading ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
