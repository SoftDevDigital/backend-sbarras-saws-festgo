import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  Patch,
  Param,
  Query,
  Delete,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import {
  LoginDto,
  RegisterDto,
  UpdateUserRoleDto,
  UserQueryDto,
} from '../dto/auth.dto';
import { IAuthResponse, IUser } from '../../shared/interfaces/user.interface';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RoleGuard } from '../guards/role.guard';
import { Roles } from '../decorators/roles.decorator';
import { SWAGGER_JWT } from '../../swagger/swagger.constants';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Iniciar sesión',
    description:
      'Público (no requiere JWT). Devuelve `token` y `user`. Usa el token en **Authorize** para el resto de endpoints.',
  })
  @ApiResponse({ status: 200, description: 'Credenciales válidas.' })
  @ApiResponse({ status: 401, description: 'Email o contraseña incorrectos.' })
  async login(@Body() loginDto: LoginDto): Promise<IAuthResponse> {
    return this.authService.login(loginDto);
  }

  @Post('register')
  @ApiOperation({
    summary: 'Registrar usuario',
    description:
      'Crea usuario y devuelve token. En producción suele restringirse; confirma reglas de negocio.',
  })
  @ApiResponse({ status: 201, description: 'Usuario creado.' })
  @ApiResponse({ status: 409, description: 'Email ya registrado.' })
  async register(@Body() registerDto: RegisterDto): Promise<IAuthResponse> {
    return this.authService.register(registerDto);
  }

  // ===== GESTIÓN DE USUARIOS (Solo Admin) =====

  @Get('users')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('admin')
  @ApiBearerAuth(SWAGGER_JWT)
  @ApiOperation({
    summary: 'Listar usuarios',
    description: 'Solo **admin**. Filtros opcionales: `search`, `role`.',
  })
  async findAllUsers(
    @Query() query: UserQueryDto,
  ): Promise<Omit<IUser, 'password'>[]> {
    return this.authService.findAllUsers(query);
  }

  @Get('users/:id')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('admin')
  @ApiBearerAuth(SWAGGER_JWT)
  @ApiOperation({ summary: 'Obtener usuario por ID', description: 'Solo **admin**.' })
  async findUserById(
    @Param('id') id: string,
  ): Promise<Omit<IUser, 'password'> | null> {
    return this.authService.findUserById(id);
  }

  @Patch('users/:id/role')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('admin')
  @ApiBearerAuth(SWAGGER_JWT)
  @ApiOperation({
    summary: 'Cambiar rol de usuario',
    description: 'Solo **admin**: `admin` o `bartender`.',
  })
  async updateUserRole(
    @Param('id') userId: string,
    @Body() updateRoleDto: UpdateUserRoleDto,
  ): Promise<Omit<IUser, 'password'>> {
    return this.authService.updateUserRole(userId, updateRoleDto);
  }

  @Delete('users/:id')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth(SWAGGER_JWT)
  @ApiOperation({ summary: 'Eliminar usuario', description: 'Solo **admin**.' })
  @ApiResponse({ status: 204, description: 'Eliminado.' })
  async deleteUser(@Param('id') userId: string): Promise<void> {
    return this.authService.deleteUser(userId);
  }
}
