/**
 * Order State Machine
 * Defines valid order status transitions
 */

import { OrderStatus } from '@prisma/client';
import { InvalidOrderStateException } from '../../../common/exceptions/business.exception';

/**
 * Allowed status transitions
 */
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
    [OrderStatus.CREATED]: [OrderStatus.ASSIGNED, OrderStatus.CANCELLED],
    [OrderStatus.ASSIGNED]: [OrderStatus.PICKED_UP, OrderStatus.CANCELLED],
    [OrderStatus.PICKED_UP]: [OrderStatus.IN_TRANSIT, OrderStatus.CANCELLED],
    [OrderStatus.IN_TRANSIT]: [OrderStatus.DELIVERED, OrderStatus.RETURNED],
    [OrderStatus.DELIVERED]: [], // Terminal state
    [OrderStatus.CANCELLED]: [], // Terminal state
    [OrderStatus.RETURNED]: [], // Terminal state
};

/**
 * Terminal states (cannot transition from these)
 */
const TERMINAL_STATES: OrderStatus[] = [
    OrderStatus.DELIVERED,
    OrderStatus.CANCELLED,
    OrderStatus.RETURNED,
];

/**
 * Order State Machine
 */
export class OrderStateMachine {
    /**
     * Validate if a status transition is allowed
     */
    static validateTransition(from: OrderStatus, to: OrderStatus): boolean {
        const allowedTransitions = ALLOWED_TRANSITIONS[from] || [];
        return allowedTransitions.includes(to);
    }

    /**
     * Get allowed transitions for a given status
     */
    static getAllowedTransitions(status: OrderStatus): OrderStatus[] {
        return ALLOWED_TRANSITIONS[status] || [];
    }

    /**
     * Check if a status is terminal
     */
    static isTerminalState(status: OrderStatus): boolean {
        return TERMINAL_STATES.includes(status);
    }

    /**
     * Validate and throw exception if transition is invalid
     */
    static ensureValidTransition(from: OrderStatus, to: OrderStatus): void {
        if (!this.validateTransition(from, to)) {
            throw new InvalidOrderStateException(from, to);
        }
    }

    /**
     * Get next recommended status
     */
    static getNextStatus(currentStatus: OrderStatus): OrderStatus | null {
        const allowed = this.getAllowedTransitions(currentStatus);
        // Return the first non-cancellation status, or null if terminal
        return allowed.find((s) => s !== OrderStatus.CANCELLED) || null;
    }

    /**
     * Check if order can be assigned
     */
    static canAssign(status: OrderStatus): boolean {
        return status === OrderStatus.CREATED;
    }

    /**
     * Check if order can be cancelled
     */
    static canCancel(status: OrderStatus): boolean {
        return !this.isTerminalState(status);
    }

    /**
     * Get status description
     */
    static getStatusDescription(status: OrderStatus): string {
        const descriptions: Record<OrderStatus, string> = {
            [OrderStatus.CREATED]: 'Order created and awaiting assignment',
            [OrderStatus.ASSIGNED]: 'Order assigned to courier',
            [OrderStatus.PICKED_UP]: 'Order picked up by courier',
            [OrderStatus.IN_TRANSIT]: 'Order is in transit to destination',
            [OrderStatus.DELIVERED]: 'Order successfully delivered',
            [OrderStatus.CANCELLED]: 'Order cancelled',
            [OrderStatus.RETURNED]: 'Order returned to sender',
        };

        return descriptions[status] || status;
    }

    /**
     * Get status color for UI (can be used in frontend)
     */
    static getStatusColor(status: OrderStatus): string {
        const colors: Record<OrderStatus, string> = {
            [OrderStatus.CREATED]: 'blue',
            [OrderStatus.ASSIGNED]: 'purple',
            [OrderStatus.PICKED_UP]: 'orange',
            [OrderStatus.IN_TRANSIT]: 'yellow',
            [OrderStatus.DELIVERED]: 'green',
            [OrderStatus.CANCELLED]: 'red',
            [OrderStatus.RETURNED]: 'gray',
        };

        return colors[status] || 'gray';
    }

    /**
     * Get status progress percentage
     */
    static getProgressPercentage(status: OrderStatus): number {
        const progress: Record<OrderStatus, number> = {
            [OrderStatus.CREATED]: 0,
            [OrderStatus.ASSIGNED]: 20,
            [OrderStatus.PICKED_UP]: 40,
            [OrderStatus.IN_TRANSIT]: 70,
            [OrderStatus.DELIVERED]: 100,
            [OrderStatus.CANCELLED]: 0,
            [OrderStatus.RETURNED]: 0,
        };

        return progress[status] || 0;
    }
}
