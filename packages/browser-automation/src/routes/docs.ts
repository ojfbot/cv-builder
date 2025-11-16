/**
 * API Documentation Routes
 *
 * Serves Swagger UI for interactive API documentation
 */

import { Router, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Load OpenAPI specification
const openApiPath = path.resolve(__dirname, '../../docs/openapi.yaml');
const openApiContent = fs.readFileSync(openApiPath, 'utf8');
const openApiSpec = yaml.load(openApiContent) as object;

// Swagger UI options
const swaggerOptions = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Browser Automation API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    tryItOutEnabled: true,
  },
};

// Serve Swagger UI
router.use('/api-docs', swaggerUi.serve);
router.get('/api-docs', swaggerUi.setup(openApiSpec, swaggerOptions));

// Serve raw OpenAPI spec
router.get('/openapi.yaml', (_req: Request, res: Response) => {
  res.type('text/yaml');
  res.send(openApiContent);
});

router.get('/openapi.json', (_req: Request, res: Response) => {
  res.json(openApiSpec);
});

export default router;
