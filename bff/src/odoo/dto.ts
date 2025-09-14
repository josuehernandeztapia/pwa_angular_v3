import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateDraftDto {
  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  market?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  meta?: any;
}

export class AddLineDto {
  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  oem?: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  equivalent?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  qty?: number = 1;

  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @IsOptional()
  @IsString()
  currency?: string = 'MXN';

  @IsOptional()
  meta?: any;
}

