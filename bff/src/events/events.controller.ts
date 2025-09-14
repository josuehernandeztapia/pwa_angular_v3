import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { EventsService } from './events.service';

@ApiTags('events')
@Controller('api/bff/events')
export class EventsController {
  constructor(private events: EventsService) {}

  @Post(':name')
  @ApiOperation({ summary: 'Receive app event and forward to Make/n8n (stub)' })
  forward(@Param('name') name: string, @Body() payload: any) {
    return this.events.forward(name, payload);
  }
}

