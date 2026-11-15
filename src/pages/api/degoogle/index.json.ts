import type { APIRoute } from "astro";
import { getCategoryJson } from "../../../data/degoogleMatrix";

export const prerender = true;

export const GET: APIRoute = async () => {
  return new Response(JSON.stringify(getCategoryJson("all"), null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
};
