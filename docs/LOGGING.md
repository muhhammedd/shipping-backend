# Logging Strategy Implementation

## Overview
This document describes the comprehensive logging strategy implemented for the Shipex backend.

## Components

### 1. Logger Service
**File:** `src/common/logger/logger.service.ts`

Winston-based logger with:
- **Daily log rotation** - Automatic file rotation by date
- **Multiple transports** - Console, file, error-specific files
- **Structured logging** - JSON format for easy parsing
- **Log levels** - error, warn, info, debug, verbose
- **Specialized methods** - HTTP, database, events, security, performance

### 2. Logging Interceptor
**File:** `src/common/interceptors/logging.interceptor.ts`

Automatically logs:
- All HTTP requests (method, URL, user, tenant)
- Response times
- Status codes
- Request/response bodies (with sanitization)
- Errors with stack traces

### 3. Exception Filter
**File:** `src/common/filters/all-exceptions.filter.ts`

Enhanced to log:
- All exceptions with context
- User and tenant information
- Request details
- Stack traces
- Sanitized request bodies

## Log Files

All logs are stored in the `logs/` directory:

- `application-YYYY-MM-DD.log` - All logs
- `error-YYYY-MM-DD.log` - Error logs only
- `exceptions-YYYY-MM-DD.log` - Unhandled exceptions
- `rejections-YYYY-MM-DD.log` - Unhandled promise rejections

**Retention:**
- Application logs: 14 days
- Error logs: 30 days
- Max file size: 20MB (then rotates)
- Old logs are automatically zipped

## Configuration

### Environment Variables

```bash
LOG_LEVEL=info
# Options: error, warn, info, debug, verbose

LOG_RESPONSE_DATA=false
# Set to true to log response data (verbose)
```

### Log Levels

- **error** - Errors and exceptions only
- **warn** - Warnings and errors
- **info** - General information (default)
- **debug** - Detailed debugging information
- **verbose** - Very detailed logs

## Usage Examples

### Basic Logging

```typescript
import { LoggerService } from './common/logger/logger.service';

@Injectable()
export class MyService {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('MyService');
  }

  someMethod() {
    this.logger.log('Operation started');
    this.logger.debug('Detailed debug info');
    this.logger.warn('Warning message');
    this.logger.error('Error occurred', stackTrace);
  }
}
```

### HTTP Request Logging

Automatic via `LoggingInterceptor`:
```
2026-02-03 23:54:55 [HTTP] info: Incoming Request: POST /api/v1/orders
2026-02-03 23:54:56 [HTTP] info: HTTP Request {"method":"POST","url":"/api/v1/orders","statusCode":201,"responseTime":"150ms","userId":"user-uuid"}
```

### Event Logging

```typescript
this.logger.logEvent('ORDER_CREATED', {
  orderId: 'order-123',
  merchantId: 'merchant-456',
  amount: 250.00
});
```

### Security Logging

```typescript
this.logger.logSecurity('FAILED_LOGIN_ATTEMPT', 'medium', {
  email: 'user@example.com',
  ip: '192.168.1.1',
  attempts: 3
});
```

### Performance Logging

```typescript
const startTime = Date.now();
// ... operation ...
const duration = Date.now() - startTime;

this.logger.logPerformance('DATABASE_QUERY', duration, {
  query: 'SELECT * FROM orders',
  rowCount: 100
});
```

## Security Features

### Sensitive Data Sanitization

The following fields are automatically redacted:
- `password`
- `passwordHash`
- `token`
- `apiKey`
- `secret`

Example:
```json
{
  "email": "user@example.com",
  "password": "***REDACTED***"
}
```

## Best Practices

1. **Set appropriate context** - Always set context for your logger
2. **Use correct log levels** - Don't use `error` for warnings
3. **Include relevant data** - Add context to help debugging
4. **Don't log sensitive data** - PII, passwords, tokens
5. **Use structured logging** - Pass objects, not concatenated strings

## Monitoring

### Log Analysis

Use tools like:
- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Grafana Loki**
- **Datadog**
- **New Relic**

All logs are in JSON format for easy parsing.

### Alerts

Set up alerts for:
- High error rates
- Failed login attempts
- Performance degradation
- Unhandled exceptions

## Production Recommendations

1. **Set LOG_LEVEL=warn** in production
2. **Disable LOG_RESPONSE_DATA** in production
3. **Ship logs to centralized logging** (ELK, Datadog, etc.)
4. **Set up log rotation** (already configured)
5. **Monitor disk space** for log files
6. **Set up alerts** for critical errors

## Testing

```bash
# Start the application
npm run start:dev

# Make some requests
curl http://localhost:5000/api/v1/orders

# Check logs
tail -f logs/application-2026-02-03.log
tail -f logs/error-2026-02-03.log
```

## Integration

The logging system is automatically integrated:
- ✅ Global logger module
- ✅ HTTP request/response logging
- ✅ Exception logging
- ✅ Available in all services via DI

No additional configuration needed!
