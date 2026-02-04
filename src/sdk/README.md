# Shipex SDK

Official JavaScript/TypeScript SDK for the Shipex Shipping Platform API.

## Installation

```bash
npm install @shipex/sdk
```

Or use via CDN:

```html
<script src="https://cdn.shipex.com/sdk/shipex.min.js"></script>
```

## Quick Start

```typescript
import { ShipexClient } from '@shipex/sdk';

const client = new ShipexClient({
  apiKey: 'your-api-key-here',
  baseUrl: 'https://api.shipex.com/api/v1' // Optional
});
```

## Usage Examples

### Create an Order

```typescript
const order = await client.orders.create({
  recipientName: 'John Doe',
  recipientPhone: '+201234567890',
  address: '123 Main Street, Apartment 5',
  city: 'Cairo',
  price: 500,
  codAmount: 500, // Cash on delivery
  weight: 2.5,
  notes: 'Fragile - Handle with care'
});

console.log('Order created:', order.trackingNumber);
```

### Calculate Shipping Rate

```typescript
const rate = await client.shipping.calculateRate({
  origin: { city: 'Cairo' },
  destination: { city: 'Alexandria' },
  weight: 2.5,
  serviceType: 'EXPRESS',
  codAmount: 500,
  dimensions: {
    length: 30,
    width: 20,
    height: 10
  }
});

console.log('Total cost:', rate.totalCost, rate.currency);
console.log('Estimated delivery:', rate.estimatedDelivery);
```

### Validate Address

```typescript
const validation = await client.shipping.validateAddress({
  address: '123 Main Street',
  city: 'Cairo',
  country: 'Egypt'
});

if (validation.valid) {
  console.log('Address is valid!');
  console.log('Zone:', validation.zone);
  console.log('Coordinates:', validation.coordinates);
}
```

### Generate Shipping Label

```typescript
const label = await client.shipping.generateLabel(orderId, 'A4');

console.log('Label generated:', label.downloadUrl);
// Download the PDF label
window.open(label.downloadUrl, '_blank');
```

### Track Order (Public - No API Key Required)

```typescript
const tracking = await client.tracking.track('SHX123456789');

console.log('Status:', tracking.statusLabel);
console.log('Current location:', tracking.currentLocation);
console.log('Estimated delivery:', tracking.estimatedDelivery);

// Display tracking history
tracking.history.forEach(event => {
  console.log(`${event.timestamp}: ${event.status} at ${event.location}`);
});
```

### Check API Quota Usage

```typescript
const usage = await client.rateLimit.getUsage();

console.log(`Plan: ${usage.plan}`);
console.log(`Used: ${usage.used} / ${usage.limit}`);
console.log(`Remaining: ${usage.remaining}`);
console.log(`Resets at: ${usage.resetAt}`);
```

## API Reference

### Orders

- `orders.create(data)` - Create a new order
- `orders.get(id)` - Get order by ID
- `orders.list(params)` - List all orders
- `orders.updateStatus(id, status)` - Update order status

### Shipping

- `shipping.calculateRate(data)` - Calculate shipping cost
- `shipping.validateAddress(data)` - Validate address
- `shipping.generateLabel(orderId, format)` - Generate shipping label
- `shipping.autocomplete(query, country)` - Get address suggestions

### Tracking

- `tracking.track(trackingNumber)` - Track order (public, no auth)

### Rate Limiting

- `rateLimit.getUsage()` - Get current quota usage
- `rateLimit.getStats(days)` - Get historical statistics

## Error Handling

```typescript
try {
  const order = await client.orders.create({...});
} catch (error) {
  console.error('Failed to create order:', error.message);
}
```

## TypeScript Support

The SDK is written in TypeScript and includes full type definitions:

```typescript
import { ShipexClient, CreateOrderDto, Order, RateResponse } from '@shipex/sdk';

const orderData: CreateOrderDto = {
  recipientName: 'John Doe',
  // ... TypeScript will validate all fields
};

const order: Order = await client.orders.create(orderData);
```

## Browser Support

The SDK works in both Node.js and modern browsers:

```html
<script src="https://cdn.shipex.com/sdk/shipex.min.js"></script>
<script>
  const client = new ShipexClient({
    apiKey: 'your-api-key'
  });
  
  client.tracking.track('SHX123456789')
    .then(tracking => console.log(tracking));
</script>
```

## Rate Limiting

API requests are subject to rate limits based on your subscription plan:

- **FREE**: 100 requests/hour
- **BASIC**: 1,000 requests/hour
- **PREMIUM**: 10,000 requests/hour
- **ENTERPRISE**: Unlimited

Check your usage with `client.rateLimit.getUsage()`.

## Support

- Documentation: https://docs.shipex.com
- API Reference: https://api.shipex.com/api-docs
- Support: support@shipex.com

## License

MIT
