import { Router, Request, Response } from 'express';
import logger from '../utils/logger';

const router = Router();

// API Documentation endpoint
router.get('/', async (req: Request, res: Response) => {
  try {
    const baseUrl = process.env.APP_URL || 'http://localhost:3003';
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Go Make Your Picks - API Documentation</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f8f9fa;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 0;
            margin-bottom: 30px;
            border-radius: 10px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
        }
        
        .header p {
            font-size: 1.2rem;
            opacity: 0.9;
        }
        
        .section {
            background: white;
            margin-bottom: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .section-header {
            background: #f8f9fa;
            padding: 20px;
            border-bottom: 1px solid #e9ecef;
        }
        
        .section-header h2 {
            color: #495057;
            margin-bottom: 5px;
        }
        
        .section-header p {
            color: #6c757d;
            font-size: 0.95rem;
        }
        
        .endpoint {
            padding: 20px;
            border-bottom: 1px solid #e9ecef;
        }
        
        .endpoint:last-child {
            border-bottom: none;
        }
        
        .endpoint-header {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
        }
        
        .method {
            padding: 4px 8px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 0.8rem;
            margin-right: 10px;
            min-width: 60px;
            text-align: center;
        }
        
        .method.get { background: #d4edda; color: #155724; }
        .method.post { background: #cce5ff; color: #004085; }
        .method.put { background: #fff3cd; color: #856404; }
        .method.delete { background: #f8d7da; color: #721c24; }
        
        .path {
            font-family: 'Monaco', 'Menlo', monospace;
            background: #f8f9fa;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.9rem;
        }
        
        .description {
            margin: 10px 0;
            color: #495057;
        }
        
        .details {
            margin-top: 10px;
        }
        
        .detail-item {
            margin: 5px 0;
            font-size: 0.9rem;
        }
        
        .detail-label {
            font-weight: bold;
            color: #495057;
        }
        
        .auth-note {
            background: #e3f2fd;
            border-left: 4px solid #2196f3;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        
        .rate-limit {
            background: #fff3e0;
            border-left: 4px solid #ff9800;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        
        .example {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 4px;
            padding: 15px;
            margin: 10px 0;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 0.85rem;
            overflow-x: auto;
        }
        
        .toc {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }
        
        .toc h3 {
            margin-bottom: 15px;
            color: #495057;
        }
        
        .toc ul {
            list-style: none;
        }
        
        .toc li {
            margin: 5px 0;
        }
        
        .toc a {
            color: #007bff;
            text-decoration: none;
        }
        
        .toc a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏆 Go Make Your Picks API</h1>
            <p>Complete API Documentation</p>
        </div>
        
        <div class="toc">
            <h3>📋 Table of Contents</h3>
            <ul>
                <li><a href="#public">🌐 Public Endpoints</a></li>
                <li><a href="#admin">🔐 Admin Endpoints</a></li>
                <li><a href="#auth">🔑 Authentication Endpoints</a></li>
                <li><a href="#examples">💡 Examples</a></li>
            </ul>
        </div>
        
        <div class="auth-note">
            <strong>🔐 Authentication:</strong> Admin endpoints require a Bearer token in the Authorization header. 
            Get your token from <code>/api/auth/login</code> or <code>/api/auth/verify-magic-link</code>
        </div>
        
        <div class="rate-limit">
            <strong>⏱️ Rate Limiting:</strong> Public endpoints: 100 requests/15min, Magic links: 5/hour, 
            Pick submission: 10/hour, Admin actions: 50/15min
        </div>
        
        <div class="section" id="public">
            <div class="section-header">
                <h2>🌐 Public Endpoints</h2>
                <p>No authentication required - accessible to everyone</p>
            </div>
            
            <div class="endpoint">
                <div class="endpoint-header">
                    <span class="method get">GET</span>
                    <span class="path">/api/health</span>
                </div>
                <div class="description">Health check endpoint</div>
                <div class="details">
                    <div class="detail-item"><span class="detail-label">Response:</span> Health status and service information</div>
                </div>
            </div>
            
            <div class="endpoint">
                <div class="endpoint-header">
                    <span class="method get">GET</span>
                    <span class="path">/api/public/config</span>
                </div>
                <div class="description">Get client-side configuration</div>
                <div class="details">
                    <div class="detail-item"><span class="detail-label">Response:</span> Configuration object with feature flags</div>
                </div>
            </div>
            
            <div class="endpoint">
                <div class="endpoint-header">
                    <span class="method get">GET</span>
                    <span class="path">/api/public/seasons</span>
                </div>
                <div class="description">Get all seasons with leaderboards</div>
                <div class="details">
                    <div class="detail-item"><span class="detail-label">Response:</span> Array of seasons with current standings</div>
                </div>
            </div>
            
            <div class="endpoint">
                <div class="endpoint-header">
                    <span class="method get">GET</span>
                    <span class="path">/api/public/seasons/default</span>
                </div>
                <div class="description">Get default season</div>
                <div class="details">
                    <div class="detail-item"><span class="detail-label">Response:</span> Default season object</div>
                </div>
            </div>
            
            <div class="endpoint">
                <div class="endpoint-header">
                    <span class="method get">GET</span>
                    <span class="path">/api/public/seasons/active</span>
                </div>
                <div class="description">Get active seasons</div>
                <div class="details">
                    <div class="detail-item"><span class="detail-label">Response:</span> Array of active seasons</div>
                </div>
            </div>
            
            <div class="endpoint">
                <div class="endpoint-header">
                    <span class="method get">GET</span>
                    <span class="path">/api/public/seasons/:id/winners</span>
                </div>
                <div class="description">Get season winners</div>
                <div class="details">
                    <div class="detail-item"><span class="detail-label">Response:</span> Array of season winners</div>
                </div>
            </div>
            
            <div class="endpoint">
                <div class="endpoint-header">
                    <span class="method get">GET</span>
                    <span class="path">/api/public/seasons/champions</span>
                </div>
                <div class="description">Get all champions (season and historical)</div>
                <div class="details">
                    <div class="detail-item"><span class="detail-label">Response:</span> Champions data with app settings</div>
                </div>
            </div>
            
            <div class="endpoint">
                <div class="endpoint-header">
                    <span class="method get">GET</span>
                    <span class="path">/api/public/leaderboard/season/:seasonId</span>
                </div>
                <div class="description">Get season leaderboard</div>
                <div class="details">
                    <div class="detail-item"><span class="detail-label">Response:</span> Leaderboard with user standings</div>
                </div>
            </div>
            
            <div class="endpoint">
                <div class="endpoint-header">
                    <span class="method get">GET</span>
                    <span class="path">/api/public/leaderboard/season/:seasonId/graph</span>
                </div>
                <div class="description">Get cumulative points graph data</div>
                <div class="details">
                    <div class="detail-item"><span class="detail-label">Response:</span> Graph data for points over time</div>
                </div>
            </div>
            
            <div class="endpoint">
                <div class="endpoint-header">
                    <span class="method get">GET</span>
                    <span class="path">/api/public/settings</span>
                </div>
                <div class="description">Get app settings</div>
                <div class="details">
                    <div class="detail-item"><span class="detail-label">Response:</span> Application settings and configuration</div>
                </div>
            </div>
            
            <div class="endpoint">
                <div class="endpoint-header">
                    <span class="method get">GET</span>
                    <span class="path">/api/picks/validate/:token</span>
                </div>
                <div class="description">Validate magic link token</div>
                <div class="details">
                    <div class="detail-item"><span class="detail-label">Response:</span> Round information and user details</div>
                </div>
            </div>
            
            <div class="endpoint">
                <div class="endpoint-header">
                    <span class="method post">POST</span>
                    <span class="path">/api/picks/:token</span>
                </div>
                <div class="description">Submit pick via magic link</div>
                <div class="details">
                    <div class="detail-item"><span class="detail-label">Body:</span> picks: Array of pick values, userId: for shared email scenarios</div>
                    <div class="detail-item"><span class="detail-label">Response:</span> Success message</div>
                </div>
            </div>
        </div>
        
        <div class="section" id="admin">
            <div class="section-header">
                <h2>🔐 Admin Endpoints</h2>
                <p>Require admin authentication - include 'Authorization: Bearer &lt;token&gt;' header</p>
            </div>
            
            <div class="endpoint">
                <div class="endpoint-header">
                    <span class="method get">GET</span>
                    <span class="path">/api/admin/admins</span>
                </div>
                <div class="description">Get all admins</div>
                <div class="details">
                    <div class="detail-item"><span class="detail-label">Response:</span> Array of admin users</div>
                </div>
            </div>
            
            <div class="endpoint">
                <div class="endpoint-header">
                    <span class="method get">GET</span>
                    <span class="path">/api/admin/users</span>
                </div>
                <div class="description">Get all users/players</div>
                <div class="details">
                    <div class="detail-item"><span class="detail-label">Response:</span> Array of user accounts</div>
                </div>
            </div>
            
            <div class="endpoint">
                <div class="endpoint-header">
                    <span class="method get">GET</span>
                    <span class="path">/api/admin/rounds</span>
                </div>
                <div class="description">Get all rounds</div>
                <div class="details">
                    <div class="detail-item"><span class="detail-label">Response:</span> Array of all rounds</div>
                </div>
            </div>
            
            <div class="endpoint">
                <div class="endpoint-header">
                    <span class="method get">GET</span>
                    <span class="path">/api/admin/rounds/season/:seasonId</span>
                </div>
                <div class="description">Get rounds for a season</div>
                <div class="details">
                    <div class="detail-item"><span class="detail-label">Response:</span> Array of rounds for specific season</div>
                </div>
            </div>
            
            <div class="endpoint">
                <div class="endpoint-header">
                    <span class="method get">GET</span>
                    <span class="path">/api/admin/rounds/:id</span>
                </div>
                <div class="description">Get specific round</div>
                <div class="details">
                    <div class="detail-item"><span class="detail-label">Response:</span> Round details with teams and picks</div>
                </div>
            </div>
            
            <div class="endpoint">
                <div class="endpoint-header">
                    <span class="method post">POST</span>
                    <span class="path">/api/admin/rounds</span>
                </div>
                <div class="description">Create new round</div>
                <div class="details">
                    <div class="detail-item"><span class="detail-label">Body:</span> Round details (sport_name, lock_time, etc.)</div>
                    <div class="detail-item"><span class="detail-label">Response:</span> Created round object</div>
                </div>
            </div>
            
            <div class="endpoint">
                <div class="endpoint-header">
                    <span class="method put">PUT</span>
                    <span class="path">/api/admin/rounds/:id</span>
                </div>
                <div class="description">Update round</div>
                <div class="details">
                    <div class="detail-item"><span class="detail-label">Body:</span> Updated round details</div>
                    <div class="detail-item"><span class="detail-label">Response:</span> Updated round object</div>
                </div>
            </div>
            
            <div class="endpoint">
                <div class="endpoint-header">
                    <span class="method post">POST</span>
                    <span class="path">/api/admin/rounds/:id/activate</span>
                </div>
                <div class="description">Activate round and send magic links</div>
                <div class="details">
                    <div class="detail-item"><span class="detail-label">Response:</span> Activation status and email counts</div>
                </div>
            </div>
            
            <div class="endpoint">
                <div class="endpoint-header">
                    <span class="method post">POST</span>
                    <span class="path">/api/admin/rounds/:id/complete</span>
                </div>
                <div class="description">Complete round and calculate scores</div>
                <div class="details">
                    <div class="detail-item"><span class="detail-label">Body:</span> Final results (first_place_team, etc.)</div>
                    <div class="detail-item"><span class="detail-label">Response:</span> Completion status and scoring results</div>
                </div>
            </div>
            
            <div class="endpoint">
                <div class="endpoint-header">
                    <span class="method post">POST</span>
                    <span class="path">/api/admin/rounds/:id/lock</span>
                </div>
                <div class="description">Lock round (prevent new picks)</div>
                <div class="details">
                    <div class="detail-item"><span class="detail-label">Response:</span> Lock status</div>
                </div>
            </div>
            
            <div class="endpoint">
                <div class="endpoint-header">
                    <span class="method post">POST</span>
                    <span class="path">/api/admin/rounds/:id/unlock</span>
                </div>
                <div class="description">Unlock round (allow new picks)</div>
                <div class="details">
                    <div class="detail-item"><span class="detail-label">Response:</span> Unlock status</div>
                </div>
            </div>
            
            <div class="endpoint">
                <div class="endpoint-header">
                    <span class="method post">POST</span>
                    <span class="path">/api/admin/rounds/:id/teams</span>
                </div>
                <div class="description">Add teams to round</div>
                <div class="details">
                    <div class="detail-item"><span class="detail-label">Body:</span> Array of team names</div>
                    <div class="detail-item"><span class="detail-label">Response:</span> Teams added confirmation</div>
                </div>
            </div>
            
            <div class="endpoint">
                <div class="endpoint-header">
                    <span class="method delete">DELETE</span>
                    <span class="path">/api/admin/rounds/:id/teams</span>
                </div>
                <div class="description">Remove all teams from round</div>
                <div class="details">
                    <div class="detail-item"><span class="detail-label">Response:</span> Teams removed confirmation</div>
                </div>
            </div>
            
            <div class="endpoint">
                <div class="endpoint-header">
                    <span class="method get">GET</span>
                    <span class="path">/api/admin/seasons</span>
                </div>
                <div class="description">Get all seasons (admin view)</div>
                <div class="details">
                    <div class="detail-item"><span class="detail-label">Response:</span> Array of seasons with admin details</div>
                </div>
            </div>
            
            <div class="endpoint">
                <div class="endpoint-header">
                    <span class="method post">POST</span>
                    <span class="path">/api/admin/seasons</span>
                </div>
                <div class="description">Create new season</div>
                <div class="details">
                    <div class="detail-item"><span class="detail-label">Body:</span> Season details (name, year_start, year_end, etc.)</div>
                    <div class="detail-item"><span class="detail-label">Response:</span> Created season object</div>
                </div>
            </div>
            
            <div class="endpoint">
                <div class="endpoint-header">
                    <span class="method put">PUT</span>
                    <span class="path">/api/admin/seasons/:id</span>
                </div>
                <div class="description">Update season</div>
                <div class="details">
                    <div class="detail-item"><span class="detail-label">Body:</span> Updated season details</div>
                    <div class="detail-item"><span class="detail-label">Response:</span> Updated season object</div>
                </div>
            </div>
            
            <div class="endpoint">
                <div class="endpoint-header">
                    <span class="method post">POST</span>
                    <span class="path">/api/admin/seasons/:id/end</span>
                </div>
                <div class="description">End season and calculate final standings</div>
                <div class="details">
                    <div class="detail-item"><span class="detail-label">Response:</span> Season ended with winners</div>
                </div>
            </div>
            
            <div class="endpoint">
                <div class="endpoint-header">
                    <span class="method get">GET</span>
                    <span class="path">/api/admin/season-participants/:seasonId</span>
                </div>
                <div class="description">Get season participants</div>
                <div class="details">
                    <div class="detail-item"><span class="detail-label">Response:</span> Array of participants for season</div>
                </div>
            </div>
            
            <div class="endpoint">
                <div class="endpoint-header">
                    <span class="method post">POST</span>
                    <span class="path">/api/admin/season-participants/:seasonId/participants</span>
                </div>
                <div class="description">Add participant to season</div>
                <div class="details">
                    <div class="detail-item"><span class="detail-label">Body:</span> User ID to add</div>
                    <div class="detail-item"><span class="detail-label">Response:</span> Participant added confirmation</div>
                </div>
            </div>
            
            <div class="endpoint">
                <div class="endpoint-header">
                    <span class="method delete">DELETE</span>
                    <span class="path">/api/admin/season-participants/:seasonId/participants/:userId</span>
                </div>
                <div class="description">Remove participant from season</div>
                <div class="details">
                    <div class="detail-item"><span class="detail-label">Response:</span> Participant removed confirmation</div>
                </div>
            </div>
            
            <div class="endpoint">
                <div class="endpoint-header">
                    <span class="method get">GET</span>
                    <span class="path">/api/admin/settings</span>
                </div>
                <div class="description">Get app settings (admin view)</div>
                <div class="details">
                    <div class="detail-item"><span class="detail-label">Response:</span> Settings with admin controls</div>
                </div>
            </div>
            
            <div class="endpoint">
                <div class="endpoint-header">
                    <span class="method put">PUT</span>
                    <span class="path">/api/admin/settings</span>
                </div>
                <div class="description">Update app settings</div>
                <div class="details">
                    <div class="detail-item"><span class="detail-label">Body:</span> Settings object</div>
                    <div class="detail-item"><span class="detail-label">Response:</span> Updated settings</div>
                </div>
            </div>
            
            <div class="endpoint">
                <div class="endpoint-header">
                    <span class="method get">GET</span>
                    <span class="path">/api/admin/historical-champions</span>
                </div>
                <div class="description">Get historical champions</div>
                <div class="details">
                    <div class="detail-item"><span class="detail-label">Response:</span> Array of historical champions</div>
                </div>
            </div>
            
            <div class="endpoint">
                <div class="endpoint-header">
                    <span class="method post">POST</span>
                    <span class="path">/api/admin/historical-champions</span>
                </div>
                <div class="description">Create historical champion</div>
                <div class="details">
                    <div class="detail-item"><span class="detail-label">Body:</span> Champion details</div>
                    <div class="detail-item"><span class="detail-label">Response:</span> Created champion object</div>
                </div>
            </div>
            
            <div class="endpoint">
                <div class="endpoint-header">
                    <span class="method get">GET</span>
                    <span class="path">/api/admin/picks/:roundId/:userId</span>
                </div>
                <div class="description">Get user's picks for a round</div>
                <div class="details">
                    <div class="detail-item"><span class="detail-label">Response:</span> User's picks for specific round</div>
                </div>
            </div>
            
            <div class="endpoint">
                <div class="endpoint-header">
                    <span class="method post">POST</span>
                    <span class="path">/api/admin/picks</span>
                </div>
                <div class="description">Create pick for user (admin)</div>
                <div class="details">
                    <div class="detail-item"><span class="detail-label">Body:</span> Pick details (user_id, round_id, picks)</div>
                    <div class="detail-item"><span class="detail-label">Response:</span> Created pick object</div>
                </div>
            </div>
        </div>
        
        <div class="section" id="auth">
            <div class="section-header">
                <h2>🔑 Authentication Endpoints</h2>
                <p>Handle admin login and authentication</p>
            </div>
            
            <div class="endpoint">
                <div class="endpoint-header">
                    <span class="method post">POST</span>
                    <span class="path">/api/auth/request-login</span>
                </div>
                <div class="description">Request login (check if password or magic link required)</div>
                <div class="details">
                    <div class="detail-item"><span class="detail-label">Body:</span> email: string</div>
                    <div class="detail-item"><span class="detail-label">Response:</span> Login method required</div>
                </div>
            </div>
            
            <div class="endpoint">
                <div class="endpoint-header">
                    <span class="method post">POST</span>
                    <span class="path">/api/auth/send-magic-link</span>
                </div>
                <div class="description">Send magic link for secondary admins</div>
                <div class="details">
                    <div class="detail-item"><span class="detail-label">Body:</span> email: string</div>
                    <div class="detail-item"><span class="detail-label">Response:</span> Magic link sent confirmation</div>
                </div>
            </div>
            
            <div class="endpoint">
                <div class="endpoint-header">
                    <span class="method post">POST</span>
                    <span class="path">/api/auth/login</span>
                </div>
                <div class="description">Login with email and password (main admin)</div>
                <div class="details">
                    <div class="detail-item"><span class="detail-label">Body:</span> email: string, password: string</div>
                    <div class="detail-item"><span class="detail-label">Response:</span> JWT token and admin info</div>
                </div>
            </div>
            
            <div class="endpoint">
                <div class="endpoint-header">
                    <span class="method post">POST</span>
                    <span class="path">/api/auth/verify-magic-link</span>
                </div>
                <div class="description">Verify magic link token</div>
                <div class="details">
                    <div class="detail-item"><span class="detail-label">Body:</span> token: string</div>
                    <div class="detail-item"><span class="detail-label">Response:</span> JWT token and admin info</div>
                </div>
            </div>
            
            <div class="endpoint">
                <div class="endpoint-header">
                    <span class="method get">GET</span>
                    <span class="path">/api/auth/me</span>
                </div>
                <div class="description">Get current admin info</div>
                <div class="details">
                    <div class="detail-item"><span class="detail-label">Headers:</span> Authorization: Bearer &lt;token&gt;</div>
                    <div class="detail-item"><span class="detail-label">Response:</span> Current admin details</div>
                </div>
            </div>
            
            <div class="endpoint">
                <div class="endpoint-header">
                    <span class="method post">POST</span>
                    <span class="path">/api/auth/change-password</span>
                </div>
                <div class="description">Change password (main admin only)</div>
                <div class="details">
                    <div class="detail-item"><span class="detail-label">Headers:</span> Authorization: Bearer &lt;token&gt;</div>
                    <div class="detail-item"><span class="detail-label">Body:</span> currentPassword: string, newPassword: string</div>
                    <div class="detail-item"><span class="detail-label">Response:</span> Password changed confirmation</div>
                </div>
            </div>
            
            <div class="endpoint">
                <div class="endpoint-header">
                    <span class="method post">POST</span>
                    <span class="path">/api/auth/forgot-password</span>
                </div>
                <div class="description">Request password reset</div>
                <div class="details">
                    <div class="detail-item"><span class="detail-label">Body:</span> email: string</div>
                    <div class="detail-item"><span class="detail-label">Response:</span> Reset email sent confirmation</div>
                </div>
            </div>
            
            <div class="endpoint">
                <div class="endpoint-header">
                    <span class="method post">POST</span>
                    <span class="path">/api/auth/reset-password</span>
                </div>
                <div class="description">Reset password with token</div>
                <div class="details">
                    <div class="detail-item"><span class="detail-label">Body:</span> token: string, password: string</div>
                    <div class="detail-item"><span class="detail-label">Response:</span> Password reset confirmation</div>
                </div>
            </div>
        </div>
        
        <div class="section" id="examples">
            <div class="section-header">
                <h2>💡 Examples</h2>
                <p>Common request examples</p>
            </div>
            
            <div class="endpoint">
                <div class="description">Public Request Example:</div>
                <div class="example">
GET ${baseUrl}/api/public/seasons
Headers: None required
                </div>
            </div>
            
            <div class="endpoint">
                <div class="description">Admin Request Example:</div>
                <div class="example">
GET ${baseUrl}/api/admin/users
Headers: {
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "Content-Type": "application/json"
}
                </div>
            </div>
            
            <div class="endpoint">
                <div class="description">Pick Submission Example:</div>
                <div class="example">
POST ${baseUrl}/api/picks/abc123def456
Body: {
  "picks": ["Team A", "Team B", "Team C"],
  "userId": 123
}
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    logger.error('Error generating API docs', { error });
    res.status(500).json({ error: 'Failed to generate API documentation' });
  }
});

export default router;
