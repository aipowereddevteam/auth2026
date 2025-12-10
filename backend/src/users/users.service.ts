import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto) {
    // 1. Check if email already exists
    const existingUser = await this.usersRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    // 2. Hash the password
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(createUserDto.password, salt);

    // 3. Create and Save
    const user = this.usersRepository.create({
      email: createUserDto.email,
      password: hashedPassword,
    });

    return this.usersRepository.save(user);
  }

  async findOneByEmail(email: string) {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findOneById(id: number) {
    if (!id) return null;
    return this.usersRepository.findOne({ where: { id } });
  }

  async save(user: User) {
    return this.usersRepository.save(user);
  }

  async updateMfaSecret(userId: number, secret: string) {
    return this.usersRepository.update(userId, { mfaSecret: secret });
  }

  async updateMfaEnabled(userId: number, isEnabled: boolean) {
    return this.usersRepository.update(userId, { isMfaEnabled: isEnabled });
  }

  async disableMfa(userId: number) {
      return this.usersRepository.update(userId, { 
          isMfaEnabled: false, 
          mfaSecret: null, 
          backupCodes: null 
      });
  }

  async setRefreshToken(userId: number, refreshToken: string) {
      // We store the hash of the refresh token, not the token itself
      const salt = await bcrypt.genSalt();
      const hashedRefreshToken = await bcrypt.hash(refreshToken, salt);
      return this.usersRepository.update(userId, { hashedRefreshToken });
  }

  async updateBackupCodes(userId: number, backupCodes: string[]) {
      return this.usersRepository.update(userId, { backupCodes });
  }

  // 👆 END OF NEW FUNCTION 👆

  // Placeholders
  findAll() { return `This action returns all users`; }
  findOne(id: number) { return `This action returns a #${id} user`; }
  update(id: number, updateUserDto: any) { return `This action updates a #${id} user`; }
  remove(id: number) { return `This action removes a #${id} user`; }
}