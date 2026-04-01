import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { EmployeeService } from '../services/employee.service';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  EmployeeQueryDto,
  CreateAssignmentDto,
  UpdateAssignmentDto,
} from '../dto/employee.dto';
import {
  IEmployee,
  IEmployeeAssignment,
} from '../../shared/interfaces/employee.interface';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RoleGuard } from '../../auth/guards/role.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { SWAGGER_JWT } from '../../swagger/swagger.constants';

@ApiTags('employees')
@ApiBearerAuth(SWAGGER_JWT)
@Controller('employees')
@UseGuards(JwtAuthGuard, RoleGuard)
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  // ===== EMPLEADOS =====

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('admin')
  @ApiOperation({
    summary: 'Crear empleado / usuario operativo',
    description: 'Alta según `CreateEmployeeDto`. Solo **admin**.',
  })
  @ApiResponse({ status: 201, description: 'Empleado creado.' })
  async create(
    @Body() createEmployeeDto: CreateEmployeeDto,
  ): Promise<IEmployee> {
    return this.employeeService.create(createEmployeeDto);
  }

  @Get()
  @Roles('admin')
  @ApiOperation({
    summary: 'Listar empleados',
    description: 'Listado paginado/filtrado con `EmployeeQueryDto`. Solo **admin**.',
  })
  @ApiResponse({ status: 200, description: 'Lista de empleados.' })
  async findAll(@Query() query: EmployeeQueryDto): Promise<IEmployee[]> {
    return this.employeeService.findAll(query);
  }

  @Get('search')
  @Roles('admin', 'bartender')
  @ApiOperation({
    summary: 'Búsqueda unificada (empleados / asignaciones)',
    description:
      'Con **`eventId`** o **`barId`**: resuelve asignaciones y devuelve empleados de ese contexto. Con **`role=bartender`**: filtra por rol. Sin params: equivale a listar todos (misma semántica que el servicio). Debe declararse **antes** de `GET /:id` para que la ruta literal `search` no se interprete como UUID.',
  })
  @ApiResponse({ status: 200, description: 'Empleados o asignaciones según query.' })
  async searchEmployees(
    @Query('role') role?: string,
    @Query('eventId') eventId?: string,
    @Query('barId') barId?: string,
    @Query('status') status?: string,
  ): Promise<IEmployee[] | IEmployeeAssignment[]> {
    if (eventId || barId) {
      const assignments = await this.employeeService.findAssignments({
        eventId,
        barId,
        status: status as 'active' | 'completed',
      });

      if (eventId || barId) {
        const userIds = [...new Set(assignments.map((a) => a.userId))];
        const employees: IEmployee[] = [];

        for (const userId of userIds) {
          try {
            const employee = await this.employeeService.findOne(userId);
            employees.push(employee);
          } catch (error) {
            console.warn(`User ${userId} not found`);
          }
        }
        return employees;
      }

      return assignments;
    }

    if (role && ['bartender'].includes(role)) {
      return this.employeeService.findAll({ role: role as 'bartender' });
    }

    return this.employeeService.findAll();
  }

  @Get(':id')
  @Roles('admin', 'bartender')
  @ApiOperation({
    summary: 'Obtener empleado por ID',
    description: 'UUID del usuario/empleado.',
  })
  @ApiResponse({ status: 200, description: 'Empleado encontrado.' })
  async findOne(@Param('id') id: string): Promise<IEmployee> {
    return this.employeeService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Actualizar empleado', description: 'Solo **admin**.' })
  @ApiResponse({ status: 200, description: 'Empleado actualizado.' })
  async update(
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
  ): Promise<IEmployee> {
    return this.employeeService.update(id, updateEmployeeDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('admin')
  @ApiOperation({ summary: 'Eliminar empleado', description: 'Solo **admin**.' })
  @ApiResponse({ status: 204, description: 'Eliminado.' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.employeeService.remove(id);
  }

  @Post(':id/assign')
  @HttpCode(HttpStatus.CREATED)
  @Roles('admin')
  @ApiOperation({
    summary: 'Asignar empleado a barra/evento',
    description:
      'Crea una asignación para el usuario `:id`. Body sin `userId` (se toma de la URL). Solo **admin**.',
  })
  @ApiResponse({ status: 201, description: 'Asignación creada.' })
  async assignEmployee(
    @Param('id') userId: string,
    @Body() assignmentData: Omit<CreateAssignmentDto, 'userId'>,
  ): Promise<IEmployeeAssignment> {
    const createAssignmentDto: CreateAssignmentDto = {
      ...assignmentData,
      userId,
    };
    return this.employeeService.createAssignment(createAssignmentDto);
  }

  @Patch('assign/:assignmentId')
  @Roles('admin')
  @ApiOperation({
    summary: 'Actualizar asignación',
    description: 'Por `assignmentId`. Solo **admin**.',
  })
  @ApiResponse({ status: 200, description: 'Asignación actualizada.' })
  async updateAssignment(
    @Param('assignmentId') assignmentId: string,
    @Body() updateAssignmentDto: UpdateAssignmentDto,
  ): Promise<IEmployeeAssignment> {
    return this.employeeService.updateAssignment(
      assignmentId,
      updateAssignmentDto,
    );
  }

  @Delete('assign/:assignmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('admin')
  @ApiOperation({ summary: 'Eliminar asignación', description: 'Solo **admin**.' })
  @ApiResponse({ status: 204, description: 'Eliminado.' })
  async removeAssignment(
    @Param('assignmentId') assignmentId: string,
  ): Promise<void> {
    return this.employeeService.removeAssignment(assignmentId);
  }
}
