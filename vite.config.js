import { defineConfig } from "vite";
import { fileURLToPath, URL } from "url";
import { viteStaticCopy } from "vite-plugin-static-copy";
import react from "@vitejs/plugin-react-swc";
import mkcert from "vite-plugin-mkcert";
import Path from "path";

if(!process.env.ELV_ENV) {
  throw Error("Please specify ELV_ENV=<dv3|prod-dev> for merchant IDs");
}

export default defineConfig(() => {
  let plugins = [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: "configuration.js",
          dest: ""
        },
        {
          src: Path.join("src", "assets", "misc", "apple_domain_associations", process.env.ELV_ENV, "apple-developer-merchantid-domain-association.txt"),
          dest: Path.join(".well-known")
        }
      ]
    }),
    mkcert()
  ];

  return {
    devServer: {

    },
    css: {
      preprocessorOptions: {
        scss: {
          api: "modern-compiler"
        }
      }
    },
    plugins,
    server: {
      port: 8091,
      host: true
    },
    resolve: {
      // Synchronize with jsonconfig.json
      alias: {
        "@/assets": fileURLToPath(new URL("./src/assets", import.meta.url)),
        "@/components": fileURLToPath(new URL("./src/components", import.meta.url)),
        "@/stores": fileURLToPath(new URL("./src/stores", import.meta.url)),
        "@/utils": fileURLToPath(new URL("./src/utils", import.meta.url)),
        dashjs: "dashjs/dist/dash.all.min.js"
      }
    },
    build: {
      manifest: true
    }
  };
});
