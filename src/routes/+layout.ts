import { browser, dev } from "$app/env";
import { inject } from "@vercel/analytics";

if (browser) {
    inject(
        {
            basePath: import.meta.env.VITE_VERCEL_OBSERVABILITY_BASEPATH,
            framework: "sveltekit",
            mode: dev ? "development" : "production",
            beforeSend: (event) => {
                const url = new URL(event.url);
                return { ...event, url: url.origin + url.pathname };
            },
        },
        import.meta.env.VITE_VERCEL_OBSERVABILITY_CLIENT_CONFIG,
    );
}

export const ssr = false;
export const prerender = false;
export const trailingSlash = "never" as const;
