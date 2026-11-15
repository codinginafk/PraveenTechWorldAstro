import type { APIRoute } from "astro";
import { formatCategoryTerminalOutput, SERVICE_ALIASES } from "../../../data/degoogleMatrix";

export const prerender = true;

export async function getStaticPaths() {
  const keys = Object.keys(SERVICE_ALIASES);
  return keys.map((service) => ({
    params: { service },
  }));
}

export const GET: APIRoute = async ({ params }) => {
  const service = params.service || "all";
  const content = formatCategoryTerminalOutput(service);
  return new Response(content, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
};
