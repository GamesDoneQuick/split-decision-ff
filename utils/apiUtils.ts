import { Request, Response } from 'express';

type URLMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'OPTIONS';
type CallbackSet = Partial<Record<URLMethod, () => Promise<Response>>>;

export async function handleAPIRoute(req: Request, res: Response, callbacks: CallbackSet) {
  try {
    const handler = callbacks[req.method as URLMethod];

    if (handler) {
      await handler();
    } else {
      res.status(400).json({ message: 'Unsupported method.' });
    }
  } catch (error) {
    console.error(`Error on API route (${req.method} ${req.url})`);
    console.error(error);

    res.status(500).json({ message: 'An unexpected error occurred. Please try again later.' });
  }
}
