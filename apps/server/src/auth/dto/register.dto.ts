import { IsEmail, IsString, MinLength, IsOptional, IsIn } from "class-validator";

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  @IsIn(["customer", "vendor", "dispatcher"])
  role?: string;
}
