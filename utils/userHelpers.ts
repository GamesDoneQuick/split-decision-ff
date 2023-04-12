import { User } from '@prisma/client';

export function getUserName(user: User) {
  return user.displayName ?? user.name;
}
