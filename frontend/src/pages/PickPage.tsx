// Copyright (c) 2025 Andrew Busbee
// Licensed under the MIT License. See LICENSE file for details.

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import logger from '../utils/logger';
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
  const [magicToken, setMagicToken] = useState<string | null>(token || null); // Store token in state before URL cleanup
  const [pickData, setPickData] = useState<any>(null);
  const [championPick, setChampionPick] = useState<string | number>(''); // Can be team ID (number) or empty string
  const [writeInPicks, setWriteInPicks] = useState<string[]>([]);
  const [userPicks, setUserPicks] = useState<{[userId: number]: {championPick: string | number, writeInPicks: string[]}}>({});
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
    
    // Exchange magic link token for JWT if token is present in URL
    // Always exchange when a new token is in URL (even if we have an existing JWT)
    // This ensures we use the correct round if user clicks a new magic link
    if (token) {
      // Store token in state before URL cleanup
      setMagicToken(token);
      exchangeTokenForJWT(token);
    } else if (magicToken) {
      // If we already have a stored token but no new token in URL, just load data
      loadPickData();
    } else {
      // No token at all - show error
      setError('Invalid or expired link');
      setLoading(false);
    }
  }, [token]);
  
  const exchangeTokenForJWT = async (magicToken: string) => {
    try {
      const res = await api.post(`/picks/exchange/${magicToken}`);
      const { token: jwtToken, roundId } = res.data;
      
      // Always store the new JWT token (replaces any existing token)
      // This ensures we use the correct round for the new magic link
      localStorage.setItem('pickToken', jwtToken);
      
      logger.info('Magic link exchanged for JWT', { roundId });
      
      // Load pick data BEFORE cleaning URL (needs token for validate endpoint)
      await loadPickData();
      
      // Clean URL - remove token from path after exchange and data load
      window.history.replaceState({}, '', '/pick');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid or expired link');
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await api.get('/public/settings');
      setAppTitle(res.data.app_title || 'Go Make Your Picks');
      setAppTagline(res.data.app_tagline || 'Predict. Compete. Win.');
    } catch (error) {
      logger.error('Error loading settings:', error);
      // Don't throw - just use default values
    }
  };

  const loadCommissioner = async () => {
    try {
      const res = await api.get('/admin/admins/commissioner/public');
      setCurrentCommissioner(res.data.name);
    } catch (error) {
      logger.error('Error loading commissioner:', error);
      setCurrentCommissioner(null);
    }
  };

  const loadPickData = async () => {
    try {
      // Use token from state (stored before URL cleanup) or URL params
      const tokenToUse = magicToken || token;
      if (!tokenToUse) {
        // If no token available, show error
        setError('Invalid or expired link');
        setLoading(false);
        return;
      }
      
      // Use POST instead of GET to avoid token exposure in URL/logs
      const res = await api.post('/picks/validate', { token: tokenToUse });
      setPickData(res.data);
      
      // Check if round data exists before accessing properties
      if (!res.data || !res.data.round) {
        throw new Error('Invalid response from server');
      }
      
      const pickType = res.data.round.pickType || 'single';
      
      if (res.data.isSharedEmail) {
        // Handle shared email scenario
        const newUserPicks: {[userId: number]: {championPick: string, writeInPicks: string[]}} = {};
        
        res.data.users.forEach((user: any) => {
          if (user.currentPick && user.currentPick.pickItems) {
            const items = user.currentPick.pickItems;
            
            if (pickType === 'single') {
              // Find the team ID from the pick value
              const pickValue = items.length > 0 ? items[0].pickValue : '';
              const team = res.data.teams?.find((t: any) => t.name === pickValue || (typeof t === 'string' && t === pickValue));
              const teamId = team?.id || (typeof team === 'string' ? null : team);
              
              newUserPicks[user.id] = {
                championPick: teamId || pickValue, // Use ID if available, fallback to name
                writeInPicks: []
              };
            } else if (pickType === 'multiple') {
              const numPicks = res.data.round.numWriteInPicks || 1;
              const picks = new Array(numPicks).fill('');
              items.forEach((item: any) => {
                if (item.pickNumber - 1 < numPicks) {
                  picks[item.pickNumber - 1] = item.pickValue;
                }
              });
              newUserPicks[user.id] = {
                championPick: '',
                writeInPicks: picks
              };
            }
          } else {
            // No current pick - initialize based on pick type
            if (pickType === 'multiple') {
              const numPicks = res.data.round.numWriteInPicks || 1;
              newUserPicks[user.id] = {
                championPick: '',
                writeInPicks: new Array(numPicks).fill('')
              };
            } else {
              newUserPicks[user.id] = {
                championPick: '',
                writeInPicks: []
              };
            }
          }
        });
        
        setUserPicks(newUserPicks);
      } else {
        // Handle single user scenario (legacy)
        if (res.data.currentPick && res.data.currentPick.pickItems) {
          // Load existing pick items
          const items = res.data.currentPick.pickItems;
          
          if (pickType === 'single') {
            // Find the team ID from the pick value
            const pickValue = items.length > 0 ? items[0].pickValue : '';
            const team = res.data.teams?.find((t: any) => t.name === pickValue || (typeof t === 'string' && t === pickValue));
            const teamId = team?.id || (typeof team === 'string' ? null : team);
            setChampionPick(teamId || pickValue); // Use ID if available, fallback to name
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
      }
      
      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid or expired link');
      setLoading(false);
    }
  };

  // Auto-save function removed - picks now save only on "Submit All Picks"

  // Handle individual pick changes with auto-save
  const handleUserPickChange = async (userId: number, pickType: 'single' | 'multiple', value: string | number | string[], index?: number) => {
    const newUserPicks = { ...userPicks };
    
    if (!newUserPicks[userId]) {
      newUserPicks[userId] = { championPick: '', writeInPicks: [] };
    }
    
    if (pickType === 'single') {
      // Value can be team ID (number) or empty string
      newUserPicks[userId].championPick = value as string | number;
      setUserPicks(newUserPicks);
      
      // Auto-save removed for multi-user picks - saves only on "Submit All Picks"
    } else if (pickType === 'multiple') {
      const newWriteInPicks = [...newUserPicks[userId].writeInPicks];
      if (typeof index === 'number') {
        newWriteInPicks[index] = value as string;
      } else {
        newWriteInPicks.splice(0, newWriteInPicks.length, ...(value as string[]));
      }
      newUserPicks[userId].writeInPicks = newWriteInPicks;
      setUserPicks(newUserPicks);
      
      // Auto-save removed for multi-user picks - saves only on "Submit All Picks"
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    if (!pickData?.round) {
      setError('Invalid response from server');
      setSubmitting(false);
      return;
    }

    const pickType = pickData.round.pickType || 'single';

    try {
      if (pickData.isSharedEmail) {
        // Handle shared email scenario - submit all user picks sequentially
        let hasAnyPicks = false;
        
        for (const [userId, userPick] of Object.entries(userPicks)) {
          let picksToSubmit: (string | number)[] = [];
          
          if (pickType === 'single') {
            if (userPick.championPick) {
              // Submit as-is: if it's a number (ID), submit as number; if string (name), submit as string
              picksToSubmit = [userPick.championPick];
            }
          } else if (pickType === 'multiple') {
            picksToSubmit = userPick.writeInPicks.filter(p => p && p.trim().length > 0);
          }
          
          if (picksToSubmit.length > 0) {
            hasAnyPicks = true;
            // Submit each user's picks sequentially to avoid deadlocks
            // Use new JWT-based endpoint
        await api.post('/picks/submit', {
              picks: picksToSubmit,
              userId: parseInt(userId)
            });
          }
        }
        
        if (!hasAnyPicks) {
          setError('Please make at least one pick');
          setSubmitting(false);
          return;
        }
        setSuccess('All picks have been submitted successfully! You can return to this page and update them anytime before the lock time.');
      } else {
        // Handle single user scenario (legacy)
        let picksToSubmit: (string | number)[] = [];

        if (pickType === 'single') {
          // Single pick type - submit champion pick (can be team ID or name)
          if (!championPick) {
            setError('Please select a team/player');
            setSubmitting(false);
            return;
          }
          // Ensure proper type: if it's a numeric string, convert to number; otherwise keep as-is
          let pickValue: string | number = championPick;
          if (typeof championPick === 'string' && !isNaN(parseInt(championPick, 10))) {
            // It's a numeric string - convert to number for team ID
            pickValue = parseInt(championPick, 10);
          }
          picksToSubmit = [pickValue];
        } else if (pickType === 'multiple') {
          // Multiple pick type - submit write-in picks (always strings)
          picksToSubmit = writeInPicks.filter(p => p && p.trim().length > 0);
          
          if (picksToSubmit.length === 0) {
            setError('Please enter at least one pick');
            setSubmitting(false);
            return;
          }
        }

        // Use new JWT-based endpoint
        await api.post('/picks/submit', {
          picks: picksToSubmit
        });
        
        setSuccess('Your pick has been submitted successfully! You can return to this page and update it anytime before the lock time.');
      }
      
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
    if (pickData?.round?.status === 'locked') {
      return true;
    }
    
    // Check if past scheduled lock time
    if (pickData?.round?.lockTime) {
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
                  ⏰ Picks for <span className="font-bold text-blue-600 dark:text-blue-400">{pickData?.round?.sportName || 'this round'}</span> have been LOCKED since the deadline for submitting picks has passed.
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
                Hello, <span className="font-semibold">
                  {pickData.isSharedEmail 
                    ? pickData.users.map((user: any, index: number) => {
                        if (index === 0) return user.name;
                        if (index === pickData.users.length - 1) return `, and ${user.name}`;
                        return `, ${user.name}`;
                      }).join('')
                    : pickData.user.name
                  }!
                </span>
              </h2>
              <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">
                {pickData.isSharedEmail 
                  ? `Make your picks for ${pickData?.round?.sportName || 'this round'} below:`
                  : `It's time to make Your Pick${pickType === 'multiple' && 's'} for ${pickData?.round?.sportName || 'this round'}`
                }
              </p>

              {/* Commissioner Message */}
              {pickData?.round?.email_message && !success && (
                <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-r-md">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                    Message from the Commissioner:
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 whitespace-pre-wrap">
                    {formatMessage(pickData?.round?.email_message || '')}
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
                    {pickData.isSharedEmail ? (
                      /* Show all users' submitted picks */
                      <div className="mt-3">
                        <p className={`${alertSuccessTextClasses} font-semibold mb-2`}>Submitted picks:</p>
                        {pickData.users.map((user: any) => (
                          <div key={user.id} className="mb-2">
                            <p className={`${alertSuccessTextClasses} font-medium`}>{user.name}:</p>
                            {user.currentPick && user.currentPick.pickItems ? (
                              <ul className={`${alertSuccessTextClasses} list-disc list-inside ml-4`}>
                                {user.currentPick.pickItems.map((item: any, i: number) => (
                                  <li key={i}>{item.pickValue}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className={`${alertSuccessTextClasses} text-sm italic`}>No picks submitted</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      /* Show single user's submitted picks */
                      pickData.currentPick && pickData.currentPick.pickItems && (
                        <div className="mt-3">
                          <p className={`${alertSuccessTextClasses} font-semibold mb-2`}>Your submitted picks:</p>
                          <ul className={`${alertSuccessTextClasses} list-disc list-inside`}>
                            {pickData.currentPick.pickItems.map((item: any, i: number) => (
                              <li key={i}>{item.pickValue}</li>
                            ))}
                          </ul>
                        </div>
                      )
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
                {pickData.isSharedEmail ? (
                  /* Shared Email Scenario - Multiple Users */
                  <div className="space-y-6">
                    {/* Instructions for multiple pick type - show only once above first user */}
                    {pickType === 'multiple' && (
                      <div className={`${alertInfoClasses} mb-4`}>
                        <p className={alertInfoTextClasses}>
                          <strong>Instructions:</strong> {pickData?.round?.sportName || 'This round'} requires a manual pick. Please enter your picks below.
                        </p>
                      </div>
                    )}
                    
                    {pickData.users.map((user: any) => (
                      <div key={user.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center mb-4">
                          <span className="text-2xl mr-3">👤</span>
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">{user.name}'s Pick</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Status: {user.currentPick ? '✅ Submitted' : 'Not submitted'}
                            </p>
                          </div>
                        </div>
                        
                        {pickType === 'single' ? (
                          /* Single Pick Type - Dropdown */
                          <div>
                            <label className={labelClasses}>
                              Your Pick:
                            </label>
                            {pickData.teams && pickData.teams.length > 0 ? (
                              <select
                                value={userPicks[user.id]?.championPick || ''}
                                onChange={(e) => {
                                  // HTML form elements always return strings, so we need to convert
                                  // Convert string value to number if it's a numeric ID, otherwise keep as string (for team names)
                                  const value = e.target.value;
                                  if (!value) {
                                    handleUserPickChange(user.id, 'single', '');
                                    return;
                                  }
                                  // Try to parse as number (team ID)
                                  const numValue = parseInt(value, 10);
                                  if (!isNaN(numValue) && numValue > 0) {
                                    // It's a valid team ID - send as number
                                    handleUserPickChange(user.id, 'single', numValue);
                                  } else {
                                    // It's a team name (string) - send as string
                                    handleUserPickChange(user.id, 'single', value);
                                  }
                                }}
                                className={`${selectClasses} py-3`}
                              >
                                <option value="">Select a team/player...</option>
                                {pickData.teams.map((team: any) => {
                                  // Handle both old format (string) and new format ({id, name})
                                  const teamId = typeof team === 'object' ? team.id : null;
                                  const teamName = typeof team === 'object' ? team.name : team;
                                  return (
                                    <option key={teamId || teamName} value={teamId || teamName}>
                                      {teamName}
                                    </option>
                                  );
                                })}
                              </select>
                            ) : (
                              <div className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md p-4 text-center">
                                <p className={bodyTextClasses}>No teams available for this round.</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Multiple Pick Type - Write-in Text Boxes */
                          <div className="space-y-4">
                            {(userPicks[user.id]?.writeInPicks || []).map((pick, index) => (
                              <div key={index}>
                                <label className={labelClasses}>
                                  Pick {index + 1} {index === 0 && '*'}
                                </label>
                                <input
                                  type="text"
                                  value={pick}
                                  onChange={(e) => {
                                    const newPicks = [...(userPicks[user.id]?.writeInPicks || [])];
                                    newPicks[index] = e.target.value;
                                    handleUserPickChange(user.id, 'multiple', newPicks);
                                  }}
                                  placeholder={`Enter team/player name for pick ${index + 1}`}
                                  className={`${inputClasses} py-3`}
                                />
                              </div>
                            ))}
                            
                            <p className={`${helpTextClasses} italic`}>
                              * At least one pick is required
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Single User Scenario (Legacy) */
                  pickType === 'single' ? (
                    /* Single Pick Type - Dropdown */
                    <div>
                      <label className={labelClasses}>
                        Your Pick:
                      </label>
                      {pickData.teams && pickData.teams.length > 0 ? (
                        <select
                          value={championPick}
                          onChange={(e) => {
                            // HTML form elements always return strings, so we need to convert
                            // Convert string value to number if it's a numeric ID, otherwise keep as string (for team names)
                            const value = e.target.value;
                            if (!value) {
                              setChampionPick('');
                              return;
                            }
                            // Try to parse as number (team ID)
                            const numValue = parseInt(value, 10);
                            if (!isNaN(numValue) && numValue > 0) {
                              // It's a valid team ID - store as number
                              setChampionPick(numValue);
                            } else {
                              // It's a team name (string) - keep as string
                              setChampionPick(value);
                            }
                          }}
                          className={`${selectClasses} py-3`}
                          required
                        >
                          <option value="">Select a team/player...</option>
                          {pickData.teams.map((team: any) => {
                            // Handle both old format (string) and new format ({id, name})
                            const teamId = typeof team === 'object' ? team.id : null;
                            const teamName = typeof team === 'object' ? team.name : team;
                            return (
                              <option key={teamId || teamName} value={teamId || teamName}>
                                {teamName}
                              </option>
                            );
                          })}
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
                            <strong>Instructions:</strong> {pickData?.round?.sportName || 'This round'} requires a manual pick.  Please enter your picks below and click submit.
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
                  )
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-md font-semibold hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {submitting ? 'Submitting...' : pickData.isSharedEmail ? 'Submit All Picks' : (pickType === 'multiple' ? 'Submit Picks' : 'Submit Pick')}
                </button>
              </form>
            )}

            {/* Lock Time Warning */}
            <div className={`${alertWarningClasses} mb-6 mt-4`}>
              <p className={alertWarningTextClasses}>
                <strong>Lock Time:</strong> {pickData?.round?.lockTime ? new Date(pickData.round.lockTime).toLocaleString('en-US', {
                  timeZone: pickData?.round?.timezone || 'UTC',
                  dateStyle: 'full',
                  timeStyle: 'short'
                }) + ' ' + (pickData?.round?.timezone || 'UTC') : 'Not available'}
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