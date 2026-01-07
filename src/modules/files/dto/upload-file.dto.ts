import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class UploadFileDto {
  @IsNotEmpty()
  @IsString()
  fileName: string;

  @IsNotEmpty()
  @IsString()
  fileType: string; // e.g., 'image/jpeg', 'application/pdf'

  @IsNotEmpty()
  @IsString()
  fileSize: string; // in bytes

  @IsNotEmpty()
  @IsString()
  fileCategory: string; // e.g., 'shipment_photo', 'identity_document'

  @IsNotEmpty()
  @IsUUID()
  orderId?: string; // Optional: link to order

  @IsNotEmpty()
  @IsString()
  base64Data: string; // Base64 encoded file data
}
