import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Event, EventDocument } from '../../shared/schemas/event.schema';
import {
  CreateEventDto,
  UpdateEventDto,
  EventQueryDto,
} from '../dto/event.dto';
import { IEvent } from '../../shared/interfaces/event.interface';

@Injectable()
export class EventService {
  constructor(
    @InjectModel(Event.name) private readonly eventModel: Model<EventDocument>,
  ) {}

  async create(createEventDto: CreateEventDto): Promise<IEvent> {
    // Validar entrada
    if (
      !createEventDto.name ||
      !createEventDto.startDate ||
      !createEventDto.endDate
    ) {
      throw new BadRequestException(
        'Name, start date, and end date are required',
      );
    }

    // Validar fechas
    const startDate = new Date(createEventDto.startDate);
    const endDate = new Date(createEventDto.endDate);

    if (isNaN(startDate.getTime())) {
      throw new BadRequestException('Invalid start date format');
    }

    if (isNaN(endDate.getTime())) {
      throw new BadRequestException('Invalid end date format');
    }

    if (startDate >= endDate) {
      throw new BadRequestException('End date must be after start date');
    }

    // Verificar si ya existe un evento con el mismo nombre
    const existingEvent = await this.eventModel.findOne({
      name: createEventDto.name,
    });
    if (existingEvent) {
      throw new ConflictException(
        `Event '${createEventDto.name}' already exists.`,
      );
    }

    // Crear nuevo evento
    const newEvent = new this.eventModel({
      ...createEventDto,
      status: 'active',
    });

    const savedEvent = await newEvent.save();

    return this.mapEvent(savedEvent);
  }

  async findAll(query: EventQueryDto = {}): Promise<IEvent[]> {
    try {
      const filter: any = {};

      if (query.status) {
        filter.status = query.status;
      }

      if (query.search) {
        filter.name = { $regex: query.search, $options: 'i' };
      }

      const events = await this.eventModel.find(filter).sort({ startDate: -1 });
      return events.map((event) => this.mapEvent(event));
    } catch (error) {
      console.error('Error in findAll:', error.message);
      return [];
    }
  }

  async findOne(id: string): Promise<IEvent> {
    const event = await this.eventModel.findById(id);

    if (!event) {
      throw new NotFoundException(`Event with ID '${id}' not found.`);
    }

    return this.mapEvent(event);
  }

  async update(id: string, updateEventDto: UpdateEventDto): Promise<IEvent> {
    const existingEvent = await this.findOne(id);

    // Validar fechas si se están actualizando
    if (updateEventDto.startDate || updateEventDto.endDate) {
      const startDate = new Date(
        updateEventDto.startDate || existingEvent.startDate,
      );
      const endDate = new Date(updateEventDto.endDate || existingEvent.endDate);

      if (startDate >= endDate) {
        throw new BadRequestException('End date must be after start date');
      }
    }

    // Si se está actualizando el nombre, verificar que no exista otro evento con el mismo nombre
    if (updateEventDto.name && updateEventDto.name !== existingEvent.name) {
      const duplicateEvent = await this.eventModel.findOne({
        name: updateEventDto.name,
      });
      if (duplicateEvent && duplicateEvent._id !== id) {
        throw new ConflictException(
          `Event with name '${updateEventDto.name}' already exists.`,
        );
      }
    }

    const updatedEvent = await this.eventModel.findByIdAndUpdate(
      id,
      { ...updateEventDto },
      { new: true },
    );

    if (!updatedEvent) {
      throw new NotFoundException(`Event with ID '${id}' not found.`);
    }

    return this.mapEvent(updatedEvent);
  }

  async remove(id: string): Promise<{ message: string; deletedEvent: IEvent }> {
    const event = await this.findOne(id);

    await this.eventModel.findByIdAndDelete(id);

    return {
      message: `Event '${event.name}' has been successfully deleted`,
      deletedEvent: event,
    };
  }

  async findByStatus(status: 'active' | 'closed'): Promise<IEvent[]> {
    const events = await this.eventModel
      .find({ status })
      .sort({ startDate: -1 });
    return events.map((event) => this.mapEvent(event));
  }

  async changeStatus(id: string, status: 'active' | 'closed'): Promise<IEvent> {
    return this.update(id, { status });
  }

  async getActiveEvents(): Promise<IEvent[]> {
    return this.findByStatus('active');
  }

  async getClosedEvents(): Promise<IEvent[]> {
    return this.findByStatus('closed');
  }

  private mapEvent(event: EventDocument): IEvent {
    return {
      id: event._id,
      name: event.name,
      startDate: event.startDate,
      endDate: event.endDate,
      status: event.status,
      createdAt: event['createdAt'],
      updatedAt: event['updatedAt'],
    };
  }
}
