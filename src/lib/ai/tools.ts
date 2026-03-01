import Anthropic from '@anthropic-ai/sdk';

export function buildTrainerTools(): Anthropic.Tool[] {
  return [
    {
      name: 'update_profile',
      description: 'Update the client\'s health profile (age, weight, height, fitness level, notes). Use when the client shares new personal information or measurements.',
      input_schema: {
        type: 'object' as const,
        properties: {
          age:          { type: 'number',  description: 'Age in years' },
          weightKg:     { type: 'number',  description: 'Body weight in kilograms' },
          heightCm:     { type: 'number',  description: 'Height in centimeters' },
          fitnessLevel: { type: 'string',  enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'], description: 'Fitness level' },
          notes:        { type: 'string',  description: 'General notes about the client' },
          addInjury:    { type: 'string',  description: 'Description of a new injury or limitation to add' },
          locationName: { type: 'string',  description: 'City/location name, e.g. "Denver, Colorado". Geocodes and stores coordinates.' },
        },
      },
    },
    {
      name: 'generate_training_plan',
      description: 'Create a new training plan based on the client\'s goals, fitness level, and available equipment. This archives any existing active plan. Call this when the client asks for a new plan or significant changes.',
      input_schema: {
        type: 'object' as const,
        properties: {
          title:       { type: 'string',  description: 'Plan title, e.g. "Half Marathon 12-Week Plan"' },
          description: { type: 'string',  description: 'Brief description of the plan' },
          weeks:       { type: 'number',  description: 'Number of weeks for the plan' },
          days: {
            type: 'array',
            description: 'Array of training days',
            items: {
              type: 'object',
              properties: {
                dayOfWeek:  { type: 'number',  description: 'Day of week (0=Sun, 1=Mon, ..., 6=Sat)' },
                weekNumber: { type: 'number',  description: 'Week number (1-indexed)' },
                focusArea:  { type: 'string',  description: 'Focus area, e.g. "Upper Body", "Cardio"' },
                exercises: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name:     { type: 'string' },
                      sets:     { type: 'number' },
                      reps:     { type: 'string',  description: 'e.g. "8-12" or "15"' },
                      weight:   { type: 'string',  description: 'e.g. "60% 1RM" or "bodyweight"' },
                      duration: { type: 'string',  description: 'e.g. "30 min" for cardio' },
                      notes:    { type: 'string' },
                    },
                    required: ['name'],
                  },
                },
                notes: { type: 'string' },
              },
              required: ['dayOfWeek', 'focusArea'],
            },
          },
        },
        required: ['title', 'days'],
      },
    },
    {
      name: 'log_workout',
      description: 'Log a completed workout session. Use when the client describes a workout they just finished or recently completed.',
      input_schema: {
        type: 'object' as const,
        properties: {
          title:       { type: 'string',  description: 'Workout title, e.g. "Morning Run"' },
          durationMin: { type: 'number',  description: 'Duration in minutes' },
          notes:       { type: 'string',  description: 'Any notes about how it went' },
          exercises: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                sets: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      reps:       { type: 'number' },
                      weightKg:   { type: 'number' },
                      durationSec:{ type: 'number' },
                      distanceM:  { type: 'number' },
                      rpe:        { type: 'number',  description: 'Rate of perceived exertion 1-10' },
                    },
                  },
                },
              },
              required: ['name'],
            },
          },
        },
        required: ['title'],
      },
    },
    {
      name: 'schedule_workout',
      description: 'Schedule a planned workout session on the calendar.',
      input_schema: {
        type: 'object' as const,
        properties: {
          title:       { type: 'string',  description: 'Workout title' },
          scheduledAt: { type: 'string',  description: 'ISO date string for when the workout is scheduled' },
          notes:       { type: 'string',  description: 'Notes about the planned workout' },
        },
        required: ['title', 'scheduledAt'],
      },
    },
    {
      name: 'update_equipment',
      description: 'Add or remove home equipment or gym memberships. Use when the client mentions getting new equipment or joining/leaving a gym.',
      input_schema: {
        type: 'object' as const,
        properties: {
          addEquipment: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name:     { type: 'string' },
                category: { type: 'string' },
              },
              required: ['name'],
            },
            description: 'Equipment items to add',
          },
          removeEquipmentNames: {
            type: 'array',
            items: { type: 'string' },
            description: 'Names of equipment items to remove',
          },
          addGym: {
            type: 'object',
            properties: {
              gymName:   { type: 'string' },
              equipment: { type: 'string' },
            },
            description: 'New gym membership to add',
          },
        },
      },
    },
    {
      name: 'get_weather',
      description: 'Fetch current weather and 7-day forecast for the client\'s location. Call this when discussing outdoor workouts, adjusting plans for weather, or any weather-sensitive training decisions. Returns conditions, temperature, precipitation, and wind.',
      input_schema: {
        type: 'object' as const,
        properties: {},
      },
    },
    {
      name: 'get_progress',
      description: 'Fetch body metrics, strength PRs, and workout history for progress discussions. Call this before discussing the client\'s progress.',
      input_schema: {
        type: 'object' as const,
        properties: {
          days: { type: 'number',  description: 'Number of days of history to retrieve (default 30)' },
        },
      },
    },
  ];
}
