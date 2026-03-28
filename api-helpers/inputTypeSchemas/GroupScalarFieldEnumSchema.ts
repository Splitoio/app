import { z } from 'zod';

export const GroupScalarFieldEnumSchema = z.enum(['id','name','userId','description','image','color','createdAt','updatedAt','lockPrice']);

export default GroupScalarFieldEnumSchema;
