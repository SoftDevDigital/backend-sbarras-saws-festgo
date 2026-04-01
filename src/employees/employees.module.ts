import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmployeeController } from './controllers/employee.controller';
import { EmployeeService } from './services/employee.service';
import { Employee, EmployeeSchema } from '../shared/schemas/employee.schema';
import {
  EmployeeAssignment,
  EmployeeAssignmentSchema,
} from '../shared/schemas/employee-assignment.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Employee.name, schema: EmployeeSchema },
      { name: EmployeeAssignment.name, schema: EmployeeAssignmentSchema },
    ]),
    AuthModule,
  ],
  controllers: [EmployeeController],
  providers: [EmployeeService],
  exports: [EmployeeService],
})
export class EmployeesModule {}
