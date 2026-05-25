import { useEffect } from "react";
import { useUI } from "../contexts/UIContext";
import { useDashboard } from "../contexts/DashboardContext";
import { useFolders } from "../contexts/FoldersContext";
import * as legacyState from "@features/state.ts";

/**
 * Dashboard view component
 * Renders the dashboard with widgets using the legacy dashboard system
 */
export function Dashboard() {
  const { currentView } = useUI();
  const { dashboardWidgets } = useDashboard();
  const { folders } = useFolders();

  useEffect(() => {
    let isCancelled = false;

    const syncAndRenderDashboard = async () => {
      if (currentView !== "dashboard") {
        const { unmountReactDashboard } =
          await import("@features/bookmarks/react-dashboard.tsx");
        if (!isCancelled) unmountReactDashboard();
        return;
      }

      // Backfill titles for widgets saved before the title field existed.
      // Resolved here (not in renderDashboard) so folders are available via React context.
      const enrichedWidgets = dashboardWidgets.map((widget) => {
        if (widget.title) return widget;

        const linkedId =
          (widget.config?.linkedId as string | undefined) ?? widget.id;

        if (widget.type === "folder") {
          const folder = folders.find((f) => f.id === linkedId);
          return folder?.name ? { ...widget, title: folder.name } : widget;
        }

        if (widget.type === "tag" && linkedId) {
          return { ...widget, title: linkedId };
        }

        if (widget.type === "tag-analytics") {
          return { ...widget, title: "Tag Analytics" };
        }

        return widget;
      });

      // Sync to legacy state WITHOUT emitting — the normal setter emits "dashboardWidgets",
      // which DashboardContext subscribes to and calls React setDashboardWidgets, causing
      // this useEffect to re-run infinitely. Silent setter breaks that feedback loop.
      legacyState.setDashboardWidgetsSilent(enrichedWidgets);

      const { renderDashboard } =
        await import("@features/bookmarks/dashboard.ts");
      if (!isCancelled) {
        await renderDashboard();
      }
    };

    void syncAndRenderDashboard();

    return () => {
      isCancelled = true;
    };
  }, [currentView, dashboardWidgets, folders]);

  return (
    <>
      <div id="main-view-outlet" className="dashboard-freeform"></div>
      <div
        className="dashboard-insights-section"
        style={{ marginTop: "2rem", padding: "1rem" }}
      ></div>
    </>
  );
}
