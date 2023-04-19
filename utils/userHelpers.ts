import { User } from '@prisma/client';
import { PublicUserData } from './models';

export function getUserName(user: User) {
  return user.displayName ?? user.name;
}

export function pruneUserDataForPublicAccess(user: User): PublicUserData {
  return {
    id: user.id,
    name: user.id,
  };
}
