import type { EventBus, AdapterRegistry } from "@core";
import type { SearchAdapter } from "@core";

export function registerSearchSyncHooks(bus: EventBus, adapters: AdapterRegistry) {
  const searchAdapter = adapters.has("search")
    ? adapters.get<SearchAdapter>("search")
    : null;

  if (!searchAdapter) {
    return;
  }

  bus.on("cat.item.published", async (e) => {
    await searchAdapter.sync("Product", e);
  });

  bus.on("cat.item.updated", async (e) => {
    await searchAdapter.sync("Product", e);
  });

  bus.on("cat.item.deleted", async (e) => {
    await searchAdapter.sync("Product", e);
  });

  bus.on("cat.item.archived", async (e) => {
    await searchAdapter.sync("Product", e);
  });
}
