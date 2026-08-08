import * as vscode from "vscode";
import { SidebarProvider } from "./providers/SidebarProvider";
import { AdapterManager } from "./adapters/AdapterManager";

let adapterManager: AdapterManager;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  console.log("[AI Context Inspector] Activating V2 extension...");

  adapterManager = new AdapterManager();

  const sidebarProvider = new SidebarProvider(
    context.extensionUri,
    adapterManager
  );

  const config = vscode.workspace.getConfiguration("aiContextInspector");
  const autoDetectionEnabled = config.get<boolean>("autoDetectionEnabled", true);
  const refreshIntervalMs = config.get<number>("refreshIntervalMs", 2000);

  if (autoDetectionEnabled) {
    await adapterManager.start(
      () => sidebarProvider.refreshData(),
      refreshIntervalMs
    );
  }

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      SidebarProvider.viewType,
      sidebarProvider,
      { webviewOptions: { retainContextWhenHidden: true } }
    )
  );

  console.log("[AI Context Inspector] Extension V2 activated successfully.");
}

export function deactivate(): void {
  console.log("[AI Context Inspector] Deactivating extension...");
  if (adapterManager) {
    adapterManager.stop();
  }
}
