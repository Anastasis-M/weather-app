import type { RequestHandler } from './$types';

const header = (request: Request, name: string) => {
  const value = request.headers.get(name);
  if (!value) return '';
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export const GET: RequestHandler = ({ request }) => {
  const noStore = { 'cache-control': 'private, no-store' };
  const rawLatitude = header(request, 'x-vercel-ip-latitude');
  const rawLongitude = header(request, 'x-vercel-ip-longitude');
  const latitude = Number(rawLatitude);
  const longitude = Number(rawLongitude);

  const valid = rawLatitude !== '' && rawLongitude !== '' && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
  if (!valid) return new Response(null, { status: 204, headers: noStore });

  const city = header(request, 'x-vercel-ip-city');
  const country = header(request, 'x-vercel-ip-country');
  const timezone = header(request, 'x-vercel-ip-timezone');

  return Response.json(
    {
      name: [city, country].filter(Boolean).join(', '),
      shortName: city || country,
      latitude,
      longitude,
      ...(timezone && { timezone }),
    },
    { headers: noStore },
  );
};
