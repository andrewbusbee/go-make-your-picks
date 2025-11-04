import { useRef, useEffect } from 'react';
import {
  cardClasses,
  tableClasses,
  tableHeadClasses,
  tableHeaderCellClasses,
  tableBodyClasses,
  tableCellClasses,
  tableCellSecondaryClasses,
  badgeSuccessClasses,
  badgeGrayClasses,
  overflowXAutoClasses,
  tableRowHoverClasses,
  textGrayItalicClasses,
  flexCenterClasses,
  textSmallClasses,
  textCenterClasses,
  textXsGrayNormalClasses
} from '../styles/commonClasses';

interface Round {
  id: number;
  sport_name: string;
  status: string;
  lock_time: string;
  results?: Array<{
    place: number;
    teamId: number;
    teamName: string;
  }>;
}

interface LeaderboardEntry {
  userId: number;
  userName: string;
  picks: any;
  scores: any;
  totalPoints: number;
  rank: number;
}

interface LeaderboardTableProps {
  rounds: Round[];
  leaderboard: LeaderboardEntry[];
}

export default function LeaderboardTable({ rounds, leaderboard }: LeaderboardTableProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the right on mount to show Total column
  useEffect(() => {
    if (scrollContainerRef.current) {
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
        }
      }, 100);
    }
  }, []);

  // Check if all players have 0 points (no sports completed yet)
  const allPlayersHaveZeroPoints = leaderboard.every(entry => entry.totalPoints === 0);

  // Sort alphabetically if all players have 0 points, otherwise use current order (ranked)
  const sortedLeaderboard = allPlayersHaveZeroPoints 
    ? [...leaderboard].sort((a, b) => a.userName.localeCompare(b.userName))
    : leaderboard;

  const isRoundVisible = (round: Round) => {
    return round.status === 'locked' || round.status === 'completed';
  };

  return (
    <div className={`${cardClasses} shadow-lg overflow-hidden`}>
      <div ref={scrollContainerRef} className={overflowXAutoClasses}>
        <table className={tableClasses}>
          <thead className={tableHeadClasses}>
            <tr>
              <th className={`${tableHeaderCellClasses} sticky left-0 z-10 bg-gray-50 dark:bg-gray-900 w-40 min-w-40`}>
                Player
              </th>
              {rounds.map((round) => {
                const firstPlace = round.results?.find(r => r.place === 1);
                return (
                  <th key={round.id} className={`${tableHeaderCellClasses} whitespace-nowrap w-28 md:w-32 lg:w-36`}>
                    <div className={textCenterClasses}>
                      <div>{round.sport_name}</div>
                      {firstPlace && (
                        <div className={textXsGrayNormalClasses}>
                          ({firstPlace.teamName})
                        </div>
                      )}
                    </div>
                  </th>
                );
              })}
              <th className={`${tableHeaderCellClasses} w-24 text-center`}>
                Total
              </th>
            </tr>
          </thead>
          <tbody className={tableBodyClasses}>
            {sortedLeaderboard.map((entry) => (
              <tr key={entry.userId} className={tableRowHoverClasses}>
                <td className={`${tableCellClasses} sticky left-0 z-10 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium py-2 w-40 min-w-40`}>
                  {!allPlayersHaveZeroPoints && (
                    <span className="text-gray-500 dark:text-gray-400">#{entry.rank}</span>
                  )}
                  {!allPlayersHaveZeroPoints && ' '}
                  {entry.userName}
                </td>
                {rounds.map((round) => {
                  const pick = entry.picks[round.id];
                  const score = entry.scores[round.id];
                  const visible = isRoundVisible(round);
                  
                  return (
                    <td key={round.id} className={`${tableCellSecondaryClasses} py-2 w-28 md:w-32 lg:w-36 text-center`}>
                      {visible && pick ? (
                        <div className={`${flexCenterClasses} justify-center gap-2`}>
                          <div className={`font-medium ${textSmallClasses}`}>
                            {pick.pickItems && pick.pickItems.length > 0 ? (
                              pick.pickItems.map((item: any, i: number) => (
                                <span key={i}>
                                  {item.pickValue}
                                  {i < pick.pickItems.length - 1 ? ', ' : ''}
                                </span>
                              ))
                            ) : (
                              <span className={textGrayItalicClasses}>No pick</span>
                            )}
                          </div>
                          {score && (
                            <span className={`${score.total_points > 0 ? badgeSuccessClasses : badgeGrayClasses} text-xs px-1.5 py-0.5`}>
                              {score.total_points > 0 ? '+' : ''}{score.total_points}
                            </span>
                          )}
                        </div>
                      ) : visible && !pick ? (
                        <span className={`${textGrayItalicClasses} ${textSmallClasses}`}>No pick</span>
                      ) : (
                        <span className={`text-gray-400 dark:text-gray-500 ${textSmallClasses}`}>-</span>
                      )}
                    </td>
                  );
                })}
                <td className={`${tableCellClasses} font-bold text-blue-600 dark:text-blue-400 py-2 w-24 text-center`}>
                  {entry.totalPoints} pts
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
