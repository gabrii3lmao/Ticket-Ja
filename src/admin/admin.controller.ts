import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'generated/prisma/enums';
import { QueryOrganizerApplication } from './dto/query-organizer-application.dto';
import { RejectReasonDto } from './dto/rejected-reason.dto';

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('organizer-application')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List organizer applications' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated organizer applications',
  })
  listOrganizerSummary(@Query() query: QueryOrganizerApplication) {
    return this.adminService.listOrganizerApplications(query);
  }

  @Patch('organizer-application/:id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Approve an organizer application' })
  @ApiResponse({ status: 200, description: 'Organizer approved successfully' })
  @ApiResponse({ status: 400, description: 'Application is not pending' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  approveOrganizerApplication(@Param('id') id: string) {
    return this.adminService.approveOrganizerApplication(id);
  }

  @Patch('organizer-application/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Reject an organizer application' })
  @ApiResponse({ status: 200, description: 'Organizer rejected successfully' })
  @ApiResponse({ status: 400, description: 'Application is not pending' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  rejectOrganizerApplication(
    @Param('id') id: string,
    @Body() rejectReason: RejectReasonDto,
  ) {
    return this.adminService.rejectOrganizerApplication(id, rejectReason);
  }
}
