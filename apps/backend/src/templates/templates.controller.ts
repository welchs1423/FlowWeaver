import { Controller, Get, Post, Param, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  findAll() {
    return this.templatesService.findAll();
  }

  @Post(':id/use')
  @HttpCode(HttpStatus.CREATED)
  use(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.templatesService.use(id, user.id);
  }
}
