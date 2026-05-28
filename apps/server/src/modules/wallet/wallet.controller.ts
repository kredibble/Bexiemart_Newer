import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from "@nestjs/common";
import { AuthGuard } from "../../guards/auth.guard";
import { WalletService } from "./wallet.service";
import { TopupDto } from "./dto/topup.dto";
import { TransferDto } from "./dto/transfer.dto";
import { PinDto } from "./dto/pin.dto";
import { ChangePinDto } from "./dto/change-pin.dto";
import { CreateCardDto, UpdateCardDto, VerifyCardDto } from "./dto/card.dto";
import { LinkBankAccountDto, LinkMomoAccountDto } from "./dto/linked-accounts.dto";
import { WithdrawDto } from "./dto/withdraw.dto";
import { ApiTags, ApiOperation, ApiBody } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

@ApiTags("Wallet")
@Controller("wallet")
@UseGuards(AuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  @ApiOperation({ summary: "Get wallet balance and details" })
  getWallet(@Req() req: any) {
    return this.walletService.getWallet(req.user.id);
  }

  @Get("transactions")
  @ApiOperation({ summary: "Get wallet transaction history" })
  getTransactions(@Req() req: any, @Query("page") page?: string) {
    return this.walletService.getTransactions(req.user.id, page ? parseInt(page) : 1);
  }

  @Post("topup/initialize")
  @ApiOperation({ summary: "Initialize a wallet top-up" })
  @ApiBody({ type: TopupDto })
  initializeTopUp(@Req() req: any, @Body() body: TopupDto) {
    return this.walletService.initializeTopUp(req.user.id, body.amount, body.channel || "MOMO");
  }

  @Get("topup/verify/:reference")
  @ApiOperation({ summary: "Verify a top-up payment reference" })
  verifyTopUp(@Req() req: any, @Param("reference") reference: string) {
    return this.walletService.verifyTopUp(req.user.id, reference);
  }

  @Post("withdraw")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: "Withdraw funds to a bank or momo account" })
  @ApiBody({ type: WithdrawDto })
  withdraw(@Req() req: any, @Body() body: WithdrawDto) {
    return this.walletService.withdraw(req.user.id, body.amount, body.accountId, body.accountType, body.pin);
  }

  @Post("transfer")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: "Transfer funds to another user" })
  @ApiBody({ type: TransferDto })
  transfer(@Req() req: any, @Body() body: TransferDto) {
    return this.walletService.transfer(req.user.id, body.recipientEmail, body.amount, body.pin);
  }

  @Post("pin")
  @ApiOperation({ summary: "Set wallet transaction PIN" })
  @ApiBody({ type: PinDto })
  setPin(@Req() req: any, @Body() body: PinDto) {
    return this.walletService.setPin(req.user.id, body.pin);
  }

  @Post("pin/change")
  @ApiOperation({ summary: "Change wallet transaction PIN" })
  @ApiBody({ type: ChangePinDto })
  changePin(@Req() req: any, @Body() body: ChangePinDto) {
    return this.walletService.changePin(req.user.id, body.currentPin, body.newPin);
  }

  @Post("pin/verify")
  @ApiOperation({ summary: "Verify wallet transaction PIN" })
  @ApiBody({ type: PinDto })
  verifyPin(@Req() req: any, @Body() body: PinDto) {
    return this.walletService.verifyPin(req.user.id, body.pin);
  }

  @Post("pin/reset")
  @ApiOperation({ summary: "Reset PIN failure count" })
  resetPinFailures(@Req() req: any) {
    return this.walletService.resetPinFailures(req.user.id);
  }

  @Get("pin/status")
  @ApiOperation({ summary: "Get wallet PIN status" })
  getPinStatus(@Req() req: any) {
    return this.walletService.getPinStatus(req.user.id);
  }

  @Get("cards")
  @ApiOperation({ summary: "Get wallet cards" })
  getCards(@Req() req: any) {
    return this.walletService.getCards(req.user.id);
  }

  @Post("cards")
  @ApiOperation({ summary: "Add a card to wallet" })
  @ApiBody({ type: CreateCardDto })
  addCard(@Req() req: any, @Body() body: CreateCardDto) {
    return this.walletService.addCard(req.user.id, body);
  }

  @Put("cards/:id")
  @ApiOperation({ summary: "Update a card in wallet" })
  @ApiBody({ type: UpdateCardDto })
  updateCard(@Req() req: any, @Param("id") id: string, @Body() body: UpdateCardDto) {
    return this.walletService.updateCard(req.user.id, id, body);
  }

  @Delete("cards/:id")
  @ApiOperation({ summary: "Delete a card from wallet" })
  deleteCard(@Req() req: any, @Param("id") id: string) {
    return this.walletService.deleteCard(req.user.id, id);
  }

  @Post("cards/:id/default")
  @ApiOperation({ summary: "Set a card as default" })
  setDefaultCard(@Req() req: any, @Param("id") id: string) {
    return this.walletService.setDefaultCard(req.user.id, id);
  }

  /* ─── Bank Accounts ─── */

  @Get("bank-accounts")
  @ApiOperation({ summary: "Get linked bank accounts" })
  getBankAccounts(@Req() req: any) {
    return this.walletService.getBankAccounts(req.user.id);
  }

  @Post("bank-accounts")
  @ApiOperation({ summary: "Link a new bank account via Paystack" })
  @ApiBody({ type: LinkBankAccountDto })
  linkBankAccount(@Req() req: any, @Body() body: LinkBankAccountDto) {
    return this.walletService.linkBankAccount(req.user.id, body);
  }

  @Delete("bank-accounts/:id")
  @ApiOperation({ summary: "Remove a linked bank account" })
  deleteBankAccount(@Req() req: any, @Param("id") id: string) {
    return this.walletService.deleteBankAccount(req.user.id, id);
  }

  @Get("resolve-account")
  @ApiOperation({ summary: "Resolve/verify a bank account number via Paystack" })
  resolveAccount(@Query("bankCode") bankCode: string, @Query("accountNumber") accountNumber: string) {
    return this.walletService.resolveBankAccount(bankCode, accountNumber);
  }

  /* ─── Mobile Money Accounts ─── */

  @Get("momo-accounts")
  @ApiOperation({ summary: "Get linked mobile money accounts" })
  getMomoAccounts(@Req() req: any) {
    return this.walletService.getMomoAccounts(req.user.id);
  }

  @Post("momo-accounts")
  @ApiOperation({ summary: "Link a mobile money account via Paystack" })
  @ApiBody({ type: LinkMomoAccountDto })
  linkMomoAccount(@Req() req: any, @Body() body: LinkMomoAccountDto) {
    return this.walletService.linkMomoAccount(req.user.id, body);
  }

  @Delete("momo-accounts/:id")
  @ApiOperation({ summary: "Remove a linked mobile money account" })
  deleteMomoAccount(@Req() req: any, @Param("id") id: string) {
    return this.walletService.deleteMomoAccount(req.user.id, id);
  }

  @Post("cards/verify")
  @ApiOperation({ summary: "Verify a Paystack transaction and save the card token" })
  @ApiBody({ type: VerifyCardDto })
  verifyAndSaveCard(@Req() req: any, @Body() body: VerifyCardDto) {
    return this.walletService.verifyAndSaveCard(req.user.id, body.reference, body.cardholderName, body.isDefault);
  }
}
