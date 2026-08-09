import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { VenueService } from './venue.service';
import { CreateVenueDto } from './dto/create-venue.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';
import { QueryVenueDto } from './dto/query-venue.dto';
import { Public } from 'src/auth/decorators/public.decorator';
import {
  CurrentUser,
  type UserPayload,
} from 'src/auth/decorators/current-user.decorator';
import { ActiveUserPipe } from 'src/auth/pipes/active-user.pipe';

@ApiTags('venue')
@Controller('venue')
export class VenueController {
  constructor(private readonly venueService: VenueService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new venue' })
  @ApiResponse({ status: 201, description: 'Venue created successfully' })
  create(
    @Body() data: CreateVenueDto,
    @CurrentUser(ActiveUserPipe) user: UserPayload,
  ) {
    return this.venueService.create(data, user.id);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'List all venues' })
  @ApiResponse({ status: 200, description: 'Returns paginated list of venues' })
  findAll(@Query() query: QueryVenueDto) {
    return this.venueService.findAll(query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get venue by ID' })
  @ApiResponse({ status: 200, description: 'Returns the venue' })
  @ApiResponse({ status: 404, description: 'Venue not found' })
  findOne(@Param('id') id: string) {
    return this.venueService.findOne(id);
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a venue' })
  @ApiResponse({ status: 200, description: 'Venue updated successfully' })
  @ApiResponse({ status: 404, description: 'Venue not found' })
  update(
    @Param('id') id: string,
    @Body() data: UpdateVenueDto,
    @CurrentUser(ActiveUserPipe) user: UserPayload,
  ) {
    return this.venueService.update(id, user, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a venue' })
  @ApiResponse({ status: 204, description: 'Venue deleted successfully' })
  @ApiResponse({ status: 404, description: 'Venue not found' })
  delete(
    @Param('id') id: string,
    @CurrentUser(ActiveUserPipe) user: UserPayload,
  ) {
    return this.venueService.delete(id, user);
  }
}
