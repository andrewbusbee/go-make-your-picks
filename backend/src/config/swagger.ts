// Copyright (c) 2025 Andrew Busbee
// Licensed under the MIT License. See LICENSE file for details.

import swaggerJsdoc from 'swagger-jsdoc';
import { Express } from 'express';
import packageJson from '../../package.json';
import { IS_PRODUCTION } from '../utils/env';

const baseUrl = process.env.APP_URL || 'http://localhost:3003';
const serverDescription = IS_PRODUCTION ? 'Production Server' : 'Development Server';

/**
 * OpenAPI 3.0 Specification Configuration
 * 
 * To add new endpoints to the docs:
 * 1. Add JSDoc-style @openapi comments above your route handler, OR
 * 2. Add the endpoint definition to the paths object below
 * 
 * Example JSDoc format:
 * @openapi
 * /api/example:
 *   get:
 *     summary: Example endpoint
 *     tags: [Examples]
 *     responses:
 *       200:
 *         description: Success
 */

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Go Make Your Picks API',
    version: packageJson.version || '1.0.0',
    description: 'Complete API documentation for Go Make Your Picks application. Admin endpoints require Bearer token authentication.',
    contact: {
      name: 'API Support',
    },
  },
  servers: [
    {
      url: baseUrl,
      description: serverDescription,
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Admin authentication token. Get token from /api/auth/login or /api/auth/verify-magic-link',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            description: 'Error message',
          },
        },
      },
      Success: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'Success message',
          },
        },
      },
    },
  },
  tags: [
    { name: 'Health', description: 'Health check endpoints' },
    { name: 'Public', description: 'Public endpoints (no authentication required)' },
    { name: 'Authentication', description: 'Admin authentication and login' },
    { name: 'Admin - Seasons', description: 'Season management (admin only)' },
    { name: 'Admin - Rounds', description: 'Round management (admin only)' },
    { name: 'Admin - Picks', description: 'Pick management (admin only)' },
    { name: 'Admin - Users', description: 'User management (admin only)' },
    { name: 'Admin - Admins', description: 'Admin user management (admin only)' },
    { name: 'Admin - Settings', description: 'Application settings (admin only)' },
    { name: 'Admin - Participants', description: 'Season participants management (admin only)' },
    { name: 'Admin - Champions', description: 'Historical champions management (admin only)' },
    { name: 'Picks', description: 'Pick submission via magic links' },
  ],
  paths: {
    '/api/healthz': {
      get: {
        tags: ['Health'],
        summary: 'Health check endpoint',
        description: 'Lightweight health check endpoint for container monitoring. Returns simple status without exposing internal service details.',
        responses: {
          '200': {
            description: 'Service is responding',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/public/config': {
      get: {
        tags: ['Public'],
        summary: 'Get client-side configuration',
        description: 'Returns configuration object with feature flags',
        responses: {
          '200': {
            description: 'Configuration object',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  description: 'Configuration object with feature flags',
                },
              },
            },
          },
        },
      },
    },
    '/api/public/seasons': {
      get: {
        tags: ['Public'],
        summary: 'Get all seasons with leaderboards',
        description: 'Returns array of seasons with current standings',
        responses: {
          '200': {
            description: 'Array of seasons',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { type: 'object' },
                },
              },
            },
          },
        },
      },
    },
    '/api/public/seasons/default': {
      get: {
        tags: ['Public'],
        summary: 'Get default season',
        description: 'Returns the default season object',
        responses: {
          '200': {
            description: 'Default season object',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
    },
    '/api/public/seasons/active': {
      get: {
        tags: ['Public'],
        summary: 'Get active seasons',
        description: 'Returns array of currently active seasons',
        responses: {
          '200': {
            description: 'Array of active seasons',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { type: 'object' },
                },
              },
            },
          },
        },
      },
    },
    '/api/public/seasons/{id}/winners': {
      get: {
        tags: ['Public'],
        summary: 'Get season winners',
        description: 'Returns array of winners for a specific season',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            description: 'Season ID',
          },
        ],
        responses: {
          '200': {
            description: 'Array of season winners',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { type: 'object' },
                },
              },
            },
          },
        },
      },
    },
    '/api/public/seasons/champions': {
      get: {
        tags: ['Public'],
        summary: 'Get all champions',
        description: 'Returns champions data with app settings (season and historical)',
        responses: {
          '200': {
            description: 'Champions data',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
    },
    '/api/public/leaderboard/season/{seasonId}': {
      get: {
        tags: ['Public'],
        summary: 'Get season leaderboard',
        description: 'Returns leaderboard with user standings for a specific season',
        parameters: [
          {
            name: 'seasonId',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            description: 'Season ID',
          },
        ],
        responses: {
          '200': {
            description: 'Leaderboard data',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
    },
    '/api/public/leaderboard/season/{seasonId}/graph': {
      get: {
        tags: ['Public'],
        summary: 'Get cumulative points graph data',
        description: 'Returns graph data for points over time',
        parameters: [
          {
            name: 'seasonId',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            description: 'Season ID',
          },
        ],
        responses: {
          '200': {
            description: 'Graph data',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
    },
    '/api/public/settings': {
      get: {
        tags: ['Public'],
        summary: 'Get app settings',
        description: 'Returns application settings and configuration',
        responses: {
          '200': {
            description: 'Application settings',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
    },
    '/api/picks/validate/{token}': {
      get: {
        tags: ['Picks'],
        summary: 'Validate magic link token',
        description: 'Validates a magic link token and returns round information and user details',
        parameters: [
          {
            name: 'token',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Magic link token',
          },
        ],
        responses: {
          '200': {
            description: 'Round information and user details',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
    },
    '/api/picks/{token}': {
      post: {
        tags: ['Picks'],
        summary: 'Submit pick via magic link',
        description: 'Submits picks using a magic link token',
        parameters: [
          {
            name: 'token',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Magic link token',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  picks: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Array of pick values',
                  },
                  userId: {
                    type: 'integer',
                    description: 'User ID (for shared email scenarios)',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Success message',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Success' },
              },
            },
          },
        },
      },
    },
    '/api/auth/request-login': {
      post: {
        tags: ['Authentication'],
        summary: 'Request login',
        description: 'Check if email requires password or magic link authentication',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: {
                  email: { type: 'string', format: 'email' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login method required',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
    },
    '/api/auth/send-magic-link': {
      post: {
        tags: ['Authentication'],
        summary: 'Send magic link',
        description: 'Send magic link for secondary admins',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: {
                  email: { type: 'string', format: 'email' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Magic link sent confirmation',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Success' },
              },
            },
          },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Login with email and password',
        description: 'Login for main admin using email and password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', format: 'password' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'JWT token and admin info',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    token: { type: 'string' },
                    admin: { type: 'object' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/auth/verify-magic-link': {
      post: {
        tags: ['Authentication'],
        summary: 'Verify magic link token',
        description: 'Verify admin magic link token and return JWT',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token'],
                properties: {
                  token: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'JWT token and admin info',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    token: { type: 'string' },
                    admin: { type: 'object' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Get current admin info',
        description: 'Returns current authenticated admin details',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Current admin details',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
    },
    '/api/auth/change-password': {
      post: {
        tags: ['Authentication'],
        summary: 'Change password',
        description: 'Change password for main admin only',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['currentPassword', 'newPassword'],
                properties: {
                  currentPassword: { type: 'string', format: 'password' },
                  newPassword: { type: 'string', format: 'password' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Password changed confirmation',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Success' },
              },
            },
          },
        },
      },
    },
    '/api/auth/forgot-password': {
      post: {
        tags: ['Authentication'],
        summary: 'Request password reset',
        description: 'Request password reset email',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: {
                  email: { type: 'string', format: 'email' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Reset email sent confirmation',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Success' },
              },
            },
          },
        },
      },
    },
    '/api/auth/reset-password': {
      post: {
        tags: ['Authentication'],
        summary: 'Reset password with token',
        description: 'Reset password using reset token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token', 'password'],
                properties: {
                  token: { type: 'string' },
                  password: { type: 'string', format: 'password' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Password reset confirmation',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Success' },
              },
            },
          },
        },
      },
    },
    '/api/admin/admins': {
      get: {
        tags: ['Admin - Admins'],
        summary: 'Get all admins',
        description: 'Returns array of admin users',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Array of admin users',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { type: 'object' },
                },
              },
            },
          },
        },
      },
    },
    '/api/admin/users': {
      get: {
        tags: ['Admin - Users'],
        summary: 'Get all users/players',
        description: 'Returns array of user accounts',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Array of user accounts',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { type: 'object' },
                },
              },
            },
          },
        },
      },
    },
    '/api/admin/rounds': {
      get: {
        tags: ['Admin - Rounds'],
        summary: 'Get all rounds',
        description: 'Returns array of all rounds',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Array of all rounds',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { type: 'object' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Admin - Rounds'],
        summary: 'Create new round',
        description: 'Creates a new round with provided details',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  sport_name: { type: 'string' },
                  lock_time: { type: 'string', format: 'date-time' },
                  season_id: { type: 'integer' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Created round object',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
    },
    '/api/admin/rounds/season/{seasonId}': {
      get: {
        tags: ['Admin - Rounds'],
        summary: 'Get rounds for a season',
        description: 'Returns array of rounds for specific season',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'seasonId',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            description: 'Season ID',
          },
        ],
        responses: {
          '200': {
            description: 'Array of rounds for specific season',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { type: 'object' },
                },
              },
            },
          },
        },
      },
    },
    '/api/admin/rounds/{id}': {
      get: {
        tags: ['Admin - Rounds'],
        summary: 'Get specific round',
        description: 'Returns round details with teams and picks',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            description: 'Round ID',
          },
        ],
        responses: {
          '200': {
            description: 'Round details',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
      put: {
        tags: ['Admin - Rounds'],
        summary: 'Update round',
        description: 'Updates round with provided details',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            description: 'Round ID',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Updated round object',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
    },
    '/api/admin/rounds/{id}/activate': {
      post: {
        tags: ['Admin - Rounds'],
        summary: 'Activate round and send magic links',
        description: 'Activates a round and sends magic link emails to participants',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            description: 'Round ID',
          },
        ],
        responses: {
          '200': {
            description: 'Activation status and email counts',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
    },
    '/api/admin/rounds/{id}/complete': {
      post: {
        tags: ['Admin - Rounds'],
        summary: 'Complete round and calculate scores',
        description: 'Completes a round and calculates scores based on final results',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            description: 'Round ID',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  first_place_team: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Completion status and scoring results',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
    },
    '/api/admin/rounds/{id}/lock': {
      post: {
        tags: ['Admin - Rounds'],
        summary: 'Lock round',
        description: 'Locks a round to prevent new picks',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            description: 'Round ID',
          },
        ],
        responses: {
          '200': {
            description: 'Lock status',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Success' },
              },
            },
          },
        },
      },
    },
    '/api/admin/rounds/{id}/unlock': {
      post: {
        tags: ['Admin - Rounds'],
        summary: 'Unlock round',
        description: 'Unlocks a round to allow new picks',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            description: 'Round ID',
          },
        ],
        responses: {
          '200': {
            description: 'Unlock status',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Success' },
              },
            },
          },
        },
      },
    },
    '/api/admin/rounds/{id}/teams': {
      post: {
        tags: ['Admin - Rounds'],
        summary: 'Add teams to round',
        description: 'Adds teams to a round',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            description: 'Round ID',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of team names',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Teams added confirmation',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Success' },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Admin - Rounds'],
        summary: 'Remove all teams from round',
        description: 'Removes all teams from a round',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            description: 'Round ID',
          },
        ],
        responses: {
          '200': {
            description: 'Teams removed confirmation',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Success' },
              },
            },
          },
        },
      },
    },
    '/api/admin/seasons': {
      get: {
        tags: ['Admin - Seasons'],
        summary: 'Get all seasons',
        description: 'Returns array of seasons with admin details',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Array of seasons',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { type: 'object' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Admin - Seasons'],
        summary: 'Create new season',
        description: 'Creates a new season with provided details',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  year_start: { type: 'integer' },
                  year_end: { type: 'integer' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Created season object',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
    },
    '/api/admin/seasons/{id}': {
      put: {
        tags: ['Admin - Seasons'],
        summary: 'Update season',
        description: 'Updates season with provided details',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            description: 'Season ID',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Updated season object',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
    },
    '/api/admin/seasons/{id}/end': {
      post: {
        tags: ['Admin - Seasons'],
        summary: 'End season and calculate final standings',
        description: 'Ends a season and calculates final standings with winners',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            description: 'Season ID',
          },
        ],
        responses: {
          '200': {
            description: 'Season ended with winners',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
    },
    '/api/admin/season-participants/{seasonId}': {
      get: {
        tags: ['Admin - Participants'],
        summary: 'Get season participants',
        description: 'Returns array of participants for a season',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'seasonId',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            description: 'Season ID',
          },
        ],
        responses: {
          '200': {
            description: 'Array of participants',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { type: 'object' },
                },
              },
            },
          },
        },
      },
    },
    '/api/admin/season-participants/{seasonId}/participants': {
      post: {
        tags: ['Admin - Participants'],
        summary: 'Add participant to season',
        description: 'Adds a participant to a season',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'seasonId',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            description: 'Season ID',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  userId: { type: 'integer' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Participant added confirmation',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Success' },
              },
            },
          },
        },
      },
    },
    '/api/admin/season-participants/{seasonId}/participants/{userId}': {
      delete: {
        tags: ['Admin - Participants'],
        summary: 'Remove participant from season',
        description: 'Removes a participant from a season',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'seasonId',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            description: 'Season ID',
          },
          {
            name: 'userId',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            description: 'User ID',
          },
        ],
        responses: {
          '200': {
            description: 'Participant removed confirmation',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Success' },
              },
            },
          },
        },
      },
    },
    '/api/admin/settings': {
      get: {
        tags: ['Admin - Settings'],
        summary: 'Get app settings',
        description: 'Returns application settings with admin controls',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Settings object',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
      put: {
        tags: ['Admin - Settings'],
        summary: 'Update app settings',
        description: 'Updates application settings',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Updated settings',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
    },
    '/api/admin/historical-champions': {
      get: {
        tags: ['Admin - Champions'],
        summary: 'Get historical champions',
        description: 'Returns array of historical champions',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Array of historical champions',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { type: 'object' },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Admin - Champions'],
        summary: 'Create historical champion',
        description: 'Creates a new historical champion entry',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Created champion object',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
    },
    '/api/admin/picks/{roundId}/{userId}': {
      get: {
        tags: ['Admin - Picks'],
        summary: "Get user's picks for a round",
        description: 'Returns user picks for a specific round',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'roundId',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            description: 'Round ID',
          },
          {
            name: 'userId',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
            description: 'User ID',
          },
        ],
        responses: {
          '200': {
            description: "User's picks for specific round",
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
    },
    '/api/admin/picks': {
      post: {
        tags: ['Admin - Picks'],
        summary: 'Create pick for user',
        description: 'Creates a pick for a user (admin only)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  user_id: { type: 'integer' },
                  round_id: { type: 'integer' },
                  picks: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Created pick object',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
    },
  },
};

// Options for swagger-jsdoc
const options: swaggerJsdoc.Options = {
  definition: swaggerDefinition,
  // Paths to files containing OpenAPI definitions (can use JSDoc comments)
  apis: ['./src/routes/*.ts'], // Scan route files for additional JSDoc comments
};

// Generate Swagger spec
const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;

