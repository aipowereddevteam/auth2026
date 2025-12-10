import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  userId: number; // Can be null for failed login attempts (unknown user)

  @Column()
  action: string; // 'LOGIN', 'LOGIN_FAIL', 'MFA_ENABLE', etc.

  @Column({ nullable: true })
  ip: string;

  @Column({ nullable: true })
  userAgent: string; // Browser/Device info

  @Column({ nullable: true })
  details: string; // JSON string or simple text

  @CreateDateColumn()
  timestamp: Date;
}
