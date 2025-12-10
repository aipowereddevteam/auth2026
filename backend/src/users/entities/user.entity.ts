import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class User {
  // 1. ID: Auto-generated 1, 2, 3...
  @PrimaryGeneratedColumn()
  id: number;

  // 2. Email: Must be unique
  @Column({ unique: true })
  email: string;

  // 3. Password: We will store the encrypted password here
  @Column()
  password: string;

  // 4. Role: 'user' or 'admin'
  @Column({ default: 'user' })
  role: string;

  // 5. Created At: Auto timestamp
  @CreateDateColumn()
  createdAt: Date;

  // 6. Google ID: For OAuth
  @Column({ type: 'varchar', nullable: true })
  googleId: string | null;

  // 7. MFA Enabled Check
  @Column({ default: false })
  isMfaEnabled: boolean;

  // 8. MFA Secret: To verify 6-digit codes
  @Column({ type: 'varchar', nullable: true })
  mfaSecret: string | null;

  // 9. Refresh Token (Hashed for security)
  @Column({ type: 'varchar', nullable: true })
  hashedRefreshToken: string | null;

  // 10. Email Verification Status
  @Column({ default: false })
  isEmailVerified: boolean;

  // 11. Backup Codes (Stored as JSON array of hashed codes)
  @Column('simple-json', { nullable: true })
  backupCodes: string[] | null;
}