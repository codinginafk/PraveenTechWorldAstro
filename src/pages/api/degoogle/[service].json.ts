import type { APIRoute } from "astro";
import { getCategoryJson, SERVICE_ALIASES } from "../../../data/degoogleMatrix";

export const prerender = true;

export async function getStaticPaths() {
  const keys = Object.keys(SERVICE_ALIASES);
  return keys.map((service) => ({
    params: { service },
  }));
}

export const GET: APIRoute = async ({ params }) => {
  const service = params.service || "all";
  const data = getCategoryJson(service);
  return new Response(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
};
