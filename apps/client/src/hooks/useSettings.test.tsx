import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useSettings } from "./useSettings";

type MockFn = { mockClear: () => void };

const useSettingsMocks = vi.hoisted(() => ({
  apiSpy: vi.fn(),
  setThemeSpy: vi.fn(),
  loggerErrorSpy: vi.fn(),
  uiMocks: {
    setViewMode: vi.fn(),
    setHideFavicons: vi.fn(),
    setHideSidebar: vi.fn(),
    setAiSuggestionsEnabled: vi.fn(),
    setRichLinkPreviewsEnabled: vi.fn(),
    setIncludeChildBookmarks: vi.fn(),
    setSnapToGrid: vi.fn(),
    setTourCompleted: vi.fn(),
    setTagCloudMaxTags: vi.fn(),
    setTagCloudDefaultShowAll: vi.fn(),
    setCurrentView: vi.fn().mockResolvedValue(undefined),
  },
  dashboardMocks: {
    setDashboardConfig: vi.fn(),
    setDashboardWidgets: vi.fn(),
    setWidgetOrder: vi.fn(),
    setCollapsedSections: vi.fn(),
    setCurrentDashboardViewId: vi.fn(),
    setCurrentDashboardViewName: vi.fn(),
  },
  bookmarksMocks: {
    filterConfig: {
      sort: "newest",
      tags: [],
      tagMode: "OR",
      search: "",
    },
    setFilterConfig: vi.fn(),
    setDashboardWidgets: vi.fn(),
  },
}));

vi.mock("@/contexts/UIContext", () => ({
  useUI: () => useSettingsMocks.uiMocks,
}));

vi.mock("@/contexts/DashboardContext", () => ({
  useDashboard: () => useSettingsMocks.dashboardMocks,
}));

vi.mock("@/contexts/BookmarksContext", () => ({
  useBookmarks: () => useSettingsMocks.bookmarksMocks,
}));

vi.mock("@services/api.ts", () => ({
  api: useSettingsMocks.apiSpy,
}));

vi.mock("@features/bookmarks/settings.ts", () => ({
  setTheme: useSettingsMocks.setThemeSpy,
}));

vi.mock("@utils/index.ts", () => ({
  safeLocalStorage: {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
  },
}));

vi.mock("@utils/logger.ts", () => ({
  logger: {
    error: useSettingsMocks.loggerErrorSpy,
  },
}));

function TestHarness() {
  const { loadSettings } = useSettings();

  return <button onClick={() => void loadSettings()}>Load settings</button>;
}

describe("useSettings", () => {
  beforeEach(() => {
    useSettingsMocks.apiSpy.mockResolvedValue({
      view_mode: "grid",
      hide_favicons: false,
      hide_sidebar: false,
      ai_suggestions_enabled: true,
      rich_link_previews_enabled: false,
      include_child_bookmarks: 0,
      snap_to_grid: 0,
      tour_completed: false,
      dashboard_widgets: [],
      widget_order: {},
      collapsed_sections: [],
    });

    Object.values(useSettingsMocks.uiMocks).forEach((value) => {
      if (typeof value === "function" && "mockClear" in value) {
        (value as MockFn).mockClear();
      }
    });
    Object.values(useSettingsMocks.dashboardMocks).forEach((value) =>
      (value as MockFn).mockClear(),
    );
    useSettingsMocks.bookmarksMocks.setFilterConfig.mockClear();
    useSettingsMocks.bookmarksMocks.setDashboardWidgets.mockClear();
    useSettingsMocks.setThemeSpy.mockClear();
    useSettingsMocks.loggerErrorSpy.mockClear();
  });

  afterEach(() => {
    useSettingsMocks.apiSpy.mockReset();
  });

  it("hydrates snap-to-grid from persisted settings", async () => {
    render(<TestHarness />);

    fireEvent.click(screen.getByRole("button", { name: /Load settings/i }));

    await waitFor(() => {
      expect(useSettingsMocks.uiMocks.setSnapToGrid).toHaveBeenCalledWith(
        false,
      );
    });
  });
});