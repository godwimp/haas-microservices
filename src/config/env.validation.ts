import * as Joi from 'joi';

export const validationSchema = Joi.object({
  // Application
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'staging')
    .default('development'),
  PORT: Joi.number().default(3000),
  APP_NAME: Joi.string().required(),

  // Database
  DATABASE_URL: Joi.string().required(),

  // JWT
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRATION: Joi.string().default('7d'),
  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_REFRESH_EXPIRATION: Joi.string().default('30d'),

  // CORS
  CORS_ORIGIN: Joi.string().default('*'),

  // API
  API_PREFIX: Joi.string().default('api'),
  API_VERSION: Joi.string().default('v1'),

  // Swagger
  SWAGGER_ENABLED: Joi.boolean().default(true),
  SWAGGER_PATH: Joi.string().default('api-docs'),

  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().default(''),
  REDIS_DB: Joi.number().default(0),

  // BullMQ
  BULLMQ_REDIS_HOST: Joi.string().default('localhost'),
  BULLMQ_REDIS_PORT: Joi.number().default(6379),
  BULLMQ_REDIS_PASSWORD: Joi.string().default(''),

  // Honeypot
  HONEYPOT_API_KEY: Joi.string().default(''),
  IP_ENRICHMENT_ENABLED: Joi.boolean().default(true),
  IP_ENRICHMENT_API_KEY: Joi.string().allow('').optional(),
});
