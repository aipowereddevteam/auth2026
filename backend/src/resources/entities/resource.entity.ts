import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Resource {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  classification: string; // 'Public', 'Confidential'

  @Column()
  ownerGroupId: number; // ReBAC: Group that owns this resource
}
