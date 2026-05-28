import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsString, IsIn, Min, IsNotEmpty } from "class-validator";

export class WithdrawDto {
  @ApiProperty({ example: 100, description: "Amount to withdraw" })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ example: "123e4567-e89b-12d3-a456-426614174000", description: "The ID of the bank or momo account" })
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @ApiProperty({ example: "bank", description: "The type of account", enum: ["bank", "momo"] })
  @IsIn(["bank", "momo"])
  accountType: "bank" | "momo";

  @ApiProperty({ example: "1234", description: "4-digit wallet PIN" })
  @IsString()
  @IsNotEmpty()
  pin: string;
}
