import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base Business Exception
 */
export class BusinessException extends HttpException {
    constructor(
        message: string,
        statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
        public readonly errorCode?: string,
    ) {
        super(
            {
                statusCode,
                message,
                errorCode,
                timestamp: new Date().toISOString(),
            },
            statusCode,
        );
    }
}

/**
 * Resource Not Found Exception
 */
export class ResourceNotFoundException extends BusinessException {
    constructor(resource: string, identifier?: string) {
        const message = identifier
            ? `${resource} with identifier '${identifier}' not found`
            : `${resource} not found`;
        super(message, HttpStatus.NOT_FOUND, 'RESOURCE_NOT_FOUND');
    }
}

/**
 * Order-specific exceptions
 */
export class OrderNotFoundException extends ResourceNotFoundException {
    constructor(orderId: string) {
        super('Order', orderId);
    }
}

export class InvalidOrderStateException extends BusinessException {
    constructor(currentState: string, attemptedState: string) {
        super(
            `Cannot transition order from '${currentState}' to '${attemptedState}'`,
            HttpStatus.BAD_REQUEST,
            'INVALID_ORDER_STATE_TRANSITION',
        );
    }
}

export class OrderAlreadyAssignedException extends BusinessException {
    constructor(orderId: string) {
        super(
            `Order '${orderId}' is already assigned to a courier`,
            HttpStatus.CONFLICT,
            'ORDER_ALREADY_ASSIGNED',
        );
    }
}

/**
 * Finance-specific exceptions
 */
export class InsufficientBalanceException extends BusinessException {
    constructor(available: number, required: number) {
        super(
            `Insufficient balance. Available: ${available}, Required: ${required}`,
            HttpStatus.BAD_REQUEST,
            'INSUFFICIENT_BALANCE',
        );
    }
}

export class InvalidTransactionException extends BusinessException {
    constructor(reason: string) {
        super(
            `Invalid transaction: ${reason}`,
            HttpStatus.BAD_REQUEST,
            'INVALID_TRANSACTION',
        );
    }
}

export class PayoutAlreadyProcessedException extends BusinessException {
    constructor(payoutId: string) {
        super(
            `Payout '${payoutId}' has already been processed`,
            HttpStatus.CONFLICT,
            'PAYOUT_ALREADY_PROCESSED',
        );
    }
}

/**
 * Tenant-specific exceptions
 */
export class TenantNotFoundException extends ResourceNotFoundException {
    constructor(tenantId: string) {
        super('Tenant', tenantId);
    }
}

export class TenantSuspendedException extends BusinessException {
    constructor(tenantId: string) {
        super(
            `Tenant '${tenantId}' is suspended`,
            HttpStatus.FORBIDDEN,
            'TENANT_SUSPENDED',
        );
    }
}

export class TenantQuotaExceededException extends BusinessException {
    constructor(resource: string, limit: number) {
        super(
            `Tenant quota exceeded for ${resource}. Limit: ${limit}`,
            HttpStatus.FORBIDDEN,
            'TENANT_QUOTA_EXCEEDED',
        );
    }
}

/**
 * User-specific exceptions
 */
export class UserNotFoundException extends ResourceNotFoundException {
    constructor(userId: string) {
        super('User', userId);
    }
}

export class UserInactiveException extends BusinessException {
    constructor(userId: string) {
        super(
            `User '${userId}' is inactive`,
            HttpStatus.FORBIDDEN,
            'USER_INACTIVE',
        );
    }
}

export class UnauthorizedAccessException extends BusinessException {
    constructor(resource: string) {
        super(
            `Unauthorized access to ${resource}`,
            HttpStatus.FORBIDDEN,
            'UNAUTHORIZED_ACCESS',
        );
    }
}

/**
 * Validation exceptions
 */
export class InvalidInputException extends BusinessException {
    constructor(field: string, reason: string) {
        super(
            `Invalid input for field '${field}': ${reason}`,
            HttpStatus.BAD_REQUEST,
            'INVALID_INPUT',
        );
    }
}

export class DuplicateResourceException extends BusinessException {
    constructor(resource: string, field: string, value: string) {
        super(
            `${resource} with ${field} '${value}' already exists`,
            HttpStatus.CONFLICT,
            'DUPLICATE_RESOURCE',
        );
    }
}

/**
 * External service exceptions
 */
export class ExternalServiceException extends BusinessException {
    constructor(service: string, reason: string) {
        super(
            `External service '${service}' error: ${reason}`,
            HttpStatus.SERVICE_UNAVAILABLE,
            'EXTERNAL_SERVICE_ERROR',
        );
    }
}

export class AddressValidationException extends BusinessException {
    constructor(reason: string) {
        super(
            `Address validation failed: ${reason}`,
            HttpStatus.BAD_REQUEST,
            'ADDRESS_VALIDATION_FAILED',
        );
    }
}
