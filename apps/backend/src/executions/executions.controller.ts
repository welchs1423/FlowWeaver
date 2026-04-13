import { Controller, Get, Param } from '@nestjs/common';
import { ExecutionsService } from './executions.service';

@Controller('executions')
export class ExecutionsController {
  constructor(private readonly executionsService: ExecutionsService) {}

  @Get()
  findAll() {
    return this.executionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.executionsService.findOne(id);
  }
}
