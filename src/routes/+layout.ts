import { dev } from "$app/environment";
import { injectAnalytics } from "@vercel/analytics/sveltekit";

injectAnalytics({
    mode: dev ? "development" : "production",
    beforeSend: (event) => {
        const url = new URL(event.url);
        return { ...event, url: url.origin + url.pathname };
    },
});

export const ssr = false;
export const prerender = false;
export const trailingSlash = "never" as const;
