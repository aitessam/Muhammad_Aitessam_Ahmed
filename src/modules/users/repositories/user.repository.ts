import type { EntityManager } from 'typeorm';
import { User } from '../domain/entities/user.entity';

export interface UserRepository {
  getOrCreateByAuth0Id(
    manager: EntityManager,
    auth0Id: string,
    email?: string
  ): Promise<User>;
}

export class UserRepositoryImpl implements UserRepository {
  async getOrCreateByAuth0Id(
    manager: EntityManager,
    auth0Id: string,
    email?: string
  ): Promise<User> {
    let user = await manager.findOne(User, {
      where: { auth0Id },
    });

    if (!user) {
      user = manager.create(User, {
        auth0Id,
        email: email ?? `${auth0Id.replace(/[^a-z0-9]/gi, '_')}@auth0.local`,
        role: 'user',
      });
      await manager.save(user);
    }

    return user;
  }
}
