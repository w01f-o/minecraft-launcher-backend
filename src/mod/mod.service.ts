import { Injectable } from '@nestjs/common';
import { ModrinthMod } from '../types/ModrinthMod.type';
import * as process from 'node:process';

@Injectable()
export class ModService {
  public constructor() {}

  private readonly modrinthApiUrl: string = 'https://api.modrinth.com/v2';

  public async searchOnModrinth(query: string): Promise<ModrinthMod> {
    const searchParams = new URLSearchParams({ query });

    const response = await fetch(
      `${this.modrinthApiUrl}/search?${searchParams}`,
      {
        headers: {
          Authorization: process.env.MODRINTH_API_KEY,
          'Content-Type': 'application/json',
          'User-Agent': process.env.MODRINTH_USER_AGENT,
        },
      },
    );

    return await response.json();
  }
}
