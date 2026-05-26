const { plainToInstance } = require("class-transformer");
const { validateSync } = require("class-validator");

class CreateCardDto {
  constructor() {}
}

const { IsString, IsNotEmpty, Length, IsBoolean, IsOptional } = require("class-validator");

IsString()(CreateCardDto.prototype, "type");
IsNotEmpty()(CreateCardDto.prototype, "type");

IsString()(CreateCardDto.prototype, "cardholderName");
IsNotEmpty()(CreateCardDto.prototype, "cardholderName");

IsString()(CreateCardDto.prototype, "last4");
IsNotEmpty()(CreateCardDto.prototype, "last4");
Length(4, 4)(CreateCardDto.prototype, "last4");

IsString()(CreateCardDto.prototype, "expiryMonth");
IsNotEmpty()(CreateCardDto.prototype, "expiryMonth");
Length(2, 2)(CreateCardDto.prototype, "expiryMonth");

IsString()(CreateCardDto.prototype, "expiryYear");
IsNotEmpty()(CreateCardDto.prototype, "expiryYear");
Length(2, 4)(CreateCardDto.prototype, "expiryYear");

IsBoolean()(CreateCardDto.prototype, "isDefault");
IsOptional()(CreateCardDto.prototype, "isDefault");

const payload = {
  cardholderName: "John Doe",
  last4: "4242",
  type: "VISA",
  expiryMonth: "12",
  expiryYear: "2025",
  isDefault: false
};

const instance = plainToInstance(CreateCardDto, payload);
const errors = validateSync(instance, { whitelist: true, forbidNonWhitelisted: true });
console.log(JSON.stringify(errors, null, 2));
