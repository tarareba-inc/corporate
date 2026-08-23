export { World } from "./world";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/events" || url.pathname === "/ws") {
      return env.WORLD.get(env.WORLD.idFromName("world")).fetch(request);
    }
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
