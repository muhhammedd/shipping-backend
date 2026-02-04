import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UserRole } from '@prisma/client';
import { Roles } from '../iam/authorization/decorators/roles.decorator';
import { ActiveUser } from '../../common/decorators/active-user.decorator';
import type { ActiveUserData } from '../../common/interfaces/active-user-data.interface';

@Roles(UserRole.ADMIN)
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Post()
    create(@Body() createUserDto: any, @ActiveUser() user: ActiveUserData) {
        return this.usersService.create(createUserDto, user);
    }

    @Get()
    findAll(
        @Query('role') role: UserRole,
        @ActiveUser() user: ActiveUserData,
    ) {
        return this.usersService.findAll(user, role);
    }

    @Get(':id')
    findOne(@Param('id') id: string, @ActiveUser() user: ActiveUserData) {
        return this.usersService.findOne(id, user);
    }

    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() updateUserDto: any,
        @ActiveUser() user: ActiveUserData,
    ) {
        return this.usersService.update(id, updateUserDto, user);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @ActiveUser() user: ActiveUserData) {
        return this.usersService.remove(id, user);
    }
}
