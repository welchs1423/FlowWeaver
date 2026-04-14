import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ExecutionsService } from './executions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('executions')
export class ExecutionsController {
  constructor(private readonly executionsService: ExecutionsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.executionsService.findAll(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.executionsService.findOne(id, user.id);
  }
}
