/**
 * Shipex SDK - JavaScript/TypeScript Client Library
 * Version: 1.0.0
 * 
 * Usage:
 * ```typescript
 * import { ShipexClient } from '@shipex/sdk';
 * 
 * const client = new ShipexClient({
 *   apiKey: 'your-api-key',
 *   baseUrl: 'https://api.shipex.com/api/v1'
 * });
 * 
 * const rate = await client.shipping.calculateRate({...});
 * ```
 */

export interface ShipexConfig {
    apiKey: string;
    baseUrl?: string;
}

export interface CreateOrderDto {
    recipientName: string;
    recipientPhone: string;
    address: string;
    city: string;
    price: number;
    codAmount?: number;
    weight?: number;
    notes?: string;
}

export interface Order {
    id: string;
    trackingNumber: string;
    status: string;
    recipientName: string;
    recipientPhone: string;
    address: string;
    city: string;
    price: number;
    codAmount?: number;
    createdAt: string;
}

export interface RateRequest {
    origin: { city: string };
    destination: { city: string };
    weight: number;
    serviceType?: 'EXPRESS' | 'STANDARD' | 'ECONOMY';
    codAmount?: number;
    dimensions?: {
        length: number;
        width: number;
        height: number;
    };
}

export interface RateResponse {
    baseRate: number;
    weightCharge: number;
    serviceCharge: number;
    codFee: number;
    totalCost: number;
    estimatedDelivery: string;
    currency: string;
}

export interface AddressValidation {
    valid: boolean;
    address: string;
    city: string;
    coordinates?: {
        lat: number;
        lng: number;
    };
    zone?: string;
}

export interface TrackingInfo {
    trackingNumber: string;
    status: string;
    statusLabel: string;
    currentLocation?: string;
    estimatedDelivery?: string;
    history: Array<{
        timestamp: string;
        status: string;
        location?: string;
    }>;
    recipient: {
        name: string;
        city: string;
        phone: string;
    };
}

export interface Label {
    id: string;
    orderId: string;
    format: 'A4' | 'THERMAL';
    filePath: string;
    downloadUrl: string;
}

class HttpClient {
    constructor(private config: ShipexConfig) { }

    private async request<T>(
        method: string,
        endpoint: string,
        data?: any
    ): Promise<T> {
        const baseUrl = this.config.baseUrl || 'https://api.shipex.com/api/v1';
        const url = `${baseUrl}${endpoint}`;

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'X-API-Key': this.config.apiKey,
        };

        const options: RequestInit = {
            method,
            headers,
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        return response.json();
    }

    get<T>(endpoint: string): Promise<T> {
        return this.request<T>('GET', endpoint);
    }

    post<T>(endpoint: string, data: any): Promise<T> {
        return this.request<T>('POST', endpoint, data);
    }

    put<T>(endpoint: string, data: any): Promise<T> {
        return this.request<T>('PUT', endpoint, data);
    }

    delete<T>(endpoint: string): Promise<T> {
        return this.request<T>('DELETE', endpoint);
    }
}

export class ShipexClient {
    private http: HttpClient;

    constructor(config: ShipexConfig) {
        this.http = new HttpClient(config);
    }

    /**
     * Orders API
     */
    orders = {
        /**
         * Create a new order
         */
        create: (data: CreateOrderDto): Promise<Order> => {
            return this.http.post<Order>('/orders', data);
        },

        /**
         * Get order by ID
         */
        get: (id: string): Promise<Order> => {
            return this.http.get<Order>(`/orders/${id}`);
        },

        /**
         * List all orders
         */
        list: (params?: { page?: number; limit?: number; status?: string }): Promise<Order[]> => {
            const query = new URLSearchParams(params as any).toString();
            return this.http.get<Order[]>(`/orders${query ? '?' + query : ''}`);
        },

        /**
         * Update order status
         */
        updateStatus: (id: string, status: string): Promise<Order> => {
            return this.http.put<Order>(`/orders/${id}/status`, { status });
        },
    };

    /**
     * Shipping API
     */
    shipping = {
        /**
         * Calculate shipping rate
         */
        calculateRate: (data: RateRequest): Promise<RateResponse> => {
            return this.http.post<RateResponse>('/shipping/calculate-rate', data);
        },

        /**
         * Validate shipping address
         */
        validateAddress: (data: {
            address: string;
            city: string;
            country?: string;
        }): Promise<AddressValidation> => {
            return this.http.post<AddressValidation>('/shipping/validate-address', data);
        },

        /**
         * Generate shipping label
         */
        generateLabel: (
            orderId: string,
            format: 'A4' | 'THERMAL' = 'A4'
        ): Promise<Label> => {
            return this.http.post<Label>('/labels/generate', { orderId, format });
        },

        /**
         * Get address autocomplete suggestions
         */
        autocomplete: (query: string, country: string = 'Egypt'): Promise<string[]> => {
            return this.http.get<string[]>(`/shipping/autocomplete?query=${query}&country=${country}`);
        },
    };

    /**
     * Tracking API (Public - no API key required)
     */
    tracking = {
        /**
         * Track order by tracking number
         */
        track: (trackingNumber: string): Promise<TrackingInfo> => {
            return this.http.get<TrackingInfo>(`/public/track/${trackingNumber}`);
        },
    };

    /**
     * Rate Limiting API
     */
    rateLimit = {
        /**
         * Get current quota usage
         */
        getUsage: (): Promise<{
            plan: string;
            limit: number;
            used: number;
            remaining: number;
            resetAt: string;
        }> => {
            return this.http.get('/rate-limit/usage');
        },

        /**
         * Get quota statistics
         */
        getStats: (days: number = 7): Promise<Array<{
            period: string;
            requests: number;
            plan: string;
        }>> => {
            return this.http.get(`/rate-limit/stats?days=${days}`);
        },
    };
}

// Export for CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ShipexClient };
}
