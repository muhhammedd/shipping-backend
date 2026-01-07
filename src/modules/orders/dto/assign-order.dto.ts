import { IsNotEmpty, IsUUID } from 'class-validator';

export class AssignOrderDto {
  @IsNotEmpty()
  @IsUUID()
  courierId: string;
}
