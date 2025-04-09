import { NextApiRequest, NextApiResponse } from 'next';
import { scanAssets } from '@/utils/scanPublicAssets';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      const assets = await scanAssets();
      res.status(200).json(assets);
    } catch (error) {
      console.error('Error fetching assets:', error);
      res.status(500).json({ error: 'Failed to fetch assets' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 