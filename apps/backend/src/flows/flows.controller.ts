import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { FlowsService } from './flows.service';
import { SaveFlowDto, UpdateFlowDto } from './dto/flow.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('flows')
export class FlowsController {
  constructor(private readonly flowsService: FlowsService) {}

  @Post()
  create(@Body() dto: SaveFlowDto, @CurrentUser() user: AuthUser) {
    return this.flowsService.create(dto, user.id);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.flowsService.findAll(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.flowsService.findOne(id, user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateFlowDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.flowsService.update(id, dto, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.flowsService.remove(id, user.id);
  }

  @Post(':id/execute')
  @HttpCode(HttpStatus.OK)
  execute(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.flowsService.execute(id, user.id);
  }
}
