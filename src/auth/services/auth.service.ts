import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from '../../shared/schemas/user.schema';
import {
  LoginDto,
  RegisterDto,
  UpdateUserRoleDto,
  UserQueryDto,
} from '../dto/auth.dto';
import { IAuthResponse, IUser } from '../../shared/interfaces/user.interface';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<IAuthResponse> {
    // Validar entrada
    if (!registerDto.email || !registerDto.password || !registerDto.name) {
      throw new BadRequestException('Email, password, and name are required');
    }

    // Check if user already exists
    const existingUser = await this.userModel.findOne({
      email: registerDto.email,
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Create user
    const newUser = new this.userModel({
      email: registerDto.email,
      password: hashedPassword,
      name: registerDto.name,
      role: registerDto.role || 'bartender',
      document: registerDto.document,
      contact: registerDto.contact,
      employeeRole: registerDto.employeeRole,
    });

    const savedUser = await newUser.save();

    // Generate JWT
    const token = this.jwtService.sign({
      sub: savedUser._id,
      email: savedUser.email,
      name: savedUser.name,
      role: savedUser.role,
    });

    return {
      token,
      user: this.mapUser(savedUser),
    };
  }

  async login(loginDto: LoginDto): Promise<IAuthResponse> {
    // Validar entrada
    if (!loginDto.email || !loginDto.password) {
      throw new BadRequestException('Email and password are required');
    }

    // Find user by email
    const user = await this.userModel.findOne({ email: loginDto.email });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT
    const token = this.jwtService.sign({
      sub: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    return {
      token,
      user: this.mapUser(user),
    };
  }

  async validateUser(userId: string): Promise<any> {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user['createdAt'],
      updatedAt: user['updatedAt'],
    };
  }

  // ===== GESTIÓN DE USUARIOS (Solo Admin) =====

  async findAllUsers(
    query: UserQueryDto = {},
  ): Promise<Omit<IUser, 'password'>[]> {
    try {
      const filter: any = {};

      if (query.role) {
        filter.role = query.role;
      }

      if (query.search) {
        filter.$or = [
          { name: { $regex: query.search, $options: 'i' } },
          { email: { $regex: query.search, $options: 'i' } },
        ];
      }

      const users = await this.userModel.find(filter).sort({ createdAt: -1 });

      return users.map((user) => this.mapUser(user));
    } catch (error) {
      console.error('Error finding users:', error);
      throw new BadRequestException(
        'Failed to retrieve users. Please try again.',
      );
    }
  }

  async findUserById(id: string): Promise<Omit<IUser, 'password'> | null> {
    try {
      if (!id) {
        throw new BadRequestException('User ID is required');
      }

      const user = await this.userModel.findById(id);

      if (!user) {
        return null;
      }

      return this.mapUser(user);
    } catch (error) {
      console.error('Error finding user:', error);
      throw new BadRequestException(
        'Failed to retrieve user. Please try again.',
      );
    }
  }

  async updateUserRole(
    userId: string,
    updateRoleDto: UpdateUserRoleDto,
  ): Promise<Omit<IUser, 'password'>> {
    try {
      if (!userId) {
        throw new BadRequestException('User ID is required');
      }

      const updatedUser = await this.userModel.findByIdAndUpdate(
        userId,
        { role: updateRoleDto.role },
        { new: true },
      );

      if (!updatedUser) {
        throw new BadRequestException('User not found');
      }

      return this.mapUser(updatedUser);
    } catch (error) {
      console.error('Error updating user role:', error);
      throw new BadRequestException(
        'Failed to update user role. Please try again.',
      );
    }
  }

  async deleteUser(userId: string): Promise<void> {
    try {
      if (!userId) {
        throw new BadRequestException('User ID is required');
      }

      const result = await this.userModel.deleteOne({ _id: userId });

      if (result.deletedCount === 0) {
        throw new BadRequestException('User not found');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      throw new BadRequestException('Failed to delete user. Please try again.');
    }
  }

  private mapUser(user: UserDocument): Omit<IUser, 'password'> {
    return {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      document: user.document,
      contact: user.contact,
      employeeRole: user.employeeRole,
      createdAt: user['createdAt'],
      updatedAt: user['updatedAt'],
    };
  }
}
