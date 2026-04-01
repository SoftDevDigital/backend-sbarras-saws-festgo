import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Expense, ExpenseDocument } from '../../shared/schemas/expense.schema';
import { IExpense } from '../../shared/interfaces/expense.interface';
import {
  CreateExpenseDto,
  UpdateExpenseDto,
  ExpenseQueryDto,
} from '../dto/expense.dto';

@Injectable()
export class ExpenseService {
  private readonly logger = new Logger(ExpenseService.name);

  constructor(
    @InjectModel(Expense.name)
    private readonly expenseModel: Model<ExpenseDocument>,
  ) {}

  async create(createExpenseDto: CreateExpenseDto): Promise<IExpense> {
    try {
      const newExpense = new this.expenseModel(createExpenseDto);
      const saved = await newExpense.save();
      return this.mapExpense(saved);
    } catch (error) {
      this.logger.error('Error creating expense:', error.message);
      throw new BadRequestException('Failed to create expense.');
    }
  }

  async findAll(query: ExpenseQueryDto = {}): Promise<IExpense[]> {
    try {
      const filter: any = {};

      if (query.eventId) filter.eventId = query.eventId;
      if (query.type) filter.type = query.type;

      if (query.search) {
        filter.description = { $regex: query.search, $options: 'i' };
      }

      if (query.dateFrom || query.dateTo) {
        filter.createdAt = {};
        if (query.dateFrom) filter.createdAt.$gte = new Date(query.dateFrom);
        if (query.dateTo) filter.createdAt.$lte = new Date(query.dateTo);
      }

      const sort: any = {};
      if (query.sort_by) {
        sort[query.sort_by] = query.sort_order === 'desc' ? -1 : 1;
      } else {
        sort.createdAt = -1;
      }

      const expenses = await this.expenseModel
        .find(filter)
        .sort(sort)
        .skip(query.offset || 0)
        .limit(query.limit || 100);

      return expenses.map((e) => this.mapExpense(e));
    } catch (error) {
      this.logger.error('Error fetching expenses:', error.message);
      return [];
    }
  }

  async findOne(id: string): Promise<IExpense> {
    const expense = await this.expenseModel.findById(id);
    if (!expense)
      throw new NotFoundException(`Expense with ID '${id}' not found.`);
    return this.mapExpense(expense);
  }

  async update(
    id: string,
    updateExpenseDto: UpdateExpenseDto,
  ): Promise<IExpense> {
    const updated = await this.expenseModel.findByIdAndUpdate(
      id,
      { $set: { ...updateExpenseDto, updatedAt: new Date() } },
      { new: true },
    );
    if (!updated) throw new NotFoundException('Expense not found');
    return this.mapExpense(updated);
  }

  async remove(id: string): Promise<void> {
    const result = await this.expenseModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundException('Expense not found');
  }

  async findByEvent(eventId: string): Promise<IExpense[]> {
    const expenses = await this.expenseModel
      .find({ eventId })
      .sort({ createdAt: -1 });
    return expenses.map((e) => this.mapExpense(e));
  }

  async getStats(eventId?: string): Promise<{
    total: number;
    totalAmount: number;
    averageAmount: number;
    byType: Record<string, { count: number; totalAmount: number }>;
  }> {
    const filter: any = {};
    if (eventId) filter.eventId = eventId;

    const expenses = await this.expenseModel.find(filter);

    const stats = {
      total: expenses.length,
      totalAmount: expenses.reduce((sum, e) => sum + e.amount, 0),
      averageAmount: 0,
      byType: {} as Record<string, { count: number; totalAmount: number }>,
    };

    if (expenses.length > 0) {
      stats.averageAmount = stats.totalAmount / expenses.length;
    }

    expenses.forEach((e) => {
      if (!stats.byType[e.type]) {
        stats.byType[e.type] = { count: 0, totalAmount: 0 };
      }
      stats.byType[e.type].count++;
      stats.byType[e.type].totalAmount += e.amount;
    });

    return stats;
  }

  private mapExpense(e: ExpenseDocument): IExpense {
    return {
      id: e._id,
      eventId: e.eventId,
      type: e.type,
      amount: e.amount,
      description: e.description,
      createdAt: e['createdAt']?.toISOString() || new Date().toISOString(),
      updatedAt: e['updatedAt']?.toISOString() || new Date().toISOString(),
    };
  }
}
