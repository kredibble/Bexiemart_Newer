import { IsString, IsNotEmpty, IsBoolean, IsOptional, Length } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateCardDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  cardholderName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Length(4, 4)
  last4: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Length(2, 2)
  expiryMonth: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Length(2, 4)
  expiryYear: string;

  @ApiProperty({ required: false, default: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

export class UpdateCardDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  cardholderName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @Length(2, 2)
  expiryMonth?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @Length(2, 4)
  expiryYear?: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
