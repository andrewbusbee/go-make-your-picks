import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import { usePageMeta } from '../utils/usePageMeta';
import {
  labelClasses,
  selectClasses,
  inputClasses,
  headingClasses,
  bodyTextClasses,
  alertWarningClasses,
  alertWarningTextClasses,
  alertSuccessClasses,
  alertSuccessTextClasses,
  alertErrorClasses,
  alertErrorTextClasses,
  alertInfoClasses,
  alertInfoTextClasses,
  helpTextClasses,
  buttonPrimaryClasses
} from '../styles/commonClasses';

export default function PickPage() {
  const { token } = useParams<{ token: string }>();
  const [pickData, setPickData] = useState<any>(null);
  const [championPick, setChampionPick] = useState('');
  const [writeInPicks, setWriteInPicks] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [appTitle, setAppTitle] = useState('Go Make Your Picks');
  const [appTagline, setAppTagline] = useState('Predict. Compete. Win.');
  const [currentCommissioner, setCurrentCommissioner] = useState<string | null>(null);

  // Update page meta tags dynamically
  usePageMeta({
    title: `Make Your Pick - ${appTitle}`,
    description: appTagline
  });

  useEffect(() => {
    loadSettings();
    loadCommissioner();
    loadPickData();
  }, [token]);

  const loadSettings = async () => {
    try {
      const res = await api.get('/public/settings');
      setAppTitle(res.data.app_title || 'Go Make Your Picks');
      setAppTagline(res.data.app_tagline || 'Predict. Compete. Win.');
    } catch (error) {
      console.error('Error loading settings:', error);
      // Don't throw - just use default values
    }
  };

  const loadCommissioner = async () => {
    try {
      const res = await api.get('/admin/admins/commissioner/public');
      setCurrentCommissioner(res.data.name);
    } catch (error) {
      console.error('Error loading commissioner:', error);
      setCurrentCommissioner(null);
    }
  };

  const loadPickData = async () => {
    try {
      const res = await api.get(`/picks/validate/${token}`);
      setPickData(res.data);
      
      const pickType = res.data.round.pickType || 'single';
      
      if (res.data.currentPick && res.data.currentPick.pickItems) {
        // Load existing pick items
        const items = res.data.currentPick.pickItems;
        
        if (pickType === 'single') {
          // Single pick type - set first item
          setChampionPick(items.length > 0 ? items[0].pickValue : '');
        } else if (pickType === 'multiple') {
          // Multiple pick type - load all items
          const numPicks = res.data.round.numWriteInPicks || 1;
          const picks = new Array(numPicks).fill('');
          items.forEach((item: any) => {
            if (item.pickNumber - 1 < numPicks) {
              picks[item.pickNumber - 1] = item.pickValue;
            }
          });
          setWriteInPicks(picks);
        }
      } else {
        // No current pick - initialize based on pick type
        if (pickType === 'multiple') {
          const numPicks = res.data.round.numWriteInPicks || 1;
          setWriteInPicks(new Array(numPicks).fill(''));
        }
      }
      
      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid or expired link');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    const pickType = pickData.round.pickType || 'single';

    try {
      let picksToSubmit: string[] = [];

      if (pickType === 'single') {
        // Single pick type - submit champion pick
        if (!championPick) {
          setError('Please select a team/player');
          setSubmitting(false);
          return;
        }
        picksToSubmit = [championPick];
      } else if (pickType === 'multiple') {
        // Multiple pick type - submit write-in picks
        picksToSubmit = writeInPicks.filter(p => p && p.trim().length > 0);
        
        if (picksToSubmit.length === 0) {
          setError('Please enter at least one pick');
          setSubmitting(false);
          return;
        }
      }

      await api.post(`/picks/${token}`, {
        picks: picksToSubmit
      });
      
      setSuccess('Your pick has been submitted successfully! You can return to this page and update it anytime before the lock time.');
      
      // Reload pick data to show submitted picks
      await loadPickData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit pick');
    } finally {
      setSubmitting(false);
    }
  };

  // Check if picks are locked (past lock time OR manually locked)
  const isPicksLocked = () => {
    if (!pickData?.round) return false;
    
    // Check if round is manually locked
    if (pickData.round.status === 'locked') {
      return true;
    }
    
    // Check if past scheduled lock time
    if (pickData.round.lockTime) {
      const lockTime = new Date(pickData.round.lockTime);
      const now = new Date();
      return now > lockTime;
    }
    
    return false;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (error && !pickData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <span className="text-6xl mb-4 block">❌</span>
          <h2 className={`${headingClasses} mb-2`}>Invalid Link</h2>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  // Show locked picks page if past lock time
  if (pickData && isPicksLocked()) {
    const commissioner = currentCommissioner || 'The Commissioner';
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 py-8 px-4 pb-20 transition-colors">
        <div className="max-w-2xl mx-auto">
          <div className="overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-800 dark:to-purple-800 text-white p-6">
              <h1 className="text-3xl font-bold mb-2">🏆 {appTitle}</h1>
            </div>

            {/* Content */}
            <div className="p-6">


              {/* Locked Message */}
              <div className="text-center mb-6">

                <h3 className="text-4xl font-bold text-gray-800 dark:text-white mb-4">WOMP WOMP!</h3>
              </div>

              

              {/* Round Locked Status */}
              <div className={`${alertErrorClasses} mb-6`}>
                <p className={`${alertErrorTextClasses} text-center`}>
                  <strong>This round is now locked</strong>
                </p>
              </div>

              <div className="mb-8">
                <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">
                  ⏰ Picks for <span className="font-bold text-blue-600 dark:text-blue-400">{pickData.round.sportName}</span> have been LOCKED since the deadline for submitting picks has passed.
                </p>
              </div>

              {/* Commissioner Contact */}
              <div className={`${alertInfoClasses} mb-8`}>
                <div className="text-center">
                    <p className={`${alertInfoTextClasses} font-medium mb-2`}>
                      💬 Contact your Commissioner, {commissioner}, if you need<br />
                      help or think you are seeing this message in error.
                    </p>
                  <p className={`${alertInfoTextClasses} text-sm`}>
                   💰 I hear {commissioner} accepts bribes! 💰 
                  </p>
                </div>
              </div>

              {/* Back to Home Button */}
              <div className="text-center">
                <Link to="/" className={buttonPrimaryClasses}>
                  🏠 Back to Home
                </Link>
              </div>
            </div>
          </div>
          

        </div>
      </div>
    );
  }

  const pickType = pickData.round.pickType || 'single';

  // Helper function to make URLs clickable
  const formatMessage = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, index) => {
      if (urlRegex.test(part)) {
        return (
          <a 
            key={index} 
            href={part} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300"
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 py-8 px-4 pb-20 transition-colors">
      <div className="max-w-2xl mx-auto">
        <div className="overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-800 dark:to-purple-800 text-white p-6">
              <h1 className="text-3xl font-bold mb-2">🏆 {appTitle}</h1>

          </div>

          {/* Content */}
          <div className="p-6">
            <div className="mb-6">

            <h2 className={`${headingClasses} mb-2`}>
                Hello, <span className="font-semibold">{pickData.user.name}</span>!
              </h2>
              <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">
                It's time to make Your Pick{pickType === 'multiple' && 's'} for {pickData.round.sportName}
              </p>

              {/* Commissioner Message */}
              {pickData.round.email_message && !success && (
                <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-r-md">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                    Message from the Commissioner:
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 whitespace-pre-wrap">
                    {formatMessage(pickData.round.email_message)}
                  </p>
                </div>
              )}

            </div>


            {/* Success Message */}
            {success && (
              <div className={`${alertSuccessClasses} mb-6`}>
                <div className="flex items-start">
                  <svg className="h-5 w-5 text-green-400 dark:text-green-300 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className={`${alertSuccessTextClasses} font-medium`}>{success}</p>
                    {pickData.currentPick && pickData.currentPick.pickItems && (
                      <div className="mt-3">
                        <p className={`${alertSuccessTextClasses} font-semibold mb-2`}>Your submitted picks:</p>
                        <ul className={`${alertSuccessTextClasses} list-disc list-inside`}>
                          {pickData.currentPick.pickItems.map((item: any, i: number) => (
                            <li key={i}>{item.pickValue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && pickData && (
              <div className={`${alertErrorClasses} mb-6`}>
                <p className={alertErrorTextClasses}>{error}</p>
              </div>
            )}

            {/* Pick Form - Hide after successful submission */}
            {!success && (
              <form onSubmit={handleSubmit} className="space-y-6">
              {pickType === 'single' ? (
                /* Single Pick Type - Dropdown */
                <div>
                  <label className={labelClasses}>
                    Your Pick:
                  </label>
                  {pickData.teams && pickData.teams.length > 0 ? (
                    <select
                      value={championPick}
                      onChange={(e) => setChampionPick(e.target.value)}
                      className={`${selectClasses} py-3`}
                      required
                    >
                      <option value="">Select a team/player...</option>
                      {pickData.teams.map((team: string) => (
                        <option key={team} value={team}>{team}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md p-4 text-center">
                      <p className={bodyTextClasses}>No teams available for this round.</p>
                    </div>
                  )}
                </div>
              ) : (
                /* Multiple Pick Type - Write-in Text Boxes */
                <div className="space-y-4">
                  <div className={`${alertInfoClasses} mb-4`}>
                    <p className={alertInfoTextClasses}>
                        <strong>Instructions:</strong> {pickData.round.sportName} requires a manual pick.  Please enter your picks below and click submit.
                    </p>
                  </div>
                  
                  {writeInPicks.map((pick, index) => (
                    <div key={index}>
                      <label className={labelClasses}>
                        Pick {index + 1} {index === 0 && '*'}
                      </label>
                      <input
                        type="text"
                        value={pick}
                        onChange={(e) => {
                          const newPicks = [...writeInPicks];
                          newPicks[index] = e.target.value;
                          setWriteInPicks(newPicks);
                        }}
                        placeholder={`Enter team/player name for pick ${index + 1}`}
                        className={`${inputClasses} py-3`}
                        required={index === 0}
                      />
                    </div>
                  ))}
                  
                  <p className={`${helpTextClasses} italic`}>
                    * At least one pick is required
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-md font-semibold hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {submitting ? 'Submitting...' : pickType === 'multiple' ? 'Submit Picks' : 'Submit Pick'}
              </button>
            </form>
            )}

            {/* Lock Time Warning */}
            <div className={`${alertWarningClasses} mb-6 mt-4`}>
              <p className={alertWarningTextClasses}>
                <strong>Lock Time:</strong> {new Date(pickData.round.lockTime).toLocaleString('en-US', {
                  timeZone: pickData.round.timezone,
                  dateStyle: 'full',
                  timeStyle: 'short'
                })} {pickData.round.timezone}
              </p>
              <p className={`${alertWarningTextClasses} text-xs mt-1`}>
                You can return to this page and update your pick{pickType === 'multiple' && 's'} anytime before this deadline.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}