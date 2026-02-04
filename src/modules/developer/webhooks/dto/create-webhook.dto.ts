import { IsString, IsArray, IsUrl } from 'class-validator';

export class CreateWebhookDto {
    @IsUrl()
    url: string;

    @IsArray()
    @IsString({ each: true })
    events: string[];
}
