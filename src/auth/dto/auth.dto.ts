import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
  Matches,
} from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'cajero@ejemplo.com',
    description: 'Email registrado en el sistema.',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'secreto123',
    description: 'Contraseña (mínimo 6 caracteres).',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'nuevo@ejemplo.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'secreto123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'Juan Pérez', description: 'Nombre visible en tickets y reportes.' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({
    enum: ['admin', 'bartender'],
    description: 'Por defecto `bartender` si se omite.',
  })
  @IsEnum(['admin', 'bartender'])
  @IsOptional()
  role?: 'admin' | 'bartender'; // Por defecto será 'bartender'

  @ApiPropertyOptional({
    example: '12345678',
    description: 'Solo dígitos, 7–15 caracteres.',
  })
  @IsString()
  @IsOptional()
  @Matches(/^[0-9]{7,15}$/, { message: 'Document must be 7-15 digits only' })
  document?: string;

  @ApiPropertyOptional({ description: 'Teléfono u otro contacto.' })
  @IsString()
  @IsOptional()
  contact?: string; // Si no se proporciona, se usa el email

  @ApiPropertyOptional({
    enum: ['bartender', 'manager', 'cashier'],
    description: 'Rol operativo (caja, manager, etc.).',
  })
  @IsEnum(['bartender', 'manager', 'cashier'])
  @IsOptional()
  employeeRole?: 'bartender' | 'manager' | 'cashier'; // Rol como empleado
}

export class UpdateUserRoleDto {
  @ApiProperty({ enum: ['admin', 'bartender'] })
  @IsEnum(['admin', 'bartender'])
  role: 'admin' | 'bartender';
}

export class UserQueryDto {
  @ApiPropertyOptional({ description: 'Busca en nombre o email (parcial).' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: ['admin', 'bartender'] })
  @IsEnum(['admin', 'bartender'])
  @IsOptional()
  role?: 'admin' | 'bartender';
}
