import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AddressBookService } from '../services/address-book.service';
import { CreateAddressDto, UpdateAddressDto } from '../dto/address-book.dto';
import { ActiveUser } from '../../../common/decorators/active-user.decorator';
import { Roles } from '../../iam/authorization/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import type { ActiveUserData } from '../../../common/interfaces/active-user-data.interface';

@ApiTags('Merchants')
@ApiBearerAuth()
@Controller('merchants/address-book')
@Roles(UserRole.MERCHANT)
export class AddressBookController {
    constructor(private readonly addressBookService: AddressBookService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new saved address' })
    @ApiResponse({ status: 201, description: 'Address created successfully' })
    create(@Body() createAddressDto: CreateAddressDto, @ActiveUser() user: ActiveUserData) {
        return this.addressBookService.create(createAddressDto, user);
    }

    @Get()
    @ApiOperation({ summary: 'Get all saved addresses' })
    @ApiResponse({ status: 200, description: 'List of saved addresses' })
    findAll(@ActiveUser() user: ActiveUserData) {
        return this.addressBookService.findAll(user);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a specific address' })
    @ApiResponse({ status: 200, description: 'Address details' })
    findOne(@Param('id') id: string, @ActiveUser() user: ActiveUserData) {
        return this.addressBookService.findOne(id, user);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update an address' })
    @ApiResponse({ status: 200, description: 'Address updated successfully' })
    update(
        @Param('id') id: string,
        @Body() updateAddressDto: UpdateAddressDto,
        @ActiveUser() user: ActiveUserData,
    ) {
        return this.addressBookService.update(id, updateAddressDto, user);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete an address' })
    @ApiResponse({ status: 200, description: 'Address deleted successfully' })
    remove(@Param('id') id: string, @ActiveUser() user: ActiveUserData) {
        return this.addressBookService.remove(id, user);
    }

    @Patch(':id/set-default')
    @ApiOperation({ summary: 'Set address as default' })
    @ApiResponse({ status: 200, description: 'Address set as default' })
    setDefault(@Param('id') id: string, @ActiveUser() user: ActiveUserData) {
        return this.addressBookService.setDefault(id, user);
    }
}
