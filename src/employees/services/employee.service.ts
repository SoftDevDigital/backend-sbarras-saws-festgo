import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Employee,
  EmployeeDocument,
} from '../../shared/schemas/employee.schema';
import {
  EmployeeAssignment,
  EmployeeAssignmentDocument,
} from '../../shared/schemas/employee-assignment.schema';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  EmployeeQueryDto,
  CreateAssignmentDto,
  UpdateAssignmentDto,
  AssignmentQueryDto,
} from '../dto/employee.dto';
import {
  IEmployee,
  IEmployeeAssignment,
} from '../../shared/interfaces/employee.interface';

@Injectable()
export class EmployeeService {
  private readonly logger = new Logger(EmployeeService.name);

  constructor(
    @InjectModel(Employee.name)
    private readonly employeeModel: Model<EmployeeDocument>,
    @InjectModel(EmployeeAssignment.name)
    private readonly assignmentModel: Model<EmployeeAssignmentDocument>,
  ) {}

  // ===== EMPLEADOS =====

  async create(createEmployeeDto: CreateEmployeeDto): Promise<IEmployee | any> {
    try {
      // In MongoDB we use the document as the primary key if it is unique
      const existing = await this.employeeModel.findOne({
        document: createEmployeeDto['document'],
      });
      if (existing)
        throw new ConflictException('Employee document already exists.');

      const newEmployee = new this.employeeModel(createEmployeeDto);
      const saved = await newEmployee.save();
      return this.mapEmployee(saved);
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      this.logger.error('Error creating employee:', error.message);
      throw new BadRequestException('Failed to create employee.');
    }
  }

  async findAll(query: EmployeeQueryDto = {}): Promise<IEmployee[] | any[]> {
    try {
      const filter: any = {};
      if (query.role) filter.role = query.role;
      if (query.search) {
        filter.$or = [
          { name: { $regex: query.search, $options: 'i' } },
          // @ts-ignore
          { document: { $regex: query.search, $options: 'i' } },
        ];
      }

      const employees = await this.employeeModel.find(filter).sort({ name: 1 });
      return employees.map((e) => this.mapEmployee(e));
    } catch (error) {
      this.logger.error('Error fetching employees:', error.message);
      return [];
    }
  }

  async findOne(id: string): Promise<IEmployee | any> {
    const employee = await this.employeeModel.findById(id);
    if (!employee) throw new NotFoundException('Employee not found');
    return this.mapEmployee(employee);
  }

  async update(
    id: string,
    updateEmployeeDto: UpdateEmployeeDto,
  ): Promise<IEmployee | any> {
    const updated = await this.employeeModel.findByIdAndUpdate(
      id,
      { $set: { ...updateEmployeeDto, updatedAt: new Date() } },
      { new: true },
    );
    if (!updated) throw new NotFoundException('Employee not found');
    return this.mapEmployee(updated);
  }

  async remove(id: string): Promise<void> {
    // Check assignments
    const activeAssignments = await this.assignmentModel.findOne({
      userId: id,
      status: 'active',
    });
    if (activeAssignments)
      throw new ConflictException(
        'Cannot delete employee with active assignments.',
      );

    const result = await this.employeeModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundException('Employee not found');
  }

  // ===== ASIGNACIONES =====

  async createAssignment(
    createAssignmentDto: CreateAssignmentDto,
  ): Promise<IEmployeeAssignment | any> {
    const existing = await this.assignmentModel.findOne({
      userId: createAssignmentDto.userId,
      eventId: createAssignmentDto.eventId,
      shift: createAssignmentDto.shift,
      status: 'active',
    });
    if (existing)
      throw new ConflictException(
        'Active assignment already exists for this shift.',
      );

    const newAssignment = new this.assignmentModel(createAssignmentDto);
    const saved = await newAssignment.save();
    return this.mapAssignment(saved);
  }

  async findAssignments(
    query: AssignmentQueryDto = {},
  ): Promise<IEmployeeAssignment[] | any[]> {
    const filter: any = {};
    if (query.eventId) filter.eventId = query.eventId;
    if (query.userId) filter.userId = query.userId;
    if (query.barId) filter.barId = query.barId;
    if (query.shift) filter.shift = query.shift;
    if (query.status) filter.status = query.status;

    const assignments = await this.assignmentModel
      .find(filter)
      .sort({ assignedAt: -1 });
    return assignments.map((a) => this.mapAssignment(a));
  }

  async updateAssignment(
    id: string,
    updateAssignmentDto: UpdateAssignmentDto,
  ): Promise<IEmployeeAssignment | any> {
    const updated = await this.assignmentModel.findByIdAndUpdate(
      id,
      { $set: { ...updateAssignmentDto, updatedAt: new Date() } },
      { new: true },
    );
    if (!updated) throw new NotFoundException('Assignment not found');
    return this.mapAssignment(updated);
  }

  async removeAssignment(id: string): Promise<void> {
    const result = await this.assignmentModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundException('Assignment not found');
  }

  private mapEmployee(e: EmployeeDocument): any {
    return {
      id: e._id,
      userId: e.userId,
      name: e.name,
      email: e.email,
      role: e.role,
      status: e.status,
      eventId: e.eventId,
      barId: e.barId,
      permissions: e.permissions,
      // @ts-ignore
      document: e.document, // Adding this if used in legacy
      createdAt: e['createdAt']?.toISOString() || new Date().toISOString(),
      updatedAt: e['updatedAt']?.toISOString() || new Date().toISOString(),
    };
  }

  private mapAssignment(a: EmployeeAssignmentDocument): any {
    return {
      id: a._id,
      userId: a.userId,
      eventId: a.eventId,
      barId: a.barId,
      shift: a.shift,
      status: a.status,
      assignedAt: a.assignedAt,
      createdAt: a['createdAt']?.toISOString() || new Date().toISOString(),
      updatedAt: a['updatedAt']?.toISOString() || new Date().toISOString(),
    };
  }
}
