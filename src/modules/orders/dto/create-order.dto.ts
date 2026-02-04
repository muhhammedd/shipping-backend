import { IsNotEmpty, IsNumber, IsString, IsPositive, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEgyptianPhone, IsEgyptianCity, IsPositiveDecimal } from '../../../common/validators/custom-validators';

export class CreateOrderDto {
  @ApiProperty({ example: 'Ahmed Mohamed', description: 'Recipient full name' })
  @IsString()
  @IsNotEmpty()
  recipientName: string;

  @ApiProperty({ example: '01012345678', description: 'Egyptian phone number' })
  @IsString()
  @IsNotEmpty()
  @IsEgyptianPhone()
  recipientPhone: string;

  @ApiProperty({ example: '123 Main Street, Apartment 4', description: 'Full delivery address' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: 'Cairo', description: 'Egyptian city' })
  @IsString()
  @IsNotEmpty()
  @IsEgyptianCity()
  city: string;

  @ApiProperty({ example: 50.00, description: 'Shipping price in EGP' })
  @IsNumber()
  @IsPositive()
  @IsPositiveDecimal()
  price: number;

  @ApiProperty({ example: 200.00, description: 'Cash on delivery amount in EGP' })
  @IsNumber()
  @IsPositive()
  @IsPositiveDecimal()
  codAmount: number;

  @ApiPropertyOptional({ example: 'Fragile items, handle with care', description: 'Special delivery notes' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Merchant ID (Admin only)' })
  @IsString()
  @IsOptional()
  merchantId?: string;
}

