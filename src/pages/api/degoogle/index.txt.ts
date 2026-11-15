import type { APIRoute } from "astro";
import { formatIndexTerminalOutput } from "../../../data/degoogleMatrix";

export const prerender = true;

export const GET: APIRoute = async () => {
  return new Response(formatIndexTerminalOutput(), {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
};
