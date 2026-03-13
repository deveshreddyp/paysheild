const swaggerUi = require('swagger-ui-express');

const swaggerDocument = {
    openapi: '3.0.3',
    info: {
        title: 'PayShield Gateway API',
        version: '2.4.0',
        description: 'AI-Native Payment Gateway & Fraud Intelligence Engine. Processes transactions in real-time, scores them for fraud risk using an ensemble of 3 AI/ML models, and streams results to a live ops-center dashboard via WebSocket.',
        contact: { name: 'PayShield Team', url: 'https://github.com/payshield' },
        license: { name: 'MIT' },
    },
    servers: [
        { url: 'http://localhost:3000', description: 'Local Gateway' },
    ],
    tags: [
        { name: 'Auth', description: 'JWT token generation and status' },
        { name: 'Payment', description: 'Payment processing with fraud scoring' },
        { name: 'Health', description: 'Service health checks' },
    ],
    paths: {
        '/health': {
            get: {
                tags: ['Health'],
                summary: 'Health check',
                description: 'Returns the health status of the gateway and Redis connection.',
                responses: {
                    200: {
                        description: 'Service is healthy',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        status: { type: 'string', example: 'ok' },
                                        service: { type: 'string', example: 'gateway' },
                                        timestamp: { type: 'string', format: 'date-time' },
                                        redis: { type: 'string', enum: ['connected', 'disconnected'] },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        '/auth/token': {
            post: {
                tags: ['Auth'],
                summary: 'Generate JWT token',
                description: 'Creates a new JWT token valid for 15 minutes. Secrets are auto-rotated via Redis.',
                responses: {
                    200: {
                        description: 'Token generated successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
                                        expires_in: { type: 'integer', example: 900, description: 'TTL in seconds' },
                                        next_rotation: { type: 'string', format: 'date-time' },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        '/auth/status': {
            get: {
                tags: ['Auth'],
                summary: 'Check auth status',
                description: 'Returns the current JWT status and last key rotation time. Requires a valid token.',
                security: [{ bearerAuth: [] }],
                responses: {
                    200: {
                        description: 'Auth status',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        status: { type: 'string', example: 'active' },
                                        last_rotation: { type: 'string', format: 'date-time', nullable: true },
                                        rotated_by: { type: 'string', example: 'redis-auto' },
                                        client: { type: 'string', example: 'payshield_client' },
                                    },
                                },
                            },
                        },
                    },
                    401: { description: 'Invalid or expired token' },
                },
            },
        },
        '/api/v1/payment/initiate': {
            post: {
                tags: ['Payment'],
                summary: 'Process a payment',
                description: 'Validates the payment request, scores it through the 3-model AI fraud engine, and returns the decision (APPROVE/BLOCK). Tampered requests are automatically blocked.',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'X-Idempotency-Key',
                        in: 'header',
                        required: true,
                        description: 'Unique key to prevent duplicate charges (24h TTL)',
                        schema: { type: 'string', example: 'pay_abc123_1709654321' },
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/PaymentRequest' },
                            example: {
                                amount: 50000,
                                currency: 'INR',
                                card_bin: '411111',
                                device_fingerprint: 'dev_abc123',
                                merchant_id: 'merchant_A',
                                geo: { country: 'IN', ip: '122.161.45.10' },
                            },
                        },
                    },
                },
                responses: {
                    200: {
                        description: 'Payment approved',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/PaymentResponse' } } },
                    },
                    400: {
                        description: 'Validation error',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        error: { type: 'string', example: 'VALIDATION_ERROR' },
                                        message: { type: 'string' },
                                    },
                                },
                            },
                        },
                    },
                    402: {
                        description: 'Payment blocked — fraud detected',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/PaymentResponse' } } },
                    },
                    408: {
                        description: 'Timeout (simulated for high-risk HIGH scores)',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/PaymentResponse' } } },
                    },
                    429: { description: 'Rate limit exceeded (30 req/60s per IP)' },
                },
            },
        },
        '/api/v1/payment/verify': {
            post: {
                tags: ['Payment'],
                summary: 'Verify a transaction',
                description: 'Checks the idempotency cache for a previous response matching the X-Idempotency-Key header.',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'X-Idempotency-Key',
                        in: 'header',
                        required: true,
                        schema: { type: 'string' },
                    },
                ],
                responses: {
                    200: { description: 'Cached transaction found', content: { 'application/json': { schema: { $ref: '#/components/schemas/PaymentResponse' } } } },
                    404: { description: 'No cached response for this key' },
                },
            },
        },
        '/api/v1/payment/status/{id}': {
            get: {
                tags: ['Payment'],
                summary: 'Get transaction status',
                description: 'Retrieves a cached transaction by its UUID. Cached for 1 hour.',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        description: 'Transaction UUID',
                        schema: { type: 'string', format: 'uuid' },
                    },
                ],
                responses: {
                    200: { description: 'Transaction found', content: { 'application/json': { schema: { $ref: '#/components/schemas/PaymentResponse' } } } },
                    404: { description: 'Transaction not found' },
                },
            },
        },
    },
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'Obtain a JWT token from POST /auth/token',
            },
        },
        schemas: {
            PaymentRequest: {
                type: 'object',
                required: ['amount', 'currency', 'card_bin', 'device_fingerprint', 'merchant_id', 'geo'],
                properties: {
                    amount: { type: 'integer', description: 'Amount in paise (₹1 = 100 paise)', example: 50000 },
                    currency: { type: 'string', enum: ['INR'], example: 'INR' },
                    card_bin: { type: 'string', pattern: '^\\d{6}$', description: 'First 6 digits of card number', example: '411111' },
                    device_fingerprint: { type: 'string', example: 'dev_abc123' },
                    merchant_id: { type: 'string', example: 'merchant_A' },
                    geo: {
                        type: 'object',
                        required: ['country', 'ip'],
                        properties: {
                            country: { type: 'string', minLength: 2, maxLength: 2, example: 'IN' },
                            ip: { type: 'string', format: 'ipv4', example: '122.161.45.10' },
                        },
                    },
                },
            },
            PaymentResponse: {
                type: 'object',
                properties: {
                    transaction_id: { type: 'string', format: 'uuid' },
                    status: { type: 'string', enum: ['SUCCESS', 'FRAUD_FLAGGED', 'TIMEOUT', 'VALIDATION_FAILED'], example: 'SUCCESS' },
                    http_code: { type: 'integer', enum: [200, 400, 402, 408], example: 200 },
                    fraud_score: { type: 'number', minimum: 0, maximum: 1, description: 'Composite score from 3 ML models', example: 0.29 },
                    fraud_label: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], example: 'LOW' },
                    triggered_rules: { type: 'array', items: { type: 'string' }, example: [] },
                    latency_ms: { type: 'integer', description: 'Fraud engine inference time', example: 127 },
                    amount: { type: 'integer', example: 50000 },
                    currency: { type: 'string', example: 'INR' },
                    merchant_id: { type: 'string', example: 'merchant_A' },
                    timestamp: { type: 'string', format: 'date-time' },
                    geo: {
                        type: 'object',
                        properties: {
                            country: { type: 'string', example: 'IN' },
                            ip: { type: 'string', example: '122.161.45.10' },
                        },
                    },
                    card_bin: { type: 'string', example: '411111' },
                    tampered: { type: 'boolean', description: 'True if X-Requestly-Modified header was detected', example: false },
                },
            },
        },
    },
};

function setupSwagger(app) {
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
        customCss: `
            .swagger-ui .topbar { display: none }
            .swagger-ui .info .title { font-size: 28px; font-weight: 800; }
        `,
        customSiteTitle: 'PayShield API Docs',
    }));
}

module.exports = { setupSwagger };
