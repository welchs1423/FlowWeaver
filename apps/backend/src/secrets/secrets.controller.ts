import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { SecretsService } from './secrets.service';
import { CreateSecretDto } from './secrets.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('secrets')
export class SecretsController {
  constructor(private readonly secretsService: SecretsService) {}

  @Post()
  create(@Body() dto: CreateSecretDto, @CurrentUser() user: AuthUser) {
    return this.secretsService.create(dto, user.id);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.secretsService.findAll(user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.secretsService.remove(id, user.id);
  }
}
